import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { auth } from "express-openid-connect";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV } from "./env";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);

  // Prefer express-openid-connect (Auth0) when client credentials are configured.
  const hasAuth0Config = Boolean(ENV.oAuthServerUrl && ENV.oAuthClientId && ENV.oAuthClientSecret);

  if (hasAuth0Config) {
    const baseUrl =
      process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || "3000"}`;

    const authConfig = {
      authRequired: false,
      auth0Logout: true,
      secret: ENV.cookieSecret,
      baseURL: baseUrl,
      clientID: ENV.oAuthClientId,
      issuerBaseURL: ENV.oAuthServerUrl,
    } as const;

    app.use(auth(authConfig));
    console.log("[Auth] Auth0 middleware enabled (express-openid-connect)");

    // Expose a simple endpoint the frontend can call to get auth status/profile
    app.get("/api/auth/me", (req, res) => {
      // `req.oidc` is injected by express-openid-connect when enabled
      // use `any` to avoid strict typing here
      const r: any = req as any;
      if (r.oidc && r.oidc.isAuthenticated && r.oidc.isAuthenticated()) {
        return res.json({ authenticated: true, user: r.oidc.user });
      }
      return res.json({ authenticated: false });
    });
  } else if (ENV.oAuthServerUrl) {
    registerOAuthRoutes(app);
  } else {
    console.log("[Auth] OAuth routes disabled: no valid external OAuth server is configured. Using local access-token session auth.");
  }

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
