import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { registerApiRoutes } from "./routes/index";
import { initializeWebSocket } from "./websocket/index";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Initialize WebSocket server and get broadcast functions
  const { broadcastToSession } = initializeWebSocket(httpServer);

  // Register all API routes with broadcast capability
  registerApiRoutes(app, broadcastToSession);

  return httpServer;
}
