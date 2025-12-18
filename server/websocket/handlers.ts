import { storage } from "../storage";
import type {
  ClientConnection,
  WebSocketMessage,
  BroadcastToSessionFn,
  BroadcastToUserFn,
} from "./types";

/**
 * Creates WebSocket message handlers
 */
export function createMessageHandlers(
  broadcastToSession: BroadcastToSessionFn,
  broadcastToUser: BroadcastToUserFn
) {
  return {
    /**
     * Handle authentication message
     */
    async handleAuth(client: ClientConnection, userId: string) {
      client.userId = userId;
    },

    /**
     * Handle join session message
     */
    async handleJoinSession(
      client: ClientConnection,
      sessionId: string,
      cursor?: any
    ) {
      const session = await storage.getSession(sessionId);

      if (!session) {
        client.ws.send(
          JSON.stringify({
            type: "error",
            message: "Session not found",
          })
        );
        return;
      }

      // Check access for private sessions
      if (
        !session.isPublic &&
        client.userId !== "" &&
        session.ownerId !== client.userId
      ) {
        const participants = await storage.getSessionParticipants(sessionId);
        const isParticipant = participants.some(
          p => p.userId === client.userId
        );

        if (!isParticipant) {
          const requests = await storage.getCollaborationRequestsByUser(
            client.userId
          );
          const hasAccess = requests.some(
            r => r.sessionId === sessionId && r.status === "accepted"
          );

          if (!hasAccess) {
            client.ws.send(
              JSON.stringify({
                type: "access_denied",
                message: "You don't have access to this private session",
                sessionId,
              })
            );
            return;
          }
        }
      }

      // Join the session
      client.sessionId = sessionId;

      if (client.userId !== "") {
        const participants = await storage.getSessionParticipants(sessionId);
        const existingParticipant = participants.find(
          p => p.userId === client.userId
        );

        if (existingParticipant) {
          await storage.updateParticipant(existingParticipant.id, {
            isActive: true,
            cursor: cursor || existingParticipant.cursor,
          });
        } else {
          await storage.addParticipant({
            sessionId,
            userId: client.userId,
            cursor: cursor || null,
            isActive: true,
          });
        }

        broadcastToSession(sessionId, {
          type: "participants_update",
          participants: await storage.getSessionParticipantsWithUsers(
            sessionId,
            true
          ),
        });
      }
    },

    /**
     * Handle leave session message
     */
    async handleLeaveSession(client: ClientConnection) {
      if (client.sessionId && client.userId !== "") {
        await storage.removeParticipant(client.sessionId, client.userId);

        broadcastToSession(client.sessionId, {
          type: "participants_update",
          participants: await storage.getSessionParticipantsWithUsers(
            client.sessionId,
            true
          ),
        });

        client.sessionId = null;
      }
    },

    /**
     * Handle cursor update message
     */
    async handleCursorUpdate(client: ClientConnection, cursor: any) {
      if (client.sessionId && client.userId !== "") {
        const participants = await storage.getSessionParticipantsWithUsers(
          client.sessionId
        );
        const participant = participants.find(p => p.userId === client.userId);

        if (participant) {
          await storage.updateParticipant(participant.id, { cursor });

          broadcastToSession(
            client.sessionId,
            {
              type: "cursor_update",
              userId: client.userId,
              cursor,
            },
            client
          );
        }
      }
    },

    /**
     * Handle code change message
     */
    async handleCodeChange(
      client: ClientConnection,
      fileId: string,
      content: string
    ) {
      if (client.sessionId) {
        const file = await storage.getFile(fileId);
        if (file) {
          await storage.updateFile(file.id, { content });

          broadcastToSession(
            client.sessionId,
            {
              type: "code_change",
              fileId,
              content,
              userId: client.userId,
            },
            client
          );
        }
      }
    },

    /**
     * Handle chat message
     */
    async handleChatMessage(client: ClientConnection, content: string) {
      if (client.sessionId && client.userId !== "") {
        const newMessage = await storage.createMessage({
          content,
          userId: client.userId,
          sessionId: client.sessionId,
        });

        broadcastToSession(client.sessionId, {
          type: "chat_message",
          message: newMessage,
        });
      }
    },

    /**
     * Handle collaboration request sent notification
     */
    handleCollaborationRequestSent(ownerId: string, request: any) {
      broadcastToUser(ownerId, {
        type: "new_collaboration_request",
        request,
      });
    },

    /**
     * Handle collaboration request approved notification
     */
    handleCollaborationRequestApproved(userId: string, session: any) {
      broadcastToUser(userId, {
        type: "collaboration_request_approved",
        session,
      });
    },

    /**
     * Handle client disconnect
     */
    async handleDisconnect(client: ClientConnection) {
      if (client.sessionId && client.userId !== "") {
        await storage.removeParticipant(client.sessionId, client.userId);

        broadcastToSession(client.sessionId, {
          type: "participants_update",
          participants: await storage.getSessionParticipantsWithUsers(
            client.sessionId,
            true
          ),
        });
      }
    },
  };
}

/**
 * Process incoming WebSocket message and route to appropriate handler
 */
export async function processMessage(
  client: ClientConnection,
  message: WebSocketMessage,
  handlers: ReturnType<typeof createMessageHandlers>
) {
  switch (message.type) {
    case "auth":
      await handlers.handleAuth(client, message.userId);
      break;

    case "join_session":
      await handlers.handleJoinSession(
        client,
        message.sessionId,
        message.cursor
      );
      break;

    case "leave_session":
      await handlers.handleLeaveSession(client);
      break;

    case "cursor_update":
      await handlers.handleCursorUpdate(client, message.cursor);
      break;

    case "code_change":
      await handlers.handleCodeChange(client, message.fileId, message.content);
      break;

    case "chat_message":
      await handlers.handleChatMessage(client, message.content);
      break;

    case "collaboration_request_sent":
      handlers.handleCollaborationRequestSent(message.ownerId, message.request);
      break;

    case "collaboration_request_approved":
      handlers.handleCollaborationRequestApproved(
        message.userId,
        message.session
      );
      break;
  }
}
