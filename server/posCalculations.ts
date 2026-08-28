export type CheckoutCatalogItem = {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: string | number;
  availableQuantity: number;
};

export type CheckoutRequestItem = { productId: number; quantity: number };

export function calculateStockAdjustment(previousQuantity: number, targetQuantity: number) {
  if (!Number.isInteger(previousQuantity) || !Number.isInteger(targetQuantity) || targetQuantity < 0) {
    throw new Error("Stock quantities must be non-negative whole numbers.");
  }
  return targetQuantity - previousQuantity;
}

export function buildCheckoutLines<T extends CheckoutCatalogItem>(catalog: T[], requestedItems: CheckoutRequestItem[]) {
  const quantities = new Map<number, number>();
  requestedItems.forEach((item) => {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error("Checkout quantities must be positive whole numbers.");
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  });
  if (!quantities.size) throw new Error("At least one item is required to complete a sale.");

  const catalogById = new Map(catalog.map((product) => [product.id, product]));
  return Array.from(quantities.entries()).map(([productId, quantity]) => {
    const product = catalogById.get(productId);
    if (!product) throw new Error("One or more products are no longer available.");
    if (product.availableQuantity < quantity) throw new Error(`${product.name} does not have enough stock at this location.`);
    const unitPrice = Number(product.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`${product.name} has an invalid price.`);
    return { product, quantity, unitPrice, lineTotal: unitPrice * quantity };
  });
}

type AmountRecord = { date: Date | string; amount: string | number };
type PaymentRecord = AmountRecord & { direction: "Received" | "Sent" };

function seriesKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function buildDashboardSeries(sales: AmountRecord[], purchases: AmountRecord[], payments: PaymentRecord[]) {
  const byDate = new Map<string, { sales: number; purchases: number; received: number; paid: number }>();
  const add = (date: Date | string, field: "sales" | "purchases" | "received" | "paid", amount: string | number) => {
    const key = seriesKey(date);
    const values = byDate.get(key) ?? { sales: 0, purchases: 0, received: 0, paid: 0 };
    values[field] += Number(amount);
    byDate.set(key, values);
  };
  sales.forEach((sale) => add(sale.date, "sales", sale.amount));
  purchases.forEach((purchase) => add(purchase.date, "purchases", purchase.amount));
  payments.forEach((payment) => add(payment.date, payment.direction === "Received" ? "received" : "paid", payment.amount));
  return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, ...values }));
}
