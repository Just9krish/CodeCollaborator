import { type IStorage } from "../types";
import {
  users,
  type User,
  type InsertUser,
  sessions,
  type Session,
  type InsertSession,
  files,
  type File,
  type InsertFile,
  messages,
  type Message,
  type InsertMessage,
  sessionParticipants,
  type SessionParticipant,
  type InsertSessionParticipant,
  collaborationRequests,
  CollaborationRequest,
  notifications,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, ne } from "drizzle-orm";
import session, { Store } from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class DBStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Session operations
  async getSession(id: string): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.id, id));
    return result[0];
  }

  async getSessions(ownerId?: string): Promise<Session[]> {
    if (ownerId) {
      return await db
        .select()
        .from(sessions)
        .where(eq(sessions.ownerId, ownerId));
    }
    return await db.select().from(sessions);
  }

  // Get sessions where user is a participant but not the owner
  async getCollaborationSessions(userId: string): Promise<Session[]> {
    const result = await db
      .select({
        id: sessions.id,
        name: sessions.name,
        ownerId: sessions.ownerId,
        language: sessions.language,
        isPublic: sessions.isPublic,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
      })
      .from(sessionParticipants)
      .innerJoin(sessions, eq(sessionParticipants.sessionId, sessions.id))
      .where(
        and(
          eq(sessionParticipants.userId, userId),
          ne(sessions.ownerId, userId)
        )
      );

    return result;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const result = await db.insert(sessions).values(session).returning();
    return result[0];
  }

  async updateSession(
    id: string,
    sessionData: Partial<InsertSession>
  ): Promise<Session | undefined> {
    const result = await db
      .update(sessions)
      .set(sessionData)
      .where(eq(sessions.id, id))
      .returning();
    return result[0];
  }

  async deleteSession(id: string): Promise<boolean> {
    // Delete all related data in order due to foreign key constraints
    await db.delete(messages).where(eq(messages.sessionId, id));
    await db
      .delete(sessionParticipants)
      .where(eq(sessionParticipants.sessionId, id));
    await db
      .delete(collaborationRequests)
      .where(eq(collaborationRequests.sessionId, id));
    await db.delete(files).where(eq(files.sessionId, id));
    const result = await db.delete(sessions).where(eq(sessions.id, id));
    return !!result;
  }

  // File operations
  async getFile(id: string): Promise<File | undefined> {
    const result = await db.select().from(files).where(eq(files.id, id));
    return result[0];
  }

  async getFilesBySession(sessionId: string): Promise<File[]> {
    return await db.select().from(files).where(eq(files.sessionId, sessionId));
  }

  async createFile(file: InsertFile): Promise<File> {
    const result = await db.insert(files).values(file).returning();
    return result[0];
  }

  async createFolder(folderData: {
    name: string;
    sessionId: string;
    parentId?: string;
  }): Promise<File> {
    const result = await db
      .insert(files)
      .values({
        ...folderData,
        content: "",
        isFolder: true,
      })
      .returning();
    return result[0];
  }

  async updateFile(
    id: string,
    fileData: Partial<InsertFile>
  ): Promise<File | undefined> {
    const result = await db
      .update(files)
      .set(fileData)
      .where(eq(files.id, id))
      .returning();
    return result[0];
  }

  async deleteFile(id: string): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id));
    return !!result;
  }

  // Message operations
  async getMessagesBySession(sessionId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  // Participant operations
  async getSessionParticipants(
    sessionId: string,
    activeOnly: boolean = false
  ): Promise<SessionParticipant[]> {
    const filters = [eq(sessionParticipants.sessionId, sessionId)];

    // Conditionally add the isActive filter
    if (activeOnly) {
      filters.push(eq(sessionParticipants.isActive, true));
    }

    // Apply filters using the and() operator within a single .where() call
    const query = db
      .select()
      .from(sessionParticipants)
      .where(and(...filters));

    // Execute and return the query results
    return await query;
  }

  // Get session participants with user information
  async getSessionParticipantsWithUsers(
    sessionId: string,
    activeOnly: boolean = false
  ): Promise<(SessionParticipant & { username: string })[]> {
    const filters = [eq(sessionParticipants.sessionId, sessionId)];

    if (activeOnly) {
      filters.push(eq(sessionParticipants.isActive, true));
    }

    // Join with users table to get usernames
    const query = db
      .select({
        id: sessionParticipants.id,
        sessionId: sessionParticipants.sessionId,
        userId: sessionParticipants.userId,
        cursor: sessionParticipants.cursor,
        isActive: sessionParticipants.isActive,
        joinedAt: sessionParticipants.joinedAt,
        username: users.username,
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.userId, users.id))
      .where(and(...filters));

    return await query;
  }

  async addParticipant(
    participant: InsertSessionParticipant
  ): Promise<SessionParticipant> {
    const result = await db
      .insert(sessionParticipants)
      .values(participant)
      .returning();
    return result[0];
  }

  async updateParticipant(
    id: string,
    participantData: Partial<InsertSessionParticipant>
  ): Promise<SessionParticipant | undefined> {
    const result = await db
      .update(sessionParticipants)
      .set(participantData)
      .where(eq(sessionParticipants.id, id))
      .returning();
    return result[0];
  }

  async removeParticipant(sessionId: string, userId: string): Promise<boolean> {
    const result = await db
      .update(sessionParticipants)
      .set({ isActive: false })
      .where(
        and(
          eq(sessionParticipants.sessionId, sessionId),
          eq(sessionParticipants.userId, userId)
        )
      );
    return !!result;
  }

  // Public sessions operations
  async getPublicSessions(): Promise<Session[]> {
    return await db.select().from(sessions).where(eq(sessions.isPublic, true));
  }

  // Collaboration request operations
  async getCollaborationRequest(
    id: string
  ): Promise<CollaborationRequest | undefined> {
    const result = await db
      .select()
      .from(collaborationRequests)
      .where(eq(collaborationRequests.id, id));
    return result[0];
  }

  async getCollaborationRequestsByUser(
    userId: string
  ): Promise<CollaborationRequest[]> {
    return await db
      .select()
      .from(collaborationRequests)
      .where(eq(collaborationRequests.fromUserId, userId))
      .orderBy(collaborationRequests.createdAt);
  }

  async getCollaborationRequestsBySession(
    sessionId: string
  ): Promise<CollaborationRequest[]> {
    return await db
      .select()
      .from(collaborationRequests)
      .where(eq(collaborationRequests.sessionId, sessionId))
      .orderBy(collaborationRequests.createdAt);
  }

  async getCollaborationRequestByUser(userId: string, sessionId: string) {
    return await db
      .select()
      .from(collaborationRequests)
      .where(
        and(
          eq(collaborationRequests.fromUserId, userId),
          eq(collaborationRequests.sessionId, sessionId),
          eq(collaborationRequests.status, "pending")
        )
      );
  }

  async createCollaborationRequest(request: {
    sessionId: string;
    fromUserId: string;
    status?: string;
  }): Promise<CollaborationRequest> {
    const result = await db
      .insert(collaborationRequests)
      .values({
        sessionId: request.sessionId,
        fromUserId: request.fromUserId,
        status: request.status || "pending",
      })
      .returning();
    return result[0];
  }

  async updateCollaborationRequest(
    id: string,
    requestData: Partial<{ status: string }>
  ): Promise<CollaborationRequest | undefined> {
    const result = await db
      .update(collaborationRequests)
      .set(requestData)
      .where(eq(collaborationRequests.id, id))
      .returning();
    return result[0];
  }

  // Notification operations
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(notifications.createdAt);
  }

  async createNotification(
    notification: InsertNotification
  ): Promise<Notification> {
    const result = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return result[0];
  }

  async updateNotification(
    id: string,
    notificationData: Partial<InsertNotification>
  ): Promise<Notification | undefined> {
    const result = await db
      .update(notifications)
      .set(notificationData)
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return !!result;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    return !!result;
  }

  // Additional helper methods (not in interface but useful)
  async getNotification(id: string): Promise<Notification | undefined> {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    return result[0];
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(eq(notifications.id, id));
    return !!result;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      );
    return Number(result[0]?.count || 0);
  }
}

export const storage = new DBStorage();
