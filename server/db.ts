import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  customers,
  expenses,
  InsertUser,
  inventoryBalances,
  locations,
  onlineOrders,
  payments,
  productCategories,
  products,
  purchases,
  saleItems,
  sales,
  staffMembers,
  stockMovements,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildCheckoutLines, buildDashboardSeries, calculateStockAdjustment } from "./posCalculations";

let _db: ReturnType<typeof drizzle> | null = null;

/** Test-only seam for exercising the real POS data-layer orchestration without mutating the live database. */
export function setDbForTesting(db: ReturnType<typeof drizzle> | null) {
  _db = db;
}

type ProductValues = Omit<typeof products.$inferInsert, "id" | "ownerId" | "createdAt" | "updatedAt">;
type SaleValues = Omit<typeof sales.$inferInsert, "id" | "ownerId" | "locationId" | "createdAt" | "updatedAt" | "soldAt" | "subtotal" | "taxAmount">;
type PurchaseValues = Omit<typeof purchases.$inferInsert, "id" | "ownerId" | "locationId" | "createdAt" | "updatedAt" | "orderedAt">;
type ExpenseValues = Omit<typeof expenses.$inferInsert, "id" | "ownerId" | "locationId" | "createdAt" | "updatedAt" | "expenseDate">;
type StaffValues = Omit<typeof staffMembers.$inferInsert, "id" | "ownerId" | "locationId" | "createdAt" | "updatedAt">;
type OrderValues = Omit<typeof onlineOrders.$inferInsert, "id" | "ownerId" | "locationId" | "createdAt" | "updatedAt">;
type LocationValues = Omit<typeof locations.$inferInsert, "id" | "ownerId" | "createdAt" | "updatedAt">;
type CategoryValues = Omit<typeof productCategories.$inferInsert, "id" | "ownerId" | "createdAt" | "updatedAt">;
type PaymentValues = Omit<typeof payments.$inferInsert, "id" | "ownerId" | "locationId" | "createdAt" | "paidAt">;
type CustomerValues = Omit<typeof customers.$inferInsert, "id" | "ownerId" | "createdAt" | "updatedAt">;
type CheckoutValues = {
  receiptNumber: string;
  customerName: string;
  channel: "Retail" | "Online";
  paymentMethod: "Cash" | "Card" | "Bank transfer" | "Other";
  taxRate: number;
  locationId?: number;
  items: Array<{ productId: number; quantity: number }>;
};

function currency(value: number) {
  return value.toFixed(2);
}

function insertId(result: unknown) {
  const header = Array.isArray(result) ? result[0] : result;
  if (header && typeof header === "object" && "insertId" in header) {
    const value = (header as { insertId?: unknown }).insertId;
    if (typeof value === "number") return value;
  }
  throw new Error("The database did not return a generated identifier.");
}

async function resolveLocationId(tx: any, ownerId: number, requestedLocationId?: number) {
  if (requestedLocationId) {
    const location = await tx.select({ id: locations.id }).from(locations).where(and(eq(locations.id, requestedLocationId), eq(locations.ownerId, ownerId), eq(locations.isActive, true))).limit(1);
    if (!location[0]) throw new Error("The selected location is unavailable.");
    return location[0].id;
  }
  const existing = await tx.select({ id: locations.id }).from(locations).where(and(eq(locations.ownerId, ownerId), eq(locations.isActive, true))).orderBy(locations.id).limit(1);
  if (existing[0]) return existing[0].id;
  const result = await tx.insert(locations).values({ ownerId, name: "Main location", code: "MAIN", isActive: true });
  return insertId(result);
}

async function requireLocationId(ownerId: number, requestedLocationId?: number) {
  const db = await requireDb();
  return resolveLocationId(db, ownerId, requestedLocationId);
}

async function resolveCategoryId(tx: any, ownerId: number, name: string) {
  const existing = await tx.select({ id: productCategories.id }).from(productCategories).where(and(eq(productCategories.ownerId, ownerId), eq(productCategories.name, name))).limit(1);
  if (existing[0]) return existing[0].id;
  const result = await tx.insert(productCategories).values({ ownerId, name });
  return insertId(result);
}

function periodStart(period: "week" | "month" | "quarter") {
  const now = new Date();
  const start = new Date(now);
  if (period === "week") start.setDate(now.getDate() - 6);
  if (period === "month") start.setDate(now.getDate() - 29);
  if (period === "quarter") start.setDate(now.getDate() - 89);
  start.setHours(0, 0, 0, 0);
  return start;
}

function seriesKey(value: Date | string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-CA");
}

function dayLabel(key: string) {
  return new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

export async function getDb() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.warn("[Database] DATABASE_URL is not configured. Protected routes will fail until the database is available.");
    return null;
  }

  try {
    const pool = mysql.createPool({
      uri: connectionString,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 5,
      idleTimeout: 60000,
      queueLimit: 0,
    });
    _db = drizzle(pool);
    return _db;
  } catch (error) {
    console.warn("[Database] Failed to initialize the MySQL pool:", error);
    _db = null;
    return null;
  }
}

export async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("The TradeCore data store is not available.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    if (user[field] === undefined) return;
    values[field] = user[field] ?? null;
    updateSet[field] = user[field] ?? null;
  });
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export const posDb = {
  locations: {
    list: async (ownerId: number) => (await requireDb()).select().from(locations).where(eq(locations.ownerId, ownerId)).orderBy(desc(locations.updatedAt)),
    create: async (ownerId: number, values: LocationValues) => (await requireDb()).insert(locations).values({ ...values, ownerId }),
    update: async (ownerId: number, id: number, values: Partial<LocationValues>) => (await requireDb()).update(locations).set(values).where(and(eq(locations.id, id), eq(locations.ownerId, ownerId))),
    remove: async (ownerId: number, id: number) => (await requireDb()).delete(locations).where(and(eq(locations.id, id), eq(locations.ownerId, ownerId))),
  },
  categories: {
    list: async (ownerId: number) => (await requireDb()).select().from(productCategories).where(eq(productCategories.ownerId, ownerId)).orderBy(productCategories.name),
    create: async (ownerId: number, values: CategoryValues) => (await requireDb()).insert(productCategories).values({ ...values, ownerId }),
    remove: async (ownerId: number, id: number) => (await requireDb()).delete(productCategories).where(and(eq(productCategories.id, id), eq(productCategories.ownerId, ownerId))),
  },
  products: {
    list: async (ownerId: number) => (await requireDb()).select().from(products).where(eq(products.ownerId, ownerId)).orderBy(desc(products.updatedAt)),
    create: async (ownerId: number, values: ProductValues, requestedLocationId?: number) => {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const openingStock = values.stock ?? 0;
        const reorderLevel = values.reorderLevel ?? 15;
        const locationId = await resolveLocationId(tx, ownerId, requestedLocationId);
        const categoryId = await resolveCategoryId(tx, ownerId, values.category);
        const result = await tx.insert(products).values({ ...values, ownerId, categoryId, stock: openingStock, reorderLevel });
        const productId = insertId(result);
        await tx.insert(inventoryBalances).values({ ownerId, productId, locationId, quantity: openingStock, reorderLevel });
        if (openingStock > 0) {
          await tx.insert(stockMovements).values({ ownerId, productId, locationId, quantityDelta: openingStock, reason: "Initial", note: "Opening inventory" });
        }
        return { productId };
      });
    },
    update: async (ownerId: number, id: number, values: Partial<ProductValues>, requestedLocationId?: number) => {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const current = await tx.select().from(products).where(and(eq(products.id, id), eq(products.ownerId, ownerId))).limit(1);
        if (!current[0]) throw new Error("Product not found.");
        const { stock: requestedStock, category, categoryId: _ignoredCategoryId, ...rest } = values;
        const categoryId = category ? await resolveCategoryId(tx, ownerId, category) : current[0].categoryId;
        if (Object.keys(rest).length || category) {
          await tx.update(products).set({ ...rest, ...(category ? { category, categoryId } : {}) }).where(and(eq(products.id, id), eq(products.ownerId, ownerId)));
        }
        if (requestedStock !== undefined && requestedStock !== current[0].stock) {
          const locationId = await resolveLocationId(tx, ownerId, requestedLocationId);
          const balance = await tx.select().from(inventoryBalances).where(and(eq(inventoryBalances.ownerId, ownerId), eq(inventoryBalances.productId, id), eq(inventoryBalances.locationId, locationId))).limit(1);
          const quantityDelta = calculateStockAdjustment(current[0].stock, requestedStock);
          const locationQuantity = (balance[0]?.quantity ?? 0) + quantityDelta;
          if (locationQuantity < 0) throw new Error("The selected location cannot absorb that stock reduction.");
          if (balance[0]) {
            await tx.update(inventoryBalances).set({ quantity: locationQuantity, reorderLevel: values.reorderLevel ?? balance[0].reorderLevel }).where(eq(inventoryBalances.id, balance[0].id));
          } else {
            await tx.insert(inventoryBalances).values({ ownerId, productId: id, locationId, quantity: locationQuantity, reorderLevel: values.reorderLevel ?? current[0].reorderLevel });
          }
          await tx.update(products).set({ stock: requestedStock }).where(and(eq(products.id, id), eq(products.ownerId, ownerId)));
          await tx.insert(stockMovements).values({
            ownerId,
            productId: id,
            locationId,
            quantityDelta,
            reason: "Adjustment",
            note: "Stock updated from Product Manager",
          });
        }
        return { productId: id };
      });
    },
    remove: async (ownerId: number, id: number) => (await requireDb()).delete(products).where(and(eq(products.id, id), eq(products.ownerId, ownerId))),
  },
  inventory: {
    setOnHand: async (ownerId: number, productId: number, quantity: number, note?: string, requestedLocationId?: number) => {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const current = await tx.select().from(products).where(and(eq(products.id, productId), eq(products.ownerId, ownerId))).limit(1);
        if (!current[0]) throw new Error("Product not found.");
        const locationId = await resolveLocationId(tx, ownerId, requestedLocationId);
        const balance = await tx.select().from(inventoryBalances).where(and(eq(inventoryBalances.ownerId, ownerId), eq(inventoryBalances.productId, productId), eq(inventoryBalances.locationId, locationId))).limit(1);
        const previousQuantity = balance[0]?.quantity ?? 0;
        const quantityDelta = calculateStockAdjustment(previousQuantity, quantity);
        if (balance[0]) {
          await tx.update(inventoryBalances).set({ quantity }).where(eq(inventoryBalances.id, balance[0].id));
        } else {
          await tx.insert(inventoryBalances).values({ ownerId, productId, locationId, quantity, reorderLevel: current[0].reorderLevel });
        }
        await tx.update(products).set({ stock: current[0].stock + quantityDelta }).where(and(eq(products.id, productId), eq(products.ownerId, ownerId)));
        if (quantityDelta !== 0) {
          await tx.insert(stockMovements).values({ ownerId, productId, locationId, quantityDelta, reason: "Adjustment", note: note ?? "Manual stocktake adjustment" });
        }
        return { productId, locationId, quantity, quantityDelta };
      });
    },
    movements: async (ownerId: number, productId?: number, locationId?: number) => {
      const db = await requireDb();
      const predicates = [eq(stockMovements.ownerId, ownerId)];
      if (productId) predicates.push(eq(stockMovements.productId, productId));
      if (locationId) predicates.push(eq(stockMovements.locationId, locationId));
      return db.select().from(stockMovements).where(and(...predicates)).orderBy(desc(stockMovements.createdAt));
    },
    balances: async (ownerId: number, requestedLocationId?: number) => {
      const db = await requireDb();
      const location = await db.select({ id: locations.id }).from(locations).where(requestedLocationId ? and(eq(locations.ownerId, ownerId), eq(locations.id, requestedLocationId), eq(locations.isActive, true)) : and(eq(locations.ownerId, ownerId), eq(locations.isActive, true))).orderBy(locations.id).limit(1);
      if (!location[0]) return [];
      const locationId = location[0].id;
      return db.select({ productId: inventoryBalances.productId, locationId: inventoryBalances.locationId, quantity: inventoryBalances.quantity, reorderLevel: inventoryBalances.reorderLevel, productName: products.name, sku: products.sku, category: products.category, price: products.price }).from(inventoryBalances).innerJoin(products, eq(inventoryBalances.productId, products.id)).where(and(eq(inventoryBalances.ownerId, ownerId), eq(inventoryBalances.locationId, locationId))).orderBy(products.name);
    },
  },
  sales: {
    list: async (ownerId: number, locationId?: number) => (await requireDb()).select().from(sales).where(and(eq(sales.ownerId, ownerId), ...(locationId ? [eq(sales.locationId, locationId)] : []))).orderBy(desc(sales.soldAt)),
    create: async (ownerId: number, values: SaleValues, requestedLocationId?: number) => (await requireDb()).insert(sales).values({ ...values, ownerId, locationId: await requireLocationId(ownerId, requestedLocationId), subtotal: values.amount, taxAmount: "0.00" }),
    update: async (ownerId: number, id: number, values: Partial<SaleValues>, locationId?: number) => (await requireDb()).update(sales).set(values).where(and(eq(sales.id, id), eq(sales.ownerId, ownerId), ...(locationId ? [eq(sales.locationId, locationId)] : []))),
    remove: async (ownerId: number, id: number, locationId?: number) => (await requireDb()).delete(sales).where(and(eq(sales.id, id), eq(sales.ownerId, ownerId), ...(locationId ? [eq(sales.locationId, locationId)] : []))),
    checkout: async (ownerId: number, values: CheckoutValues) => {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const quantities = new Map<number, number>();
        values.items.forEach((item) => quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity));
        const productIds = Array.from(quantities.keys());
        const catalog = await tx.select().from(products).where(and(eq(products.ownerId, ownerId), inArray(products.id, productIds)));
        if (catalog.length !== productIds.length) throw new Error("One or more products are no longer available.");
        const locationId = await resolveLocationId(tx, ownerId, values.locationId);
        const balances = await tx.select().from(inventoryBalances).where(and(eq(inventoryBalances.ownerId, ownerId), eq(inventoryBalances.locationId, locationId), inArray(inventoryBalances.productId, productIds)));
        const balanceByProductId = new Map(balances.map((balance) => [balance.productId, balance]));

        const lines = buildCheckoutLines(catalog.map((product) => ({ ...product, availableQuantity: balanceByProductId.get(product.id)?.quantity ?? 0 })), values.items);
        const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
        const taxAmount = subtotal * values.taxRate;
        const amount = subtotal + taxAmount;
        const itemsJson = JSON.stringify(lines.map(({ product, quantity, unitPrice }) => ({ id: product.id, name: product.name, sku: product.sku, qty: quantity, price: currency(unitPrice) })));
        const result = await tx.insert(sales).values({
          ownerId,
          locationId,
          receiptNumber: values.receiptNumber,
          customerName: values.customerName,
          channel: values.channel,
          subtotal: currency(subtotal),
          taxAmount: currency(taxAmount),
          amount: currency(amount),
          status: "Paid",
          itemsJson,
        });
        const saleId = insertId(result);
        if (values.customerName !== "Walk-in customer") {
          const existingCustomer = await tx.select({ id: customers.id }).from(customers).where(and(eq(customers.ownerId, ownerId), eq(customers.name, values.customerName))).limit(1);
          if (!existingCustomer[0]) await tx.insert(customers).values({ ownerId, name: values.customerName });
        }
        await tx.insert(saleItems).values(lines.map(({ product, quantity, unitPrice, lineTotal }) => ({
          ownerId,
          saleId,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          category: product.category,
          quantity,
          unitPrice: currency(unitPrice),
          lineTotal: currency(lineTotal),
        })));
        await tx.insert(payments).values({ ownerId, locationId, saleId, direction: "Received", method: values.paymentMethod, amount: currency(amount), status: "Completed", reference: values.receiptNumber });
        await Promise.all(lines.map(async ({ product, quantity }) => {
          const balance = balanceByProductId.get(product.id)!;
          await tx.update(inventoryBalances).set({ quantity: balance.quantity - quantity }).where(eq(inventoryBalances.id, balance.id));
          await tx.update(products).set({ stock: product.stock - quantity }).where(and(eq(products.id, product.id), eq(products.ownerId, ownerId)));
          await tx.insert(stockMovements).values({ ownerId, productId: product.id, locationId, quantityDelta: -quantity, reason: "Sale", referenceType: "sale", referenceId: saleId, note: values.receiptNumber });
        }));
        return { id: saleId, receiptNumber: values.receiptNumber, subtotal: currency(subtotal), taxAmount: currency(taxAmount), amount: currency(amount) };
      });
    },
  },
  purchases: {
    list: async (ownerId: number, locationId?: number) => (await requireDb()).select().from(purchases).where(and(eq(purchases.ownerId, ownerId), ...(locationId ? [eq(purchases.locationId, locationId)] : []))).orderBy(desc(purchases.orderedAt)),
    create: async (ownerId: number, values: PurchaseValues, requestedLocationId?: number) => (await requireDb()).insert(purchases).values({ ...values, ownerId, locationId: await requireLocationId(ownerId, requestedLocationId) }),
    update: async (ownerId: number, id: number, values: Partial<PurchaseValues>, locationId?: number) => (await requireDb()).update(purchases).set(values).where(and(eq(purchases.id, id), eq(purchases.ownerId, ownerId), ...(locationId ? [eq(purchases.locationId, locationId)] : []))),
    remove: async (ownerId: number, id: number, locationId?: number) => (await requireDb()).delete(purchases).where(and(eq(purchases.id, id), eq(purchases.ownerId, ownerId), ...(locationId ? [eq(purchases.locationId, locationId)] : []))),
  },
  payments: {
    list: async (ownerId: number) => (await requireDb()).select().from(payments).where(eq(payments.ownerId, ownerId)).orderBy(desc(payments.paidAt)),
    create: async (ownerId: number, values: PaymentValues) => {
      const db = await requireDb();
      if (values.saleId) {
        const sale = await db.select({ id: sales.id }).from(sales).where(and(eq(sales.id, values.saleId), eq(sales.ownerId, ownerId))).limit(1);
        if (!sale[0]) throw new Error("The payment must be linked to a sale owned by this workspace.");
      }
      return db.insert(payments).values({ ...values, ownerId, locationId: await requireLocationId(ownerId) });
    },
    void: async (ownerId: number, id: number) => (await requireDb()).update(payments).set({ status: "Voided" }).where(and(eq(payments.id, id), eq(payments.ownerId, ownerId))),
  },
  expenses: {
    list: async (ownerId: number, locationId?: number) => (await requireDb()).select().from(expenses).where(and(eq(expenses.ownerId, ownerId), ...(locationId ? [eq(expenses.locationId, locationId)] : []))).orderBy(desc(expenses.expenseDate)),
    create: async (ownerId: number, values: ExpenseValues, requestedLocationId?: number) => (await requireDb()).insert(expenses).values({ ...values, ownerId, locationId: await requireLocationId(ownerId, requestedLocationId) }),
    update: async (ownerId: number, id: number, values: Partial<ExpenseValues>, locationId?: number) => (await requireDb()).update(expenses).set(values).where(and(eq(expenses.id, id), eq(expenses.ownerId, ownerId), ...(locationId ? [eq(expenses.locationId, locationId)] : []))),
    remove: async (ownerId: number, id: number, locationId?: number) => (await requireDb()).delete(expenses).where(and(eq(expenses.id, id), eq(expenses.ownerId, ownerId), ...(locationId ? [eq(expenses.locationId, locationId)] : []))),
  },
  staff: {
    list: async (ownerId: number, locationId?: number) => (await requireDb()).select().from(staffMembers).where(and(eq(staffMembers.ownerId, ownerId), ...(locationId ? [eq(staffMembers.locationId, locationId)] : []))).orderBy(desc(staffMembers.updatedAt)),
    create: async (ownerId: number, values: StaffValues, requestedLocationId?: number) => (await requireDb()).insert(staffMembers).values({ ...values, ownerId, locationId: await requireLocationId(ownerId, requestedLocationId) }),
    update: async (ownerId: number, id: number, values: Partial<StaffValues>, locationId?: number) => (await requireDb()).update(staffMembers).set(values).where(and(eq(staffMembers.id, id), eq(staffMembers.ownerId, ownerId), ...(locationId ? [eq(staffMembers.locationId, locationId)] : []))),
    remove: async (ownerId: number, id: number, locationId?: number) => (await requireDb()).delete(staffMembers).where(and(eq(staffMembers.id, id), eq(staffMembers.ownerId, ownerId), ...(locationId ? [eq(staffMembers.locationId, locationId)] : []))),
  },
  orders: {
    list: async (ownerId: number, locationId?: number) => (await requireDb()).select().from(onlineOrders).where(and(eq(onlineOrders.ownerId, ownerId), ...(locationId ? [eq(onlineOrders.locationId, locationId)] : []))).orderBy(desc(onlineOrders.updatedAt)),
    create: async (ownerId: number, values: OrderValues, requestedLocationId?: number) => (await requireDb()).insert(onlineOrders).values({ ...values, ownerId, locationId: await requireLocationId(ownerId, requestedLocationId) }),
    update: async (ownerId: number, id: number, values: Partial<OrderValues>, locationId?: number) => (await requireDb()).update(onlineOrders).set(values).where(and(eq(onlineOrders.id, id), eq(onlineOrders.ownerId, ownerId), ...(locationId ? [eq(onlineOrders.locationId, locationId)] : []))),
    remove: async (ownerId: number, id: number, locationId?: number) => (await requireDb()).delete(onlineOrders).where(and(eq(onlineOrders.id, id), eq(onlineOrders.ownerId, ownerId), ...(locationId ? [eq(onlineOrders.locationId, locationId)] : []))),
  },
  customers: {
    list: async (ownerId: number) => (await requireDb()).select().from(customers).where(eq(customers.ownerId, ownerId)).orderBy(desc(customers.updatedAt)),
    create: async (ownerId: number, values: CustomerValues) => (await requireDb()).insert(customers).values({ ...values, ownerId }),
    update: async (ownerId: number, id: number, values: Partial<CustomerValues>) => (await requireDb()).update(customers).set(values).where(and(eq(customers.id, id), eq(customers.ownerId, ownerId))),
    remove: async (ownerId: number, id: number) => (await requireDb()).delete(customers).where(and(eq(customers.id, id), eq(customers.ownerId, ownerId))),
  },
  dashboard: {
    summary: async (ownerId: number, period: "week" | "month" | "quarter", locationId?: number) => {
      const db = await requireDb();
      const start = periodStart(period);
      const [productRows, saleRows, purchaseRows, expenseRows, itemRows, paymentRows] = await Promise.all([
        db.select().from(products).where(eq(products.ownerId, ownerId)),
        db.select().from(sales).where(and(eq(sales.ownerId, ownerId), ...(locationId ? [eq(sales.locationId, locationId)] : []), gte(sales.soldAt, start))),
        db.select().from(purchases).where(and(eq(purchases.ownerId, ownerId), ...(locationId ? [eq(purchases.locationId, locationId)] : []), gte(purchases.orderedAt, start))),
        db.select().from(expenses).where(and(eq(expenses.ownerId, ownerId), ...(locationId ? [eq(expenses.locationId, locationId)] : []), gte(expenses.expenseDate, start))),
        db.select().from(saleItems).where(eq(saleItems.ownerId, ownerId)),
        db.select().from(payments).where(and(eq(payments.ownerId, ownerId), ...(locationId ? [eq(payments.locationId, locationId)] : []), gte(payments.paidAt, start))),
      ]);
      const paidSales = saleRows.filter((sale) => sale.status === "Paid");
      const totalSales = paidSales.reduce((sum, sale) => sum + Number(sale.amount), 0);
      const totalExpenses = expenseRows.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const completedPayments = paymentRows.filter((payment) => payment.status === "Completed");
      const paymentsSent = completedPayments.filter((payment) => payment.direction === "Sent").reduce((sum, payment) => sum + Number(payment.amount), 0);
      const paymentsReceived = completedPayments.filter((payment) => payment.direction === "Received").reduce((sum, payment) => sum + Number(payment.amount), 0);
      const stockValue = productRows.reduce((sum, product) => sum + Number(product.price) * product.stock, 0);
      const lowStock = productRows.filter((product) => product.stock <= product.reorderLevel).sort((a, b) => a.stock - b.stock).slice(0, 5);
      const customerTotals = new Map<string, { amount: number; sales: number }>();
      paidSales.forEach((sale) => {
        const current = customerTotals.get(sale.customerName) ?? { amount: 0, sales: 0 };
        customerTotals.set(sale.customerName, { amount: current.amount + Number(sale.amount), sales: current.sales + 1 });
      });
      const topCustomers = Array.from(customerTotals.entries()).map(([name, value]) => ({ name, ...value })).sort((a, b) => b.amount - a.amount).slice(0, 5);
      const categoryTotals = new Map<string, number>();
      itemRows.forEach((item) => categoryTotals.set(item.category, (categoryTotals.get(item.category) ?? 0) + item.quantity));
      const categoryMix = Array.from(categoryTotals.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
      const daily = buildDashboardSeries(
        paidSales.map((sale) => ({ date: sale.soldAt, amount: sale.amount })),
        purchaseRows.map((purchase) => ({ date: purchase.orderedAt, amount: purchase.amount })),
        completedPayments.map((payment) => ({ date: payment.paidAt, amount: payment.amount, direction: payment.direction })),
      ).map(({ date, ...values }) => ({ day: dayLabel(date), ...values }));
      return {
        metrics: { totalSales, totalExpenses, paymentsSent, paymentsReceived, totalItems: productRows.length, salesCount: paidSales.length, stockValue },
        salesSeries: daily.map(({ day, sales: salesTotal, purchases: purchaseTotal }) => ({ day, sales: salesTotal, purchases: purchaseTotal })),
        paymentSeries: daily.map(({ day, received, paid }) => ({ day, received, paid })),
        categoryMix,
        lowStock,
        topCustomers,
      };
    },
  },
};
