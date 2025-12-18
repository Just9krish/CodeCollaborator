import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { notificationService } from "../notification-service";
import { createMessageHandlers, processMessage } from "./handlers";
import type {
  ClientConnection,
  BroadcastToSessionFn,
  BroadcastToUserFn,
} from "./types";

export type {
  ClientConnection,
  BroadcastToSessionFn,
  BroadcastToUserFn,
} from "./types";

/**
 * Initialize WebSocket server and return broadcast functions
 */
export function initializeWebSocket(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  console.log("WebSocket server created on path: /ws");

  // Track client connections
  const clients = new Set<ClientConnection>();

  // Broadcast to all clients in a session
  const broadcastToSession: BroadcastToSessionFn = (
    sessionId,
    message,
    excludeClient
  ) => {
    clients.forEach(client => {
      if (
        client.sessionId === sessionId &&
        client.ws.readyState === WebSocket.OPEN &&
        client !== excludeClient
      ) {
        client.ws.send(JSON.stringify(message));
      }
    });
  };

  // Broadcast to a specific user
  const broadcastToUser: BroadcastToUserFn = (userId, message) => {
    clients.forEach(client => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  };

  // Create message handlers
  const handlers = createMessageHandlers(broadcastToSession, broadcastToUser);

  // Handle new connections
  wss.on("connection", ws => {
    console.log("WebSocket client connected");

    const client: ClientConnection = {
      ws,
      userId: "",
      sessionId: null,
    };

    clients.add(client);
    notificationService.registerClient(client);

    ws.on("error", error => {
      console.error("WebSocket client error:", error);
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      clients.delete(client);
    });

    ws.on("message", async rawMessage => {
      try {
        const message = JSON.parse(rawMessage.toString());
        await processMessage(client, message, handlers);
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });

    ws.on("close", async () => {
      await handlers.handleDisconnect(client);
      clients.delete(client);
    });
  });

  return {
    broadcastToSession,
    broadcastToUser,
    getClients: () => clients,
  };
}
