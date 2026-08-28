import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const posDbMock = vi.hoisted(() => ({
  locations: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  categories: { list: vi.fn(), create: vi.fn(), remove: vi.fn() },
  products: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  inventory: { setOnHand: vi.fn(), movements: vi.fn() },
  sales: { list: vi.fn(), create: vi.fn(), checkout: vi.fn(), update: vi.fn(), remove: vi.fn() },
  purchases: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  expenses: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  staff: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  orders: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  payments: { list: vi.fn(), create: vi.fn(), void: vi.fn() },
  customers: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  dashboard: { summary: vi.fn() },
}));

vi.mock("./db", () => ({ posDb: posDbMock }));

import { appRouter } from "./routers";

function createAuthContext(cookie?: string, role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "tradecore-test-user",
      name: "TradeCore Test",
      email: "test@tradecore.example",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: cookie ? { cookie } : {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("TradeCore CRUD routers", () => {
  it("scopes product create, update, and delete operations to the authenticated owner", async () => {
    posDbMock.products.create.mockResolvedValue({});
    posDbMock.products.update.mockResolvedValue({});
    posDbMock.products.remove.mockResolvedValue({});
    const caller = appRouter.createCaller(createAuthContext());

    await caller.products.create({ name: "Retail mug", sku: "TC-900", category: "Lifestyle", price: 25.5, stock: 12, locationId: 2 });
    await caller.products.update({ id: 9, price: 27.25, stock: 8, locationId: 2 });
    await caller.products.remove({ id: 9 });

    expect(posDbMock.products.create).toHaveBeenCalledWith(42, expect.objectContaining({ name: "Retail mug", price: "25.50", stock: 12 }), 2);
    expect(posDbMock.products.update).toHaveBeenCalledWith(42, 9, expect.objectContaining({ price: "27.25", stock: 8 }), 2);
    expect(posDbMock.products.remove).toHaveBeenCalledWith(42, 9);
  });

  it("normalizes monetary values for every transactional record type", async () => {
    posDbMock.sales.create.mockResolvedValue({});
    posDbMock.purchases.create.mockResolvedValue({});
    posDbMock.expenses.create.mockResolvedValue({});
    posDbMock.staff.create.mockResolvedValue({});
    posDbMock.orders.create.mockResolvedValue({});
    const caller = appRouter.createCaller(createAuthContext());

    await caller.sales.create({ receiptNumber: "S-10", customerName: "Walk-in customer", channel: "Retail", amount: 17.5, status: "Paid", locationId: 2 });
    await caller.purchases.create({ purchaseNumber: "P-10", supplierName: "Supplier Ltd", amount: 40, deliveryStatus: "Receiving", paymentStatus: "Open", locationId: 2 });
    await caller.expenses.create({ description: "Utilities", category: "Operations", amount: 14.2, status: "Pending", locationId: 2 });
    await caller.staff.create({ name: "Alex Rivera", email: "alex@example.com", role: "Cashier", location: "Downtown", status: "Invited", locationId: 2 });
    await caller.orders.create({ orderNumber: "O-10", buyerName: "Jordan Kim", itemCount: 2, total: 31.75, fulfilmentMethod: "Pickup", status: "New", locationId: 2 });

    expect(posDbMock.sales.create).toHaveBeenCalledWith(42, expect.objectContaining({ amount: "17.50" }), 2);
    expect(posDbMock.purchases.create).toHaveBeenCalledWith(42, expect.objectContaining({ amount: "40.00" }), 2);
    expect(posDbMock.expenses.create).toHaveBeenCalledWith(42, expect.objectContaining({ amount: "14.20" }), 2);
    expect(posDbMock.staff.create).toHaveBeenCalledWith(42, expect.objectContaining({ email: "alex@example.com" }), 2);
    expect(posDbMock.orders.create).toHaveBeenCalledWith(42, expect.objectContaining({ total: "31.75" }), 2);
  });

  it("delegates checkout as one owner-scoped transactional workflow", async () => {
    posDbMock.sales.checkout.mockResolvedValue({ id: 19, amount: "45.00" });
    const caller = appRouter.createCaller(createAuthContext());

    await caller.sales.checkout({ receiptNumber: "S-100", customerName: "Walk-in customer", channel: "Retail", paymentMethod: "Card", taxRate: 0.2, items: [{ productId: 5, quantity: 2 }] });

    expect(posDbMock.sales.checkout).toHaveBeenCalledWith(42, expect.objectContaining({ receiptNumber: "S-100", items: [{ productId: 5, quantity: 2 }] }));
  });

  it("scopes location and inventory corrections to the authenticated owner", async () => {
    posDbMock.locations.create.mockResolvedValue({});
    posDbMock.inventory.setOnHand.mockResolvedValue({ productId: 8, quantity: 21, quantityDelta: 3 });
    const caller = appRouter.createCaller(createAuthContext(undefined, "admin"));

    await caller.locations.create({ name: "Downtown", code: "DT", isActive: true });
    await caller.inventory.setOnHand({ productId: 8, quantity: 21, note: "Cycle count" });

    expect(posDbMock.locations.create).toHaveBeenCalledWith(42, { name: "Downtown", code: "DT", isActive: true });
    expect(posDbMock.inventory.setOnHand).toHaveBeenCalledWith(42, 8, 21, "Cycle count", undefined);
  });

  it("blocks a non-admin user from creating a shop", async () => {
    const caller = appRouter.createCaller(createAuthContext());

    await expect(caller.locations.create({ name: "West End", code: "WEST", isActive: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(posDbMock.locations.create).not.toHaveBeenCalledWith(42, { name: "West End", code: "WEST", isActive: true });
  });

  it("returns dashboard data for the selected period under the authenticated owner", async () => {
    posDbMock.dashboard.summary.mockResolvedValue({ metrics: { totalSales: 0 } });
    const caller = appRouter.createCaller(createAuthContext());

    await caller.dashboard.summary({ period: "month", locationId: 2 });

    expect(posDbMock.dashboard.summary).toHaveBeenCalledWith(42, "month", 2);
  });

  it("inherits the browser's active shop for a delete action that omits a location parameter", async () => {
    posDbMock.sales.remove.mockResolvedValue({});
    const caller = appRouter.createCaller(createAuthContext("tradecore_active_location=2"));

    await caller.sales.remove({ id: 19 });

    expect(posDbMock.sales.remove).toHaveBeenCalledWith(42, 19, 2);
  });

  it("scopes payment ledger operations to the authenticated owner", async () => {
    posDbMock.payments.create.mockResolvedValue({});
    posDbMock.payments.void.mockResolvedValue({});
    const caller = appRouter.createCaller(createAuthContext());

    await caller.payments.create({ saleId: 7, direction: "Received", method: "Card", amount: 42.5, status: "Completed", reference: "S-7" });
    await caller.payments.void({ id: 12 });

    expect(posDbMock.payments.create).toHaveBeenCalledWith(42, expect.objectContaining({ saleId: 7, amount: "42.50", reference: "S-7" }));
    expect(posDbMock.payments.void).toHaveBeenCalledWith(42, 12);
  });

  it("scopes customer directory operations to the authenticated owner", async () => {
    posDbMock.customers.create.mockResolvedValue({});
    posDbMock.customers.update.mockResolvedValue({});
    posDbMock.customers.remove.mockResolvedValue({});
    const caller = appRouter.createCaller(createAuthContext());

    await caller.customers.create({ name: "Jordan Kim", email: "jordan@example.com", phone: "123456789" });
    await caller.customers.update({ id: 6, phone: "987654321" });
    await caller.customers.remove({ id: 6 });

    expect(posDbMock.customers.create).toHaveBeenCalledWith(42, expect.objectContaining({ name: "Jordan Kim" }));
    expect(posDbMock.customers.update).toHaveBeenCalledWith(42, 6, { phone: "987654321" });
    expect(posDbMock.customers.remove).toHaveBeenCalledWith(42, 6);
  });

  it("rejects checkout requests without a sellable line item", async () => {
    const caller = appRouter.createCaller(createAuthContext());

    await expect(caller.sales.checkout({ receiptNumber: "S-101", customerName: "Walk-in customer", channel: "Retail", paymentMethod: "Card", taxRate: 0.2, items: [] })).rejects.toThrow();
  });
});
