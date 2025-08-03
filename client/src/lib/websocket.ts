/**
 * WebSocket manager for real-time code collaboration
 */

import { User } from "@shared/schema";
import { queryClient } from "./queryClient";
import { ExecutionResult } from "server/code-executor";

// Types
type WsEventHandler = (message: any) => void;
type CursorPosition = { line: number; column: number; fileId: string };

type WebSocketMessage =
  | { type: "auth"; userId: string }
  | { type: "join_session"; sessionId: string; cursor?: CursorPosition | null }
  | { type: "leave_session" }
  | { type: "cursor_update"; cursor: CursorPosition }
  | { type: "code_change"; fileId: string; content: string }
  | { type: "chat_message"; content: string }
  | { type: "notification"; notification: any };

class WebSocketManager {
  private socket: WebSocket | null = null;
  private eventHandlers: Map<string, Set<WsEventHandler>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private user: User | null = null;
  private connected: boolean = false;
  private sessionId: string | null = null;

  // Initialize the WebSocket connection
  connect() {
    if (this.socket) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Remove any token from URL and use clean WebSocket path
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log("Connecting to WebSocket:", wsUrl);

    try {
      this.socket = new WebSocket(wsUrl);
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      return;
    }

    this.socket.onopen = () => {
      console.log("WebSocket connected");
      this.connected = true;

      // Clear any reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Get the user and auth with the WebSocket if available
      this.user = queryClient.getQueryData(["/api/user"]) || null;
      if (this.user) {
        this.send({ type: "auth", userId: this.user.id });
      }

      // Rejoin session if we have one
      if (this.sessionId) {
        this.joinSession(this.sessionId);
      }

      // Notify listeners
      this.trigger("connection_state_change", { connected: true });
    };

    this.socket.onclose = () => {
      console.log("WebSocket disconnected");
      this.connected = false;
      this.socket = null;

      // Notify listeners
      this.trigger("connection_state_change", { connected: false });

      // Attempt to reconnect after a delay
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, 3000);
    };

    this.socket.onerror = error => {
      console.error("WebSocket error:", error);
      console.error("WebSocket readyState:", this.socket?.readyState);
      this.trigger("error", { error });
    };

    this.socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        // Trigger event handlers for this message type
        this.trigger(message.type, message);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }

  // Send a message to the server
  send(message: WebSocketMessage) {
    if (this.socket && this.connected) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn("Cannot send message, WebSocket not connected");
    }
  }

  // Update the authenticated user
  setUser(user: User | null) {
    this.user = user;

    if (user && this.connected) {
      this.send({ type: "auth", userId: user.id });
    }
  }

  // Join a code session
  joinSession(sessionId: string, cursor?: CursorPosition) {
    this.sessionId = sessionId;

    if (this.connected) {
      this.send({
        type: "join_session",
        sessionId,
        cursor,
      });
    }
  }

  // Leave the current session
  leaveSession() {
    if (this.sessionId && this.connected) {
      this.send({ type: "leave_session" });
      this.sessionId = null;
    }
  }

  // Update cursor position
  updateCursor(cursor: CursorPosition) {
    if (this.sessionId && this.connected) {
      this.send({ type: "cursor_update", cursor });
    }
  }

  // Send code changes
  sendCodeChange(fileId: string, content: string) {
    if (this.sessionId && this.connected) {
      this.send({ type: "code_change", fileId, content });
    }
  }

  // Send a chat message
  sendChatMessage(content: string) {
    if (this.sessionId && this.connected) {
      this.send({ type: "chat_message", content });
    }
  }

  // Subscribe to WebSocket events
  on(eventType: string, handler: WsEventHandler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    this.eventHandlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  // Trigger event handlers for a specific event type
  private trigger(eventType: string, data: any) {
    const handlers = this.eventHandlers.get(eventType);

    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${eventType} handler:`, error);
        }
      });
    }
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.connected = false;
    this.sessionId = null;
  }

  // Get current connection state
  isConnected() {
    return this.connected;
  }

  // Get current session ID
  getSessionId() {
    return this.sessionId;
  }
}

// Create a singleton instance
export const wsManager = new WebSocketManager();

// Also export types
export type { CursorPosition, ExecutionResult };
