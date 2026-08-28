import { boolean, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Core identity table managed by Manus OAuth. All operational records are owner-scoped. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Shop locations let one owner operate multiple retail sites with distinct inventory. */
export const locations = mysqlTable("pos_locations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 32 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("pos_locations_owner_idx").on(table.ownerId),
  uniqueIndex("pos_locations_owner_code_unique").on(table.ownerId, table.code),
]);

export const productCategories = mysqlTable("pos_product_categories", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("pos_product_categories_owner_idx").on(table.ownerId),
  uniqueIndex("pos_product_categories_owner_name_unique").on(table.ownerId, table.name),
]);

export const products = mysqlTable("pos_products", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  sku: varchar("sku", { length: 64 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  categoryId: int("categoryId"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  stock: int("stock").notNull().default(0),
  reorderLevel: int("reorderLevel").notNull().default(15),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("pos_products_owner_idx").on(table.ownerId),
  uniqueIndex("pos_products_owner_sku_unique").on(table.ownerId, table.sku),
]);

export const inventoryBalances = mysqlTable("pos_inventory_balances", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  productId: int("productId").notNull(),
  locationId: int("locationId").notNull(),
  quantity: int("quantity").notNull().default(0),
  reorderLevel: int("reorderLevel").notNull().default(15),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("pos_inventory_balances_owner_product_location_unique").on(table.ownerId, table.productId, table.locationId),
  index("pos_inventory_balances_owner_location_idx").on(table.ownerId, table.locationId),
]);

export const customers = mysqlTable("pos_customers", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 40 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("pos_customers_owner_name_idx").on(table.ownerId, table.name)]);

export const sales = mysqlTable("pos_sales", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  locationId: int("locationId").notNull(),
  receiptNumber: varchar("receiptNumber", { length: 48 }).notNull(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  channel: mysqlEnum("channel", ["Retail", "Online"]).notNull().default("Retail"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0.00"),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["Pending", "Paid", "Refunded"]).notNull().default("Paid"),
  itemsJson: text("itemsJson"),
  soldAt: timestamp("soldAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("pos_sales_owner_sold_at_idx").on(table.ownerId, table.soldAt),
  uniqueIndex("pos_sales_owner_receipt_unique").on(table.ownerId, table.receiptNumber),
]);

export const saleItems = mysqlTable("pos_sale_items", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  saleId: int("saleId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 160 }).notNull(),
  sku: varchar("sku", { length: 64 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("pos_sale_items_owner_sale_idx").on(table.ownerId, table.saleId),
  index("pos_sale_items_owner_product_idx").on(table.ownerId, table.productId),
]);

export const payments = mysqlTable("pos_payments", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  locationId: int("locationId").notNull(),
  saleId: int("saleId"),
  direction: mysqlEnum("direction", ["Received", "Sent"]).notNull(),
  method: mysqlEnum("method", ["Cash", "Card", "Bank transfer", "Other"]).notNull().default("Card"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["Pending", "Completed", "Voided"]).notNull().default("Completed"),
  reference: varchar("reference", { length: 120 }),
  paidAt: timestamp("paidAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("pos_payments_owner_paid_at_idx").on(table.ownerId, table.paidAt)]);

export const stockMovements = mysqlTable("pos_stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  productId: int("productId").notNull(),
  locationId: int("locationId"),
  quantityDelta: int("quantityDelta").notNull(),
  reason: mysqlEnum("reason", ["Initial", "Adjustment", "Sale", "Return", "Purchase", "Transfer in", "Transfer out"]).notNull(),
  referenceType: varchar("referenceType", { length: 40 }),
  referenceId: int("referenceId"),
  note: varchar("note", { length: 280 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("pos_stock_movements_owner_product_created_idx").on(table.ownerId, table.productId, table.createdAt)]);

export const purchases = mysqlTable("pos_purchases", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  locationId: int("locationId").notNull(),
  purchaseNumber: varchar("purchaseNumber", { length: 48 }).notNull(),
  supplierName: varchar("supplierName", { length: 160 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  deliveryStatus: mysqlEnum("deliveryStatus", ["Receiving", "Delivered", "In transit"]).notNull().default("Receiving"),
  paymentStatus: mysqlEnum("paymentStatus", ["Open", "Paid"]).notNull().default("Open"),
  orderedAt: timestamp("orderedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("pos_purchases_owner_ordered_at_idx").on(table.ownerId, table.orderedAt),
  uniqueIndex("pos_purchases_owner_number_unique").on(table.ownerId, table.purchaseNumber),
]);

export const expenses = mysqlTable("pos_expenses", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  locationId: int("locationId").notNull(),
  description: varchar("description", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["Pending", "Approved"]).notNull().default("Pending"),
  expenseDate: timestamp("expenseDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("pos_expenses_owner_date_idx").on(table.ownerId, table.expenseDate)]);

export const staffMembers = mysqlTable("pos_staff_members", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  locationId: int("locationId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["Active", "Invited", "Inactive"]).notNull().default("Active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("pos_staff_members_owner_idx").on(table.ownerId)]);

export const onlineOrders = mysqlTable("pos_online_orders", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  locationId: int("locationId").notNull(),
  orderNumber: varchar("orderNumber", { length: 48 }).notNull(),
  buyerName: varchar("buyerName", { length: 160 }).notNull(),
  itemCount: int("itemCount").notNull().default(1),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  fulfilmentMethod: mysqlEnum("fulfilmentMethod", ["Delivery", "Pickup"]).notNull().default("Pickup"),
  status: mysqlEnum("status", ["New", "Ready", "Dispatched", "Cancelled"]).notNull().default("New"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("pos_online_orders_owner_updated_idx").on(table.ownerId, table.updatedAt),
  uniqueIndex("pos_online_orders_owner_number_unique").on(table.ownerId, table.orderNumber),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
