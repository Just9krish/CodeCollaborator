import { 
  users, type User, type InsertUser,
  sessions, type Session, type InsertSession,
  files, type File, type InsertFile,
  messages, type Message, type InsertMessage,
  sessionParticipants, type SessionParticipant, type InsertSessionParticipant
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// CRUD interface for our storage
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session operations
  getSession(id: number): Promise<Session | undefined>;
  getSessions(ownerId?: number): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: number): Promise<boolean>;
  
  // File operations
  getFile(id: number): Promise<File | undefined>;
  getFilesBySession(sessionId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, file: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;
  
  // Message operations
  getMessagesBySession(sessionId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Participant operations
  getSessionParticipants(sessionId: number, activeOnly?: boolean): Promise<SessionParticipant[]>;
  addParticipant(participant: InsertSessionParticipant): Promise<SessionParticipant>;
  updateParticipant(id: number, participant: Partial<InsertSessionParticipant>): Promise<SessionParticipant | undefined>;
  removeParticipant(sessionId: number, userId: number): Promise<boolean>;
  
  // Session Store for authentication
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sessions: Map<number, Session>;
  private files: Map<number, File>;
  private messages: Map<number, Message>;
  private participants: Map<number, SessionParticipant>;
  sessionStore: session.SessionStore;
  
  private userIdCounter: number;
  private sessionIdCounter: number;
  private fileIdCounter: number;
  private messageIdCounter: number;
  private participantIdCounter: number;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.files = new Map();
    this.messages = new Map();
    this.participants = new Map();
    
    this.userIdCounter = 1;
    this.sessionIdCounter = 1;
    this.fileIdCounter = 1;
    this.messageIdCounter = 1;
    this.participantIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Session operations
  async getSession(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getSessions(ownerId?: number): Promise<Session[]> {
    const allSessions = Array.from(this.sessions.values());
    if (ownerId) {
      return allSessions.filter(session => session.ownerId === ownerId);
    }
    return allSessions;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = this.sessionIdCounter++;
    const now = new Date();
    const session: Session = { 
      ...insertSession, 
      id, 
      createdAt: now
    };
    this.sessions.set(id, session);
    return session;
  }

  async updateSession(id: number, sessionData: Partial<InsertSession>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession: Session = {
      ...session,
      ...sessionData
    };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: number): Promise<boolean> {
    return this.sessions.delete(id);
  }

  // File operations
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesBySession(sessionId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      file => file.sessionId === sessionId
    );
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.fileIdCounter++;
    const now = new Date();
    const file: File = {
      ...insertFile,
      id,
      createdAt: now
    };
    this.files.set(id, file);
    return file;
  }

  async updateFile(id: number, fileData: Partial<InsertFile>): Promise<File | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;
    
    const updatedFile: File = {
      ...file,
      ...fileData
    };
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async deleteFile(id: number): Promise<boolean> {
    return this.files.delete(id);
  }

  // Message operations
  async getMessagesBySession(sessionId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.sessionId === sessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const now = new Date();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: now
    };
    this.messages.set(id, message);
    return message;
  }

  // Participant operations
  async getSessionParticipants(sessionId: number, activeOnly: boolean = false): Promise<SessionParticipant[]> {
    const allParticipants = Array.from(this.participants.values())
      .filter(participant => participant.sessionId === sessionId);
    
    if (activeOnly) {
      return allParticipants.filter(participant => participant.isActive);
    }
    return allParticipants;
  }

  async addParticipant(insertParticipant: InsertSessionParticipant): Promise<SessionParticipant> {
    const id = this.participantIdCounter++;
    const now = new Date();
    const participant: SessionParticipant = {
      ...insertParticipant,
      id,
      joinedAt: now
    };
    this.participants.set(id, participant);
    return participant;
  }

  async updateParticipant(id: number, participantData: Partial<InsertSessionParticipant>): Promise<SessionParticipant | undefined> {
    const participant = this.participants.get(id);
    if (!participant) return undefined;
    
    const updatedParticipant: SessionParticipant = {
      ...participant,
      ...participantData
    };
    this.participants.set(id, updatedParticipant);
    return updatedParticipant;
  }

  async removeParticipant(sessionId: number, userId: number): Promise<boolean> {
    const participant = Array.from(this.participants.values()).find(
      p => p.sessionId === sessionId && p.userId === userId
    );
    
    if (!participant) return false;
    
    // Just mark as inactive instead of deleting
    participant.isActive = false;
    this.participants.set(participant.id, participant);
    return true;
  }
}

export const storage = new MemStorage();
