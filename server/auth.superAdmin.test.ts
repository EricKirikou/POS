import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { setDbForTesting } from "./db";
import { resetAdminLoginRateLimitsForTesting } from "./superAdminAuth";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { getSessionCookieOptions } from "./_core/cookies";

function createTestDb() {
  return {
    insert: () => ({ values: () => ({ onDuplicateKeyUpdate: async () => [{ affectedRows: 1 }] }) }),
  };
}

function createContext() {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" }, headers: {} } as TrpcContext["req"],
    res: { cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }), clearCookie: (name: string, options: Record<string, unknown>) => clearedCookies.push({ name, options }) } as TrpcContext["res"],
  };
  return { ctx, cookies, clearedCookies };
}

afterEach(() => { setDbForTesting(null); resetAdminLoginRateLimitsForTesting(); });

describe("auth.superAdminLogin", () => {
  it("falls back to a non-empty session secret when JWT_SECRET is missing", async () => {
    vi.resetModules();
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("VITE_APP_ID", "");

    const { ENV } = await import("./_core/env");

    expect(ENV.cookieSecret.length).toBeGreaterThan(0);
    expect(ENV.appId.length).toBeGreaterThan(0);

    vi.unstubAllEnvs();
  });

  it("uses a secure cross-site cookie in production even when proxy headers are missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = { protocol: "http", headers: {} } as never;

    expect(getSessionCookieOptions(req)).toMatchObject({ httpOnly: true, sameSite: "none", secure: true, path: "/" });

    vi.unstubAllEnvs();
  });

  it("does not try to contact the external OAuth service when OAUTH_SERVER_URL is unset", async () => {
    vi.stubEnv("OAUTH_SERVER_URL", "");
    vi.stubEnv("JWT_SECRET", "test-secret-for-auth");

    const { sdk } = await import("./_core/sdk");

    await expect(sdk.getUserInfoWithJwt("sample-token")).rejects.toMatchObject({ message: "OAuth server is not configured" });

    vi.unstubAllEnvs();
  });

  it("ignores an OAuth URL that points back to the current app", async () => {
    vi.stubEnv("OAUTH_SERVER_URL", "https://pos-vz7p.onrender.com/");
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://pos-vz7p.onrender.com");
    vi.stubEnv("JWT_SECRET", "test-secret-for-auth");

    const { ENV } = await import("./_core/env");
    const { sdk } = await import("./_core/sdk");

    expect(ENV.oAuthServerUrl).toBe("");
    await expect(sdk.getUserInfoWithJwt("sample-token")).rejects.toMatchObject({ message: "OAuth server is not configured" });

    vi.unstubAllEnvs();
  });

  it("accepts the configured credential through the API and sets a protected admin session cookie", async () => {
    setDbForTesting(createTestDb() as never);
    const { ctx, cookies } = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.superAdminLogin({ email: process.env.SUPER_ADMIN_EMAIL ?? "", password: process.env.SUPER_ADMIN_PASSWORD ?? "" });

    expect(result).toMatchObject({ success: true, role: "admin" });
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
    expect(cookies[0]?.value).not.toContain(process.env.SUPER_ADMIN_PASSWORD ?? "");
    expect(cookies[0]?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "none", path: "/" });
  });

  it("rejects an invalid password without setting a session", async () => {
    const { ctx, cookies } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.superAdminLogin({ email: process.env.SUPER_ADMIN_EMAIL ?? "", password: "invalid-password" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(cookies).toHaveLength(0);
  });

  it("clears the super-admin session cookie during logout", async () => {
    setDbForTesting(createTestDb() as never);
    const { ctx, clearedCookies } = createContext();
    const loginCaller = appRouter.createCaller(ctx);
    await loginCaller.auth.superAdminLogin({ email: process.env.SUPER_ADMIN_EMAIL ?? "", password: process.env.SUPER_ADMIN_PASSWORD ?? "" });
    ctx.user = { id: 1, openId: "tradecore_super_admin", name: "Super Admin", email: process.env.SUPER_ADMIN_EMAIL ?? null, loginMethod: "credential", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

    const result = await appRouter.createCaller(ctx).auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]).toMatchObject({ name: COOKIE_NAME, options: { maxAge: -1, httpOnly: true } });
  });
});
