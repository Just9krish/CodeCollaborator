import { type IStorage } from "./types";
import { 
  users, type User, type InsertUser,
  sessions, type Session, type InsertSession,
  files, type File, type InsertFile,
  messages, type Message, type InsertMessage,
  sessionParticipants, type SessionParticipant, type InsertSessionParticipant,
  collaborationRequests, type CollaborationRequest
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class DBStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
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
      return await db.select().from(sessions).where(eq(sessions.ownerId, ownerId));
    }
    return await db.select().from(sessions);
  }

  async createSession(session: InsertSession): Promise<Session> {
    const result = await db.insert(sessions).values(session).returning();
    return result[0];
  }

  async updateSession(id: number, sessionData: Partial<InsertSession>): Promise<Session | undefined> {
    const result = await db.update(sessions)
      .set(sessionData)
      .where(eq(sessions.id, id))
      .returning();
    return result[0];
  }

  async deleteSession(id: number): Promise<boolean> {
    const result = await db.delete(sessions).where(eq(sessions.id, id));
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

  async updateFile(id: number, fileData: Partial<InsertFile>): Promise<File | undefined> {
    const result = await db.update(files)
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
    return await db.select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  // Participant operations
  async getSessionParticipants(sessionId: number, activeOnly: boolean = false): Promise<SessionParticipant[]> {
    let query = db.select().from(sessionParticipants).where(eq(sessionParticipants.sessionId, sessionId));

    if (activeOnly) {
      query = query.where(eq(sessionParticipants.isActive, true));
    }

    return await query;
  }

  async addParticipant(participant: InsertSessionParticipant): Promise<SessionParticipant> {
    const result = await db.insert(sessionParticipants).values(participant).returning();
    return result[0];
  }

  async updateParticipant(id: number, participantData: Partial<InsertSessionParticipant>): Promise<SessionParticipant | undefined> {
    const result = await db.update(sessionParticipants)
      .set(participantData)
      .where(eq(sessionParticipants.id, id))
      .returning();
    return result[0];
  }

  async removeParticipant(sessionId: number, userId: number): Promise<boolean> {
    const result = await db.update(sessionParticipants)
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
  async getCollaborationRequest(id: number): Promise<CollaborationRequest | undefined> {
    const result = await db.select().from(collaborationRequests).where(eq(collaborationRequests.id, id));
    return result[0];
  }

  async getCollaborationRequestsByUser(userId: number): Promise<CollaborationRequest[]> {
    return await db.select()
      .from(collaborationRequests)
      .where(eq(collaborationRequests.fromUserId, userId))
      .orderBy(collaborationRequests.createdAt);
  }

  async getCollaborationRequestsBySession(sessionId: number): Promise<CollaborationRequest[]> {
    return await db.select()
      .from(collaborationRequests)
      .where(eq(collaborationRequests.sessionId, sessionId))
      .orderBy(collaborationRequests.createdAt);
  }

  async createCollaborationRequest(request: {sessionId: number, fromUserId: number, status?: string}): Promise<CollaborationRequest> {
    const result = await db.insert(collaborationRequests)
      .values({
        sessionId: request.sessionId,
        fromUserId: request.fromUserId,
        status: request.status || 'pending'
      })
      .returning();
    return result[0];
  }

  async updateCollaborationRequest(id: number, requestData: Partial<{status: string}>): Promise<CollaborationRequest | undefined> {
    const result = await db.update(collaborationRequests)
      .set(requestData)
      .where(eq(collaborationRequests.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DBStorage();