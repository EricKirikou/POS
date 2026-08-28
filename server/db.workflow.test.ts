import { afterEach, describe, expect, it } from "vitest";
import { inventoryBalances, payments, products, saleItems, sales, stockMovements } from "../drizzle/schema";
import { posDb, setDbForTesting } from "./db";

type Operation = { kind: "insert" | "update"; table: unknown; values: unknown };

function makeWorkflowDatabase(selectRows: unknown[][]) {
  const operations: Operation[] = [];
  const from = () => {
    const rows = selectRows.shift() ?? [];
    const result = Promise.resolve(rows);
    return {
      where: () => Object.assign(result, { limit: async () => rows, orderBy: () => result }),
      orderBy: () => result,
    };
  };
  const transactionClient = {
    select: () => ({ from }),
    insert: (table: unknown) => ({ values: async (values: unknown) => { operations.push({ kind: "insert", table, values }); return [{ insertId: 101 }]; } }),
    update: (table: unknown) => ({ set: (values: unknown) => ({ where: async () => { operations.push({ kind: "update", table, values }); return [{ affectedRows: 1 }]; } }) }),
  };
  const db = { ...transactionClient, transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) => callback(transactionClient) };
  return { db, operations };
}

afterEach(() => setDbForTesting(null));

describe("POS data-layer workflows", () => {
  it("persists every completed-checkout side effect through one transaction", async () => {
    const product = { id: 5, ownerId: 42, name: "Retail mug", sku: "TC-5", category: "Home", categoryId: 3, price: "12.50", stock: 8, reorderLevel: 4 };
    const balance = { id: 9, ownerId: 42, productId: 5, locationId: 2, quantity: 8, reorderLevel: 4 };
    const { db, operations } = makeWorkflowDatabase([[product], [{ id: 2 }], [balance]]);
    setDbForTesting(db as never);

    const result = await posDb.sales.checkout(42, { receiptNumber: "S-101", customerName: "Walk-in customer", channel: "Retail", paymentMethod: "Card", taxRate: 0.2, locationId: 2, items: [{ productId: 5, quantity: 2 }] });

    expect(result).toMatchObject({ id: 101, receiptNumber: "S-101", subtotal: "25.00", taxAmount: "5.00", amount: "30.00" });
    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "insert", table: sales, values: expect.objectContaining({ amount: "30.00", status: "Paid", locationId: 2 }) }),
      expect.objectContaining({ kind: "insert", table: saleItems, values: [expect.objectContaining({ saleId: 101, productId: 5, quantity: 2, lineTotal: "25.00" })] }),
      expect.objectContaining({ kind: "insert", table: payments, values: expect.objectContaining({ saleId: 101, locationId: 2, direction: "Received", amount: "30.00", reference: "S-101" }) }),
      expect.objectContaining({ kind: "update", table: inventoryBalances, values: { quantity: 6 } }),
      expect.objectContaining({ kind: "update", table: products, values: { stock: 6 } }),
      expect.objectContaining({ kind: "insert", table: stockMovements, values: expect.objectContaining({ productId: 5, locationId: 2, quantityDelta: -2, reason: "Sale", referenceId: 101 }) }),
    ]));
  });

  it("persists a location-specific stock adjustment and matching movement", async () => {
    const product = { id: 5, ownerId: 42, stock: 11, reorderLevel: 4 };
    const balance = { id: 9, ownerId: 42, productId: 5, locationId: 2, quantity: 7, reorderLevel: 4 };
    const { db, operations } = makeWorkflowDatabase([[product], [{ id: 2 }], [balance]]);
    setDbForTesting(db as never);

    const result = await posDb.inventory.setOnHand(42, 5, 10, "Cycle count", 2);

    expect(result).toEqual({ productId: 5, locationId: 2, quantity: 10, quantityDelta: 3 });
    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "update", table: inventoryBalances, values: { quantity: 10 } }),
      expect.objectContaining({ kind: "update", table: products, values: { stock: 14 } }),
      expect.objectContaining({ kind: "insert", table: stockMovements, values: expect.objectContaining({ productId: 5, locationId: 2, quantityDelta: 3, reason: "Adjustment", note: "Cycle count" }) }),
    ]));
  });
});
