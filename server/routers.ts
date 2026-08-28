import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { posDb, upsertUser } from "./db";
import { sdk } from "./_core/sdk";
import { assertAdminLoginAllowed, clearAdminLoginFailures, isSuperAdminConfigured, recordAdminLoginFailure, SUPER_ADMIN_OPEN_ID, SUPER_ADMIN_SESSION_MS, verifySuperAdminCredentials } from "./superAdminAuth";

const idInput = z.object({ id: z.number().int().positive(), locationId: z.number().int().positive().optional() });
const locationFilterInput = z.object({ locationId: z.number().int().positive() }).optional();
const locationCreateSchema = z.object({ name: z.string().trim().min(1).max(100), code: z.string().trim().min(1).max(32), isActive: z.boolean().default(true) });
const locationUpdateSchema = locationCreateSchema.partial().extend({ id: z.number().int().positive() });
const categoryCreateSchema = z.object({ name: z.string().trim().min(1).max(80) });
const customerCreateSchema = z.object({ name: z.string().trim().min(1).max(160), email: z.string().trim().email().max(320).optional(), phone: z.string().trim().min(3).max(40).optional() });
const customerUpdateSchema = customerCreateSchema.partial().extend({ id: z.number().int().positive() });
const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().min(1).max(64),
  category: z.string().trim().min(1).max(80),
  price: z.coerce.number().finite().nonnegative(),
  stock: z.coerce.number().int().nonnegative(),
  reorderLevel: z.coerce.number().int().nonnegative().optional(),
  locationId: z.number().int().positive().optional(),
});
const productUpdateSchema = productCreateSchema.partial().extend({ id: z.number().int().positive() });
const saleCreateSchema = z.object({ receiptNumber: z.string().trim().min(1).max(48), customerName: z.string().trim().min(1).max(160), channel: z.enum(["Retail", "Online"]), amount: z.coerce.number().finite().nonnegative(), status: z.enum(["Pending", "Paid", "Refunded"]), itemsJson: z.string().max(5000).optional(), locationId: z.number().int().positive().optional() });
const saleUpdateSchema = saleCreateSchema.partial().extend({ id: z.number().int().positive() });
const checkoutSchema = z.object({
  receiptNumber: z.string().trim().min(1).max(48),
  customerName: z.string().trim().min(1).max(160).default("Walk-in customer"),
  channel: z.enum(["Retail", "Online"]).default("Retail"),
  paymentMethod: z.enum(["Cash", "Card", "Bank transfer", "Other"]).default("Card"),
  taxRate: z.coerce.number().finite().min(0).max(0.5).default(0.2),
  locationId: z.number().int().positive().optional(),
  items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive() })).min(1).max(100),
});
const stockAdjustmentSchema = z.object({ productId: z.number().int().positive(), locationId: z.number().int().positive().optional(), quantity: z.coerce.number().int().nonnegative(), note: z.string().trim().max(280).optional() });
const purchaseCreateSchema = z.object({ purchaseNumber: z.string().trim().min(1).max(48), supplierName: z.string().trim().min(1).max(160), amount: z.coerce.number().finite().nonnegative(), deliveryStatus: z.enum(["Receiving", "Delivered", "In transit"]), paymentStatus: z.enum(["Open", "Paid"]), locationId: z.number().int().positive().optional() });
const purchaseUpdateSchema = purchaseCreateSchema.partial().extend({ id: z.number().int().positive() });
const expenseCreateSchema = z.object({ description: z.string().trim().min(1).max(180), category: z.string().trim().min(1).max(80), amount: z.coerce.number().finite().nonnegative(), status: z.enum(["Pending", "Approved"]), locationId: z.number().int().positive().optional() });
const expenseUpdateSchema = expenseCreateSchema.partial().extend({ id: z.number().int().positive() });
const staffCreateSchema = z.object({ name: z.string().trim().min(1).max(160), email: z.string().trim().email().max(320), role: z.string().trim().min(1).max(100), location: z.string().trim().min(1).max(100), status: z.enum(["Active", "Invited", "Inactive"]), locationId: z.number().int().positive().optional() });
const staffUpdateSchema = staffCreateSchema.partial().extend({ id: z.number().int().positive() });
const orderCreateSchema = z.object({ orderNumber: z.string().trim().min(1).max(48), buyerName: z.string().trim().min(1).max(160), itemCount: z.coerce.number().int().positive(), total: z.coerce.number().finite().nonnegative(), fulfilmentMethod: z.enum(["Delivery", "Pickup"]), status: z.enum(["New", "Ready", "Dispatched", "Cancelled"]), locationId: z.number().int().positive().optional() });
const orderUpdateSchema = orderCreateSchema.partial().extend({ id: z.number().int().positive() });
const paymentCreateSchema = z.object({ saleId: z.number().int().positive().optional(), direction: z.enum(["Received", "Sent"]), method: z.enum(["Cash", "Card", "Bank transfer", "Other"]), amount: z.coerce.number().finite().positive(), status: z.enum(["Pending", "Completed", "Voided"]).default("Completed"), reference: z.string().trim().max(120).optional() });
const dashboardInput = z.object({ period: z.enum(["week", "month", "quarter"]).default("week"), locationId: z.number().int().positive().optional() }).default({ period: "week" });
const superAdminLoginSchema = z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(512) });

function databaseError(error: unknown): never {
  console.error("[TradeCore POS] data operation failed", error);
  if (error instanceof TRPCError) throw error;
  const message = error instanceof Error ? error.message : "TradeCore could not complete that data operation. Please try again.";
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

const money = (value: number) => value.toFixed(2);

function activeLocationFromRequest(ctx: { req: { headers?: { cookie?: string } } }) {
  const match = ctx.req.headers?.cookie?.match(/(?:^|;\s*)tradecore_active_location=(\d+)(?:;|$)/);
  const value = match?.[1] ? Number(match[1]) : undefined;
  return value && Number.isInteger(value) && value > 0 ? value : undefined;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    superAdminLogin: publicProcedure.input(superAdminLoginSchema).mutation(async ({ ctx, input }) => {
      if (!isSuperAdminConfigured()) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Super-admin credentials are not configured." });
      const attemptKey = ctx.req.ip ?? ctx.req.socket.remoteAddress ?? "unknown";
      try {
        assertAdminLoginAllowed(attemptKey);
      } catch (error) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: error instanceof Error ? error.message : "Too many failed login attempts." });
      }
      if (!verifySuperAdminCredentials(input.email, input.password)) {
        recordAdminLoginFailure(attemptKey);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }
      clearAdminLoginFailures(attemptKey);
      await upsertUser({ openId: SUPER_ADMIN_OPEN_ID, name: "Super Admin", email: input.email.trim().toLowerCase(), loginMethod: "credential", role: "admin", lastSignedIn: new Date() });
      const token = await sdk.createSessionToken(SUPER_ADMIN_OPEN_ID, { name: "Super Admin", expiresInMs: SUPER_ADMIN_SESSION_MS });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: SUPER_ADMIN_SESSION_MS });
      return { success: true, role: "admin" as const, expiresInMs: SUPER_ADMIN_SESSION_MS, sessionToken: token };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    summary: protectedProcedure.input(dashboardInput).query(({ ctx, input }) => posDb.dashboard.summary(ctx.user.id, input.period, input.locationId).catch(databaseError)),
  }),
  locations: router({
    list: protectedProcedure.query(({ ctx }) => posDb.locations.list(ctx.user.id).catch(databaseError)),
    create: adminProcedure.input(locationCreateSchema).mutation(({ ctx, input }) => posDb.locations.create(ctx.user.id, input).catch(databaseError)),
    update: adminProcedure.input(locationUpdateSchema).mutation(({ ctx, input }) => {
      const { id, ...rest } = input;
      return posDb.locations.update(ctx.user.id, id, rest).catch(databaseError);
    }),
    remove: adminProcedure.input(idInput).mutation(({ ctx, input }) => posDb.locations.remove(ctx.user.id, input.id).catch(databaseError)),
  }),
  categories: router({
    list: protectedProcedure.query(({ ctx }) => posDb.categories.list(ctx.user.id).catch(databaseError)),
    create: protectedProcedure.input(categoryCreateSchema).mutation(({ ctx, input }) => posDb.categories.create(ctx.user.id, input).catch(databaseError)),
    remove: protectedProcedure.input(idInput).mutation(({ ctx, input }) => posDb.categories.remove(ctx.user.id, input.id).catch(databaseError)),
  }),
  products: router({
    list: protectedProcedure.query(({ ctx }) => posDb.products.list(ctx.user.id).catch(databaseError)),
    create: protectedProcedure.input(productCreateSchema).mutation(({ ctx, input }) => { const { locationId, ...values } = input; return posDb.products.create(ctx.user.id, { ...values, price: money(values.price), reorderLevel: values.reorderLevel ?? 15 }, locationId).catch(databaseError); }),
    update: protectedProcedure.input(productUpdateSchema).mutation(({ ctx, input }) => {
      const { id, price, locationId, ...rest } = input;
      return posDb.products.update(ctx.user.id, id, { ...rest, ...(price === undefined ? {} : { price: money(price) }) }, locationId).catch(databaseError);
    }),
    remove: protectedProcedure.input(idInput).mutation(({ ctx, input }) => posDb.products.remove(ctx.user.id, input.id).catch(databaseError)),
  }),
  inventory: router({
    setOnHand: protectedProcedure.input(stockAdjustmentSchema).mutation(({ ctx, input }) => posDb.inventory.setOnHand(ctx.user.id, input.productId, input.quantity, input.note, input.locationId).catch(databaseError)),
    movements: protectedProcedure.input(z.object({ productId: z.number().int().positive().optional(), locationId: z.number().int().positive().optional() }).optional()).query(({ ctx, input }) => posDb.inventory.movements(ctx.user.id, input?.productId, input?.locationId).catch(databaseError)),
    balances: protectedProcedure.input(z.object({ locationId: z.number().int().positive().optional() }).optional()).query(({ ctx, input }) => posDb.inventory.balances(ctx.user.id, input?.locationId).catch(databaseError)),
  }),
  sales: router({
    list: protectedProcedure.input(locationFilterInput).query(({ ctx, input }) => posDb.sales.list(ctx.user.id, input?.locationId).catch(databaseError)),
    create: protectedProcedure.input(saleCreateSchema).mutation(({ ctx, input }) => { const { locationId, ...values } = input; return posDb.sales.create(ctx.user.id, { ...values, amount: money(values.amount) }, locationId).catch(databaseError); }),
    checkout: protectedProcedure.input(checkoutSchema).mutation(({ ctx, input }) => posDb.sales.checkout(ctx.user.id, input).catch(databaseError)),
    update: protectedProcedure.input(saleUpdateSchema).mutation(({ ctx, input }) => {
      const { id, amount, locationId, ...rest } = input;
      return posDb.sales.update(ctx.user.id, id, { ...rest, ...(amount === undefined ? {} : { amount: money(amount) }) }, locationId).catch(databaseError);
    }),
    remove: protectedProcedure.input(idInput).mutation(({ ctx, input }) => posDb.sales.remove(ctx.user.id, input.id, input.locationId ?? activeLocationFromRequest(ctx)).catch(databaseError)),
  }),
  purchases: router({
    list: protectedProcedure.input(locationFilterInput).query(({ ctx, input }) => posDb.purchases.list(ctx.user.id, input?.locationId).catch(databaseError)),
    create: protectedProcedure.input(purchaseCreateSchema).mutation(({ ctx, input }) => { const { locationId, ...values } = input; return posDb.purchases.create(ctx.user.id, { ...values, amount: money(values.amount) }, locationId).catch(databaseError); }),
    update: protectedProcedure.input(purchaseUpdateSchema).mutation(({ ctx, input }) => {
      const { id, amount, locationId, ...rest } = input;
      return posDb.purchases.update(ctx.user.id, id, { ...rest, ...(amount === undefined ? {} : { amount: money(amount) }) }, locationId).catch(databaseError);
    }),
    remove: protectedProcedure.input(idInput).mutation(({ ctx, input }) => posDb.purchases.remove(ctx.user.id, input.id, input.locationId ?? activeLocationFromRequest(ctx)).catch(databaseError)),
  }),
  payments: router({
    list: protectedProcedure.query(({ ctx }) => posDb.payments.list(ctx.user.id).catch(databaseError)),
    create: protectedProcedure.input(paymentCreateSchema).mutation(({ ctx, input }) => posDb.payments.create(ctx.user.id, { ...input, amount: money(input.amount) }).catch(databaseError)),
    void: protectedProcedure.input(idInput).mutation(({ ctx, input }) => posDb.payments.void(ctx.user.id, input.id).catch(databaseError)),
  }),
  expenses: router({
    list: protectedProcedure.input(locationFilterInput).query(({ ctx, input }) => posDb.expenses.list(ctx.user.id, input?.locationId).catch(databaseError)),
    create: protectedProcedure.input(expenseCreateSchema).mutation(({ ctx, input }) => { const { locationId, ...values } = input; return posDb.expenses.create(ctx.user.id, { ...values, amount: money(values.amount) }, locationId).catch(databaseError); }),
    update: protectedProcedure.input(expenseUpdateSchema).mutation(({ ctx, input }) => {
      const { id, amount, locationId, ...rest } = input;
      return posDb.expenses.update(ctx.user.id, id, { ...rest, ...(amount === undefined ? {} : { amount: money(amount) }) }, locationId).catch(databaseError);
    }),
    remove: protectedProcedure.input(idInput).mutation(({ ctx, input }) => posDb.expenses.remove(ctx.user.id, input.id, input.locationId ?? activeLocationFromRequest(ctx)).catch(databaseError)),
  }),
  staff: router({
    list: protectedProcedure.input(locationFilterInput).query(({ ctx, input }) => posDb.staff.list(ctx.user.id, input?.locationId).catch(databaseError)),
    create: protectedProcedure.input(staffCreateSchema).mutation(({ ctx, input }) => { const { locationId, ...values } = input; return posDb.staff.create(ctx.user.id, values, locationId).catch(databaseError); }),
    update: protectedProcedure.input(staffUpdateSchema).mutation(({ ctx, input }) => {
      const { id, locationId, ...rest } = input;
      return posDb.staff.update(ctx.user.id, id, rest, locationId).catch(databaseError);
    }),
    remove: protectedProcedure.input(idInput).mutation(({ ctx, input }) => posDb.staff.remove(ctx.user.id, input.id, input.locationId ?? activeLocationFromRequest(ctx)).catch(databaseError)),
  }),
  orders: router({
    list: protectedProcedure.input(locationFilterInput).query(({ ctx, input }) => posDb.orders.list(ctx.user.id, input?.locationId).catch(databaseError)),
    create: protectedProcedure.input(orderCreateSchema).mutation(({ ctx, input }) => { const { locationId, ...values } = input; return posDb.orders.create(ctx.user.id, { ...values, total: money(values.total) }, locationId).catch(databaseError); }),
    update: protectedProcedure.input(orderUpdateSchema).mutation(({ ctx, input }) => {
      const { id, total, locationId, ...rest } = input;
      return posDb.orders.update(ctx.user.id, id, { ...rest, ...(total === undefined ? {} : { total: money(total) }) }, locationId).catch(databaseError);
    }),
    remove: protectedProcedure.input(idInput).mutation(({ ctx, input }) => posDb.orders.remove(ctx.user.id, input.id, input.locationId ?? activeLocationFromRequest(ctx)).catch(databaseError)),
  }),
  customers: router({
    list: protectedProcedure.query(({ ctx }) => posDb.customers.list(ctx.user.id).catch(databaseError)),
    create: protectedProcedure.input(customerCreateSchema).mutation(({ ctx, input }) => posDb.customers.create(ctx.user.id, input).catch(databaseError)),
    update: protectedProcedure.input(customerUpdateSchema).mutation(({ ctx, input }) => { const { id, ...rest } = input; return posDb.customers.update(ctx.user.id, id, rest).catch(databaseError); }),
    remove: protectedProcedure.input(idInput).mutation(({ ctx, input }) => posDb.customers.remove(ctx.user.id, input.id).catch(databaseError)),
  }),
});

export type AppRouter = typeof appRouter;
export const posValidation = { locationCreateSchema, categoryCreateSchema, customerCreateSchema, productCreateSchema, saleCreateSchema, checkoutSchema, stockAdjustmentSchema, purchaseCreateSchema, paymentCreateSchema, expenseCreateSchema, staffCreateSchema, orderCreateSchema, superAdminLoginSchema };
