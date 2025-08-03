import { storage } from "./storage";
import { type InsertNotification } from "@shared/schema";
import { WebSocket } from "ws";

// Notification types
export type NotificationType =
  | "collaboration_request"
  | "request_accepted"
  | "request_rejected"
  | "session_invite"
  | "user_joined"
  | "user_left"
  | "code_executed"
  | "file_shared";

// WebSocket clients tracking
type ClientConnection = {
  ws: WebSocket;
  userId: string;
  sessionId: string | null;
};

class NotificationService {
  private clients: Set<ClientConnection> = new Set();

  // Register a client connection
  registerClient(client: ClientConnection) {
    this.clients.add(client);
  }

  // Unregister a client connection
  unregisterClient(client: ClientConnection) {
    this.clients.delete(client);
  }

  // Create and send a notification
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any
  ) {
    try {
      // Create notification in database
      const notification = await storage.createNotification({
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
      });

      // Send real-time notification if user is online
      this.sendNotificationToUser(userId, notification);

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // Send notification to specific user via WebSocket
  private sendNotificationToUser(userId: string, notification: any) {
    const userClients = Array.from(this.clients).filter(
      c => c.userId === userId
    );

    for (const client of userClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(
          JSON.stringify({
            type: "notification",
            notification,
          })
        );
      }
    }
  }

  // Send notification to all clients in a session
  sendNotificationToSession(
    sessionId: string,
    notification: any,
    excludeUserId?: string
  ) {
    const sessionClients = Array.from(this.clients).filter(
      c => c.sessionId === sessionId && c.userId !== excludeUserId
    );

    for (const client of sessionClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(
          JSON.stringify({
            type: "notification",
            notification,
          })
        );
      }
    }
  }

  // Helper methods for common notification types
  async notifyCollaborationRequest(
    sessionId: string,
    fromUserId: string,
    toUserId: string,
    sessionName: string
  ) {
    const fromUser = await storage.getUser(fromUserId);
    const username = fromUser?.username || `User ${fromUserId}`;

    await this.createNotification(
      toUserId,
      "collaboration_request",
      "New Collaboration Request",
      `${username} wants to join your session "${sessionName}"`,
      {
        sessionId,
        fromUserId,
        fromUsername: username,
        sessionName,
      }
    );
  }

  async notifyRequestResponse(
    sessionId: string,
    fromUserId: string,
    toUserId: string,
    status: "accepted" | "rejected",
    sessionName: string
  ) {
    const fromUser = await storage.getUser(fromUserId);
    const username = fromUser?.username || `User ${fromUserId}`;

    await this.createNotification(
      toUserId,
      status === "accepted" ? "request_accepted" : "request_rejected",
      `Request ${status === "accepted" ? "Accepted" : "Rejected"}`,
      `Your request to join "${sessionName}" has been ${status} by ${username}`,
      {
        sessionId,
        fromUserId,
        fromUsername: username,
        sessionName,
        status,
      }
    );
  }

  async notifyUserJoined(
    sessionId: string,
    userId: string,
    sessionName: string
  ) {
    const user = await storage.getUser(userId);
    const username = user?.username || `User ${userId}`;

    // Notify all participants in the session
    const participants = await storage.getSessionParticipants(sessionId);

    for (const participant of participants) {
      if (participant.userId !== userId) {
        await this.createNotification(
          participant.userId,
          "user_joined",
          "User Joined Session",
          `${username} joined the session "${sessionName}"`,
          {
            sessionId,
            userId,
            username,
            sessionName,
          }
        );
      }
    }
  }

  async notifyUserLeft(sessionId: string, userId: string, sessionName: string) {
    const user = await storage.getUser(userId);
    const username = user?.username || `User ${userId}`;

    // Notify remaining participants
    const participants = await storage.getSessionParticipants(sessionId);

    for (const participant of participants) {
      if (participant.userId !== userId) {
        await this.createNotification(
          participant.userId,
          "user_left",
          "User Left Session",
          `${username} left the session "${sessionName}"`,
          {
            sessionId,
            userId,
            username,
            sessionName,
          }
        );
      }
    }
  }
}

export const notificationService = new NotificationService();
