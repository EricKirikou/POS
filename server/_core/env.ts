const fallbackAppId = "tradecore-pos-dashboard";
const fallbackCookieSecret = "tradecore-development-session-secret-2026";

export const ENV = {
  appId: process.env.VITE_APP_ID?.trim() || fallbackAppId,
  cookieSecret: process.env.JWT_SECRET?.trim() || fallbackCookieSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL ?? "superadmin@knust.edu.gh",
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD ?? "Admin@123",
};

if (!process.env.JWT_SECRET?.trim()) {
  console.warn("[Auth] JWT_SECRET is missing. Falling back to the built-in development secret for session signing.");
}
