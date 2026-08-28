import { describe, expect, it } from "vitest";
import { buildCheckoutLines, buildDashboardSeries, calculateStockAdjustment } from "./posCalculations";

describe("POS calculation workflows", () => {
  it("builds validated checkout lines and preserves line totals", () => {
    const lines = buildCheckoutLines([{ id: 4, name: "Retail mug", sku: "TC-4", category: "Home", price: "12.50", availableQuantity: 3 }], [{ productId: 4, quantity: 2 }]);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ quantity: 2, unitPrice: 12.5, lineTotal: 25 });
  });

  it("rejects a checkout line when the selected location lacks stock", () => {
    expect(() => buildCheckoutLines([{ id: 4, name: "Retail mug", sku: "TC-4", category: "Home", price: "12.50", availableQuantity: 1 }], [{ productId: 4, quantity: 2 }])).toThrow("does not have enough stock");
  });

  it("calculates stock movement deltas from a location-specific on-hand count", () => {
    expect(calculateStockAdjustment(8, 13)).toBe(5);
    expect(calculateStockAdjustment(8, 3)).toBe(-5);
    expect(() => calculateStockAdjustment(8, -1)).toThrow("non-negative");
  });

  it("aggregates daily sales, purchases, and payment-ledger activity", () => {
    const series = buildDashboardSeries(
      [{ date: "2026-08-01T12:00:00.000Z", amount: "20.00" }],
      [{ date: "2026-08-01T13:00:00.000Z", amount: "5.00" }],
      [{ date: "2026-08-01T14:00:00.000Z", amount: "24.00", direction: "Received" }, { date: "2026-08-01T15:00:00.000Z", amount: "5.00", direction: "Sent" }],
    );

    expect(series).toEqual([{ date: "2026-08-01", sales: 20, purchases: 5, received: 24, paid: 5 }]);
  });
});
