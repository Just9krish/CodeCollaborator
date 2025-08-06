import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { executeCode } from "./code-executor";
import { notificationService } from "./notification-service";
import { z } from "zod";
import {
  insertFileSchema,
  insertSessionSchema,
  insertMessageSchema,
  insertSessionParticipantSchema,
  languages,
} from "@shared/schema";

// Type for WebSocket clients with session information
type ClientConnection = {
  ws: WebSocket;
  userId: string;
  sessionId: string | null;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Log WebSocket server setup
  console.log("WebSocket server created on path: /ws");

  // Track client connections
  const clients = new Set<ClientConnection>();

  // Handle WebSocket connections
  wss.on("connection", ws => {
    console.log("WebSocket client connected");

    const client: ClientConnection = {
      ws,
      userId: "", // Will be set when user joins session
      sessionId: null,
    };

    clients.add(client);
    notificationService.registerClient(client);

    // Handle WebSocket errors
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

        switch (message.type) {
          case "auth":
            client.userId = message.userId;
            break;

          case "join_session":
            const session = await storage.getSession(message.sessionId);
            if (!session) {
              client.ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Session not found",
                })
              );
              break;
            }

            // Check if user has access to session
            if (
              !session.isPublic &&
              client.userId !== "" &&
              session.ownerId !== client.userId
            ) {
              // Check if user is a participant
              const participants = await storage.getSessionParticipants(
                message.sessionId
              );
              const isParticipant = participants.some(
                p => p.userId === client.userId
              );

              if (!isParticipant) {
                // Check if user has an accepted collaboration request
                const requests = await storage.getCollaborationRequestsByUser(
                  client.userId
                );
                const hasAccess = requests.some(
                  r =>
                    r.sessionId === message.sessionId && r.status === "accepted"
                );

                if (!hasAccess) {
                  client.ws.send(
                    JSON.stringify({
                      type: "access_denied",
                      message: "You don't have access to this private session",
                      sessionId: message.sessionId,
                    })
                  );
                  break;
                }
              }
            }

            // User has access, join the session
            client.sessionId = message.sessionId;

            if (client.userId !== "") {
              // Check if user is already a participant
              const participants = await storage.getSessionParticipants(
                message.sessionId
              );
              const existingParticipant = participants.find(
                p => p.userId === client.userId
              );

              if (existingParticipant) {
                // Update participant status to active
                await storage.updateParticipant(existingParticipant.id, {
                  isActive: true,
                  cursor: message.cursor || existingParticipant.cursor,
                });
              } else {
                // Add new participant
                await storage.addParticipant({
                  sessionId: message.sessionId,
                  userId: client.userId,
                  cursor: message.cursor || null,
                  isActive: true,
                });
              }

              // Send active participants to all clients in the session
              broadcastToSession(message.sessionId, {
                type: "participants_update",
                participants: await storage.getSessionParticipantsWithUsers(
                  message.sessionId,
                  true
                ),
              });
            }
            break;

          case "leave_session":
            if (client.sessionId && client.userId !== "") {
              await storage.removeParticipant(client.sessionId, client.userId);

              // Notify other clients
              broadcastToSession(client.sessionId, {
                type: "participants_update",
                participants: await storage.getSessionParticipantsWithUsers(
                  client.sessionId,
                  true
                ),
              });

              client.sessionId = null;
            }
            break;

          case "cursor_update":
            if (client.sessionId && client.userId !== "") {
              // Find the participant and update cursor
              const participants =
                await storage.getSessionParticipantsWithUsers(client.sessionId);
              const participant = participants.find(
                p => p.userId === client.userId
              );

              if (participant) {
                await storage.updateParticipant(participant.id, {
                  cursor: message.cursor,
                });

                // Broadcast cursor position to other clients
                broadcastToSession(
                  client.sessionId,
                  {
                    type: "cursor_update",
                    userId: client.userId,
                    cursor: message.cursor,
                  },
                  client
                );
              }
            }
            break;

          case "code_change":
            if (client.sessionId) {
              // Update file content in storage
              const file = await storage.getFile(message.fileId);
              if (file) {
                await storage.updateFile(file.id, { content: message.content });

                // Broadcast changes to other clients
                broadcastToSession(
                  client.sessionId,
                  {
                    type: "code_change",
                    fileId: message.fileId,
                    content: message.content,
                    userId: client.userId,
                  },
                  client
                );
              }
            }
            break;

          case "chat_message":
            if (client.sessionId && client.userId !== "") {
              // Store message
              const newMessage = await storage.createMessage({
                content: message.content,
                userId: client.userId,
                sessionId: client.sessionId,
              });

              // Broadcast message to all clients in the session
              broadcastToSession(client.sessionId, {
                type: "chat_message",
                message: newMessage,
              });
            }
            break;

          case "collaboration_request_sent":
            broadcastToUser(message.ownerId, {
              type: "new_collaboration_request",
              request: message.request,
            });
            break;

          case "collaboration_request_approved":
            broadcastToUser(message.userId, {
              type: "collaboration_request_approved",
              session: message.session,
            });
            break;
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });

    // Handle disconnection
    ws.on("close", async () => {
      if (client.sessionId && client.userId !== "") {
        // Mark the user as inactive in the session
        await storage.removeParticipant(client.sessionId, client.userId);

        // Notify other clients
        broadcastToSession(client.sessionId, {
          type: "participants_update",
          participants: await storage.getSessionParticipantsWithUsers(
            client.sessionId,
            true
          ),
        });
      }

      clients.delete(client);
    });
  });

  function broadcastToUser(userId: string, message: any) {
    clients.forEach(client => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  // Helper function to broadcast messages to all clients in a session
  function broadcastToSession(
    sessionId: string,
    message: any,
    excludeClient?: ClientConnection
  ) {
    clients.forEach(client => {
      if (
        client.sessionId === sessionId &&
        client.ws.readyState === WebSocket.OPEN &&
        client !== excludeClient
      ) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  // API Routes

  // Sessions
  app.get("/api/sessions", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Unauthorized" });

    try {
      const ownerId = req.query.mine === "true" ? req.user!.id : undefined;
      const sessions = await storage.getSessions(ownerId);
      return res.status(200).json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      return res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Unauthorized" });

    try {
      // Create a modified schema without requiring ownerId since we'll set it from the authenticated user
      const createSessionSchema = insertSessionSchema.omit({ ownerId: true });
      const parsedBody = createSessionSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid session data" });
      }

      const session = await storage.createSession({
        ...parsedBody.data,
        ownerId: req.user!.id,
      });

      // Create a default file for the session
      const defaultFile = await storage.createFile({
        name: "index.js",
        content: "// Write your code here\n",
        sessionId: session.id,
      });

      return res.status(201).json({ session, files: [defaultFile] });
    } catch (error) {
      console.error("Error creating session:", error);
      return res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if the user has access to this session
      if (!session.isPublic) {
        // Private session - check if user is authenticated
        if (!req.isAuthenticated()) {
          return res.status(401).json({
            message: "Authentication required",
            requiresAuth: true,
            sessionId: session.id,
          });
        }

        // If not the owner, check if they have an accepted collaboration request
        // or are already a participant
        if (session.ownerId !== req.user!.id) {
          // Check if user is a participant
          const participants = await storage.getSessionParticipants(sessionId);
          const isParticipant = participants.some(
            p => p.userId === req.user!.id
          );

          if (!isParticipant) {
            // Check if user has an accepted collaboration request
            const requests = await storage.getCollaborationRequestsByUser(
              req.user!.id
            );
            const hasAccess = requests.some(
              r => r.sessionId === sessionId && r.status === "accepted"
            );

            if (!hasAccess) {
              return res.status(403).json({
                message: "You don't have access to this session",
                requiresRequest: true,
                sessionId: session.id,
                ownerId: session.ownerId,
              });
            }
          }
        }
      }

      // User has access, retrieve session data
      const files = await storage.getFilesBySession(sessionId);
      const participants = await storage.getSessionParticipantsWithUsers(
        sessionId,
        false
      );

      return res.status(200).json({ session, files, participants });
    } catch (error) {
      console.error("Error fetching session:", error);
      return res.status(500).json({ message: "Failed to fetch session data" });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Unauthorized" });

    try {
      const sessionId = req.params.id;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (session.ownerId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this session" });
      }

      const updatedSession = await storage.updateSession(sessionId, req.body);
      return res.status(200).json(updatedSession);
    } catch (error) {
      console.error("Error updating session:", error);
      return res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Unauthorized" });

    try {
      const sessionId = req.params.id;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (session.ownerId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to delete this session" });
      }

      await storage.deleteSession(sessionId);

      // Notify all connected clients about the session deletion
      broadcastToSession(sessionId, {
        type: "session_deleted",
        sessionId,
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting session:", error);
      return res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Files
  app.post("/api/sessions/:sessionId/files", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Unauthorized" });

    try {
      const sessionId = req.params.sessionId;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const parsedBody = insertFileSchema.safeParse({
        ...req.body,
        sessionId,
      });

      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid file data" });
      }

      const file = await storage.createFile(parsedBody.data);

      // Notify clients about new file
      broadcastToSession(sessionId, {
        type: "file_created",
        file,
      });

      return res.status(201).json(file);
    } catch (error) {
      console.error("Error creating file:", error);
      return res.status(500).json({ message: "Failed to create file" });
    }
  });

  // Folders
  app.post("/api/sessions/:sessionId/folders", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Unauthorized" });

    try {
      const sessionId = req.params.sessionId;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const { name, parentId } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Folder name is required" });
      }

      const folder = await storage.createFolder({
        name,
        sessionId,
        parentId: parentId || undefined,
      });

      // Notify clients about new folder
      broadcastToSession(sessionId, {
        type: "folder_created",
        folder,
      });

      return res.status(201).json(folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      return res.status(500).json({ message: "Failed to create folder" });
    }
  });

  app.patch("/api/files/:id", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Unauthorized" });

    try {
      const fileId = req.params.id;
      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const updatedFile = await storage.updateFile(fileId, req.body);

      // Notify clients about file update
      if (updatedFile) {
        broadcastToSession(updatedFile.sessionId, {
          type: "file_updated",
          file: updatedFile,
        });
      }

      return res.status(200).json(updatedFile);
    } catch (error) {
      console.error("Error updating file:", error);
      return res.status(500).json({ message: "Failed to update file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Unauthorized" });

    try {
      const fileId = req.params.id;
      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const sessionId = file.sessionId;
      const deleted = await storage.deleteFile(fileId);

      if (deleted) {
        // Notify clients about file deletion
        broadcastToSession(sessionId, {
          type: "file_deleted",
          fileId,
        });

        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ message: "Failed to delete file" });
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      return res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Messages
  app.get("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const messages = await storage.getMessagesBySession(sessionId);
      return res.status(200).json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      return res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Code execution
  app.post("/api/execute", async (req, res) => {
    try {
      const { code, language } = req.body;

      if (!code || !language) {
        return res
          .status(400)
          .json({ message: "Code and language are required" });
      }

      const supportedLanguage = languages.find(lang => lang.id === language);
      if (!supportedLanguage) {
        return res.status(400).json({ message: "Unsupported language" });
      }

      const result = await executeCode(code, language);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error executing code:", error);
      return res.status(500).json({ message: "Failed to execute code" });
    }
  });

  // Languages
  app.get("/api/languages", (_req, res) => {
    return res.status(200).json(languages);
  });

  // Collaboration Requests
  app.post(
    "/api/sessions/:sessionId/collaboration-requests",
    async (req, res) => {
      if (!req.isAuthenticated())
        return res.status(401).json({ message: "Unauthorized" });

      try {
        const sessionId = req.params.sessionId;
        const session = await storage.getSession(sessionId);

        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }

        // If the session is public, collaboration requests are not needed
        if (session.isPublic) {
          return res.status(400).json({
            message: "Cannot request collaboration for public sessions",
          });
        }

        // Check if user already has an active request
        const existingRequests = await storage.getCollaborationRequestsByUser(
          req.user!.id
        );
        const existingRequest = existingRequests.find(
          r => r.sessionId === sessionId && r.status === "pending"
        );

        if (existingRequest) {
          return res.status(409).json({
            message: "You already have a pending request for this session",
          });
        }

        // Create collaboration request
        const request = await storage.createCollaborationRequest({
          sessionId,
          fromUserId: req.user!.id,
          status: "pending",
        });

        // Create notification for the session owner
        await notificationService.notifyCollaborationRequest(
          sessionId,
          req.user!.id,
          session.ownerId,
          session.name
        );

        return res.status(201).json(request);
      } catch (error) {
        console.error("Error creating collaboration request:", error);
        return res
          .status(500)
          .json({ message: "Failed to create collaboration request" });
      }
    }
  );

  app.get(
    "/api/sessions/:sessionId/collaboration-requests",
    async (req, res) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const sessionId = req.params.sessionId;
        const session = await storage.getSession(sessionId);
        const status = req.query.status as string;

        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }

        // Only session owner can view collaboration requests
        if (session.ownerId !== req.user!.id) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const requests = await storage.getCollaborationRequestsBySession(
          sessionId
          // status
        );

        // Add username to each request
        const requestsWithUsernames = await Promise.all(
          requests.map(async request => {
            const requester = await storage.getUser(request.fromUserId);
            return {
              ...request,
              username: requester?.username || `User ${request.fromUserId}`,
            };
          })
        );

        return res.status(200).json(requestsWithUsernames);
      } catch (error) {
        console.error("Error fetching collaboration requests:", error);
        return res
          .status(500)
          .json({ message: "Failed to fetch collaboration requests" });
      }
    }
  );

  app.patch("/api/collaboration-requests/:id", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Unauthorized" });

    try {
      const requestId = req.params.id;
      const request = await storage.getCollaborationRequest(requestId);

      if (!request) {
        return res
          .status(404)
          .json({ message: "Collaboration request not found" });
      }

      const session = await storage.getSession(request.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Only the owner of the session can approve/reject requests
      if (session.ownerId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this request" });
      }

      const { status } = req.body;
      if (status !== "accepted" && status !== "rejected") {
        return res.status(400).json({ message: "Invalid status value" });
      }

      const updatedRequest = await storage.updateCollaborationRequest(
        requestId,
        { status }
      );

      // If request is accepted, add the user as a participant (if they're not already)
      if (status === "accepted") {
        const participants = await storage.getSessionParticipants(session.id);
        const existingParticipant = participants.find(
          p => p.userId === request.fromUserId
        );

        if (!existingParticipant) {
          await storage.addParticipant({
            sessionId: session.id,
            userId: request.fromUserId,
            isActive: false,
            cursor: null,
          });
        }
      }

      // Create notification for the requesting user
      await notificationService.notifyRequestResponse(
        session.id,
        req.user!.id,
        request.fromUserId,
        status,
        session.name
      );

      return res.status(200).json(updatedRequest);
    } catch (error) {
      console.error("Error updating collaboration request:", error);
      return res
        .status(500)
        .json({ message: "Failed to update collaboration request" });
    }
  });

  // Notification endpoints
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const unreadOnly = req.query.unread === "true";
      const notifications = await storage.getNotifications(
        req.user!.id
        // unreadOnly
      );
      return res.status(200).json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const count = await storage.getUnreadNotificationCount(req.user!.id);
      return res.status(200).json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      return res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const notificationId = req.params.id;
      const notification = await storage.getNotification(notificationId);

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      if (notification.userId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this notification" });
      }

      const updatedNotification =
        await storage.markNotificationAsRead(notificationId);
      return res.status(200).json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return res
        .status(500)
        .json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      await storage.markAllNotificationsAsRead(req.user!.id);
      return res
        .status(200)
        .json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return res
        .status(500)
        .json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const notificationId = req.params.id;
      const notification = await storage.getNotification(notificationId);

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      if (notification.userId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to delete this notification" });
      }

      const success = await storage.deleteNotification(notificationId);
      if (success) {
        return res.status(200).json({ message: "Notification deleted" });
      } else {
        return res
          .status(500)
          .json({ message: "Failed to delete notification" });
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      return res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  return httpServer;
}
