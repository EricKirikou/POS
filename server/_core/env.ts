const fallbackAppId = "tradecore-pos-dashboard";
const fallbackCookieSecret = "tradecore-development-session-secret-2026";

function isExternalOAuthServerUrl(value: string | undefined): boolean {
  if (!value || !value.trim()) return false;

  try {
    const oauthOrigin = new URL(value).origin;
    const appOrigins = [
      process.env.RENDER_EXTERNAL_URL,
      process.env.PUBLIC_URL,
      process.env.APP_URL,
      process.env.BASE_URL,
      process.env.VITE_APP_URL,
      process.env.VITE_PUBLIC_URL,
    ]
      .filter((entry): entry is string => Boolean(entry && entry.trim()))
      .map((entry) => {
        try {
          return new URL(entry).origin;
        } catch {
          return "";
        }
      })
      .filter(Boolean);

    if (appOrigins.includes(oauthOrigin)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

const rawOAuthServerUrl = process.env.OAUTH_SERVER_URL?.trim() ?? "";
const sanitizedOAuthServerUrl = isExternalOAuthServerUrl(rawOAuthServerUrl) ? rawOAuthServerUrl : "";

export const ENV = {
  appId: process.env.VITE_APP_ID?.trim() || fallbackAppId,
  cookieSecret: process.env.JWT_SECRET?.trim() || fallbackCookieSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: sanitizedOAuthServerUrl,
  oAuthClientId: process.env.OAUTH_CLIENT_ID ?? "",
  oAuthClientSecret: process.env.OAUTH_CLIENT_SECRET ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL ?? "superadmin@knust.edu.gh",
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD ?? "Admin@123",
};

if (rawOAuthServerUrl && !sanitizedOAuthServerUrl) {
  console.warn("[Auth] OAUTH_SERVER_URL points to the local app or an invalid target and will be ignored. Local admin session auth remains enabled.");
}

if (!process.env.JWT_SECRET?.trim()) {
  console.warn("[Auth] JWT_SECRET is missing. Falling back to the built-in development secret for session signing.");
}
