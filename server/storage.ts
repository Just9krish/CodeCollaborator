import { 
  users, type User, type InsertUser,
  sessions, type Session, type InsertSession,
  files, type File, type InsertFile,
  messages, type Message, type InsertMessage,
  sessionParticipants, type SessionParticipant, type InsertSessionParticipant
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const MemoryStore = createMemoryStore(session);

// Get current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File path for data persistence
const DATA_FILE = path.join(__dirname, '..', 'data.json');

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
    
    // Load previously saved data if available
    this.loadData();
  }
  
  // Load data from file
  private loadData(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        console.log('Loading persisted data from', DATA_FILE);
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        
        // Initialize maps with loaded data
        if (data.users) {
          data.users.forEach((user: User) => {
            this.users.set(user.id, {
              ...user,
              // Convert string dates back to Date objects if needed
              createdAt: user.createdAt ? new Date(user.createdAt) : undefined
            });
            this.userIdCounter = Math.max(this.userIdCounter, user.id + 1);
          });
        }
        
        if (data.sessions) {
          data.sessions.forEach((session: Session) => {
            this.sessions.set(session.id, {
              ...session,
              createdAt: new Date(session.createdAt)
            });
            this.sessionIdCounter = Math.max(this.sessionIdCounter, session.id + 1);
          });
        }
        
        if (data.files) {
          data.files.forEach((file: File) => {
            this.files.set(file.id, {
              ...file,
              createdAt: new Date(file.createdAt)
            });
            this.fileIdCounter = Math.max(this.fileIdCounter, file.id + 1);
          });
        }
        
        if (data.messages) {
          data.messages.forEach((message: Message) => {
            this.messages.set(message.id, {
              ...message,
              createdAt: new Date(message.createdAt)
            });
            this.messageIdCounter = Math.max(this.messageIdCounter, message.id + 1);
          });
        }
        
        if (data.participants) {
          data.participants.forEach((participant: SessionParticipant) => {
            this.participants.set(participant.id, {
              ...participant,
              joinedAt: new Date(participant.joinedAt)
            });
            this.participantIdCounter = Math.max(this.participantIdCounter, participant.id + 1);
          });
        }
        
        console.log('Data loaded successfully.');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }
  
  // Save data to file
  private saveData(): void {
    try {
      // Convert maps to arrays for serialization
      const data = {
        users: Array.from(this.users.values()),
        sessions: Array.from(this.sessions.values()),
        files: Array.from(this.files.values()),
        messages: Array.from(this.messages.values()),
        participants: Array.from(this.participants.values())
      };
      
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
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
    this.saveData();
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
    this.saveData();
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
    this.saveData();
    return updatedSession;
  }

  async deleteSession(id: number): Promise<boolean> {
    const result = this.sessions.delete(id);
    if (result) this.saveData();
    return result;
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
    this.saveData();
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
    this.saveData();
    return updatedFile;
  }

  async deleteFile(id: number): Promise<boolean> {
    const result = this.files.delete(id);
    if (result) this.saveData();
    return result;
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
    this.saveData();
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
    this.saveData();
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
    this.saveData();
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
    this.saveData();
    return true;
  }
}

export const storage = new MemStorage();
