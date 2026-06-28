import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerOpenPixWebhook } from "../openpixWebhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite, PROJECT_ROOT } from "./vite";
import { getUploadsDir } from "../localUpload";

const ALLOWED_ORIGINS = [
  "https://controle-financeiro-x7lb.onrender.com",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "null",
];
const isOriginAllowed = (origin: string | undefined) =>
  origin ? ALLOWED_ORIGINS.some((a) => origin.startsWith(a)) : true;

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  // CORS middleware (must be before routes)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isOriginAllowed(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, trpc-accept");
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use("/uploads", express.static(getUploadsDir()));
  // Privacy policy and account deletion pages
  app.get("/privacidade", (_req, res) => {
    res.sendFile(path.resolve(PROJECT_ROOT, "privacidade.html"));
  });
  app.get("/exclusao-conta", (_req, res) => {
    res.sendFile(path.resolve(PROJECT_ROOT, "exclusao-conta.html"));
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerOpenPixWebhook(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Use Vite dev mode if dist doesn't exist (local development)
  const distPath = path.resolve(PROJECT_ROOT, "dist", "public");
  if (fs.existsSync(distPath)) {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
