import type { Express } from "express";
import { createSessionRoutes } from "./sessions";
import { createFileRoutes } from "./files";
import { createCollaborationRoutes } from "./collaboration";
import { createNotificationRoutes } from "./notifications";
import { createExecutionRoutes } from "./execution";
import type { BroadcastFunction } from "./types";

export function registerApiRoutes(
  app: Express,
  broadcastToSession: BroadcastFunction
) {
  // Session routes
  app.use("/api/sessions", createSessionRoutes(broadcastToSession));

  // File routes (includes messages)
  const fileRoutes = createFileRoutes(broadcastToSession);
  app.use("/api", fileRoutes);

  // Collaboration routes
  const collaborationRoutes = createCollaborationRoutes();
  app.use("/api", collaborationRoutes);

  // Notification routes
  app.use("/api/notifications", createNotificationRoutes());

  // Execution and language routes
  const executionRoutes = createExecutionRoutes();
  app.use("/api", executionRoutes);
}

export type { BroadcastFunction, ClientConnection } from "./types";
