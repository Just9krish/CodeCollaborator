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
import { eq, and, sql } from "drizzle-orm";
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
  async getUser(id: number): Promise<User | undefined> {
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
  async getSession(id: number): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.id, id));
    return result[0];
  }

  async getSessions(ownerId?: number): Promise<Session[]> {
    if (ownerId) {
      return await db
        .select()
        .from(sessions)
        .where(eq(sessions.ownerId, ownerId));
    }
    return await db.select().from(sessions);
  }

  async createSession(session: InsertSession): Promise<Session> {
    const result = await db.insert(sessions).values(session).returning();
    return result[0];
  }

  async updateSession(
    id: number,
    sessionData: Partial<InsertSession>
  ): Promise<Session | undefined> {
    const result = await db
      .update(sessions)
      .set(sessionData)
      .where(eq(sessions.id, id))
      .returning();
    return result[0];
  }

  async deleteSession(id: number): Promise<boolean> {
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
    console.log(!!result);
    return !!result;
  }

  // File operations
  async getFile(id: number): Promise<File | undefined> {
    const result = await db.select().from(files).where(eq(files.id, id));
    return result[0];
  }

  async getFilesBySession(sessionId: number): Promise<File[]> {
    return await db.select().from(files).where(eq(files.sessionId, sessionId));
  }

  async createFile(file: InsertFile): Promise<File> {
    const result = await db.insert(files).values(file).returning();
    return result[0];
  }

  async updateFile(
    id: number,
    fileData: Partial<InsertFile>
  ): Promise<File | undefined> {
    const result = await db
      .update(files)
      .set(fileData)
      .where(eq(files.id, id))
      .returning();
    return result[0];
  }

  async deleteFile(id: number): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id));
    return !!result;
  }

  // Message operations
  async getMessagesBySession(sessionId: number): Promise<Message[]> {
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
    sessionId: number,
    activeOnly: boolean = false
  ): Promise<SessionParticipant[]> {
    const filters = [eq(sessionParticipants.sessionId, sessionId)];

    console.log({ activeOnly });
    // Conditionally add the isActive filter
    if (activeOnly) {
      filters.push(eq(sessionParticipants.isActive, true));
    }

    console.log({ filters });

    // Apply filters using the and() operator within a single .where() call
    const query = db
      .select()
      .from(sessionParticipants)
      .where(and(...filters));

    // Execute and return the query results
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
    id: number,
    participantData: Partial<InsertSessionParticipant>
  ): Promise<SessionParticipant | undefined> {
    const result = await db
      .update(sessionParticipants)
      .set(participantData)
      .where(eq(sessionParticipants.id, id))
      .returning();
    return result[0];
  }

  async removeParticipant(sessionId: number, userId: number): Promise<boolean> {
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
    id: number
  ): Promise<CollaborationRequest | undefined> {
    const result = await db
      .select()
      .from(collaborationRequests)
      .where(eq(collaborationRequests.id, id));
    return result[0];
  }

  async getCollaborationRequestsByUser(
    userId: number
  ): Promise<CollaborationRequest[]> {
    return await db
      .select()
      .from(collaborationRequests)
      .where(eq(collaborationRequests.fromUserId, userId))
      .orderBy(collaborationRequests.createdAt);
  }

  async getCollaborationRequestsBySession(
    sessionId: number,
    status?: string
  ): Promise<CollaborationRequest[]> {
    const filters = [eq(collaborationRequests.sessionId, sessionId)];

    // Only add status filter if status is provided
    if (status) {
      filters.push(eq(collaborationRequests.status, status));
    }

    return await db
      .select()
      .from(collaborationRequests)
      .where(and(...filters))
      .orderBy(collaborationRequests.createdAt);
  }

  async getCollaborationRequestByUser(userId: number, sessionId: number) {
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
    sessionId: number;
    fromUserId: number;
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
    id: number,
    requestData: Partial<{ status: string; }>
  ): Promise<CollaborationRequest | undefined> {
    const result = await db
      .update(collaborationRequests)
      .set(requestData)
      .where(eq(collaborationRequests.id, id))
      .returning();
    return result[0];
  }

  // Notification operations
  async getNotifications(userId: number, unreadOnly: boolean = false): Promise<Notification[]> {
    const filters = [eq(notifications.userId, userId)];

    if (unreadOnly) {
      filters.push(eq(notifications.isRead, false));
    }

    return await db
      .select()
      .from(notifications)
      .where(and(...filters))
      .orderBy(notifications.createdAt);
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    const result = await db.select().from(notifications).where(eq(notifications.id, id));
    return result[0];
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: number): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id));
    return !!result;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result[0]?.count || 0);
  }
}

export const storage = new DBStorage();
