import {
  User,
  InsertUser,
  Session,
  InsertSession,
  File,
  InsertFile,
  Message,
  InsertMessage,
  SessionParticipant,
  InsertSessionParticipant,
  CollaborationRequest,
  NewCollaborationRequest,
  Notification,
  InsertNotification,
} from "../shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Session operations
  getSession(id: string): Promise<Session | undefined>;
  getSessions(ownerId?: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(
    id: string,
    sessionData: Partial<InsertSession>
  ): Promise<Session | undefined>;
  deleteSession(id: string): Promise<boolean>;

  // File operations
  getFile(id: string): Promise<File | undefined>;
  getFilesBySession(sessionId: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(
    id: string,
    fileData: Partial<InsertFile>
  ): Promise<File | undefined>;
  deleteFile(id: string): Promise<boolean>;

  // Message operations
  getMessagesBySession(sessionId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Participant operations
  getSessionParticipants(
    sessionId: string,
    activeOnly?: boolean
  ): Promise<SessionParticipant[]>;
  addParticipant(
    participant: InsertSessionParticipant
  ): Promise<SessionParticipant>;
  updateParticipant(
    id: string,
    participantData: Partial<InsertSessionParticipant>
  ): Promise<SessionParticipant | undefined>;
  removeParticipant(sessionId: string, userId: string): Promise<boolean>;

  // Public sessions operations
  getPublicSessions(): Promise<Session[]>;

  // Collaboration request operations
  getCollaborationRequest(
    id: string
  ): Promise<CollaborationRequest | undefined>;
  getCollaborationRequestsByUser(
    userId: string
  ): Promise<CollaborationRequest[]>;
  getCollaborationRequestsBySession(
    sessionId: string
  ): Promise<CollaborationRequest[]>;
  createCollaborationRequest(request: {
    sessionId: string;
    fromUserId: string;
    status?: string;
  }): Promise<CollaborationRequest>;
  updateCollaborationRequest(
    id: string,
    requestData: Partial<{ status: string }>
  ): Promise<CollaborationRequest | undefined>;

  // Notification operations
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(
    id: string,
    notificationData: Partial<InsertNotification>
  ): Promise<Notification | undefined>;
  markNotificationAsRead(id: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
}

// Additional type definitions for the application
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SessionWithParticipants extends Session {
  participants: SessionParticipant[];
  files: File[];
  messageCount: number;
}

export interface UserWithSessions extends User {
  sessions: Session[];
  sessionCount: number;
}

export interface CollaborationRequestWithDetails extends CollaborationRequest {
  session: Session;
  fromUser: User;
}

export interface NotificationWithDetails extends Notification {
  relatedUser?: User;
  relatedSession?: Session;
}

// WebSocket event types
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: number;
}

export interface CodeChangeEvent extends WebSocketEvent {
  type: "code_change";
  data: {
    sessionId: string;
    fileId: string;
    content: string;
    userId: string;
    cursor?: {
      line: number;
      column: number;
    };
  };
}

export interface CursorUpdateEvent extends WebSocketEvent {
  type: "cursor_update";
  data: {
    sessionId: string;
    userId: string;
    cursor: {
      line: number;
      column: number;
      fileId: string;
    };
  };
}

export interface ParticipantJoinEvent extends WebSocketEvent {
  type: "participant_join";
  data: {
    sessionId: string;
    participant: SessionParticipant;
  };
}

export interface ParticipantLeaveEvent extends WebSocketEvent {
  type: "participant_leave";
  data: {
    sessionId: string;
    userId: string;
  };
}

export interface ChatMessageEvent extends WebSocketEvent {
  type: "chat_message";
  data: {
    sessionId: string;
    message: Message;
  };
}

// Route parameter types
export interface PlaygroundParams {
  id?: string;
  slug?: string;
}

export interface ProfileParams {
  userId?: string;
}

// Form types
export interface CreateSessionForm {
  name: string;
  language: string;
  isPublic: boolean;
}

export interface UpdateSessionForm {
  name?: string;
  language?: string;
  isPublic?: boolean;
}

export interface CreateFileForm {
  name: string;
  content: string;
  sessionId: string;
}

export interface SendMessageForm {
  content: string;
  sessionId: string;
}

export interface CollaborationRequestForm {
  sessionId: string;
  message?: string;
}
