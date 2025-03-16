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
} from "../shared/schema";

export interface IStorage {
    // User operations
    getUser(id: number): Promise<User | undefined>;
    getUserByUsername(username: string): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;

    // Session operations
    getSession(id: number): Promise<Session | undefined>;
    getSessions(ownerId?: number): Promise<Session[]>;
    createSession(session: InsertSession): Promise<Session>;
    updateSession(
        id: number,
        sessionData: Partial<InsertSession>
    ): Promise<Session | undefined>;
    deleteSession(id: number): Promise<boolean>;

    // File operations
    getFile(id: number): Promise<File | undefined>;
    getFilesBySession(sessionId: number): Promise<File[]>;
    createFile(file: InsertFile): Promise<File>;
    updateFile(
        id: number,
        fileData: Partial<InsertFile>
    ): Promise<File | undefined>;
    deleteFile(id: number): Promise<boolean>;

    // Message operations
    getMessagesBySession(sessionId: number): Promise<Message[]>;
    createMessage(message: InsertMessage): Promise<Message>;

    // Participant operations
    getSessionParticipants(
        sessionId: number,
        activeOnly?: boolean
    ): Promise<SessionParticipant[]>;
    addParticipant(
        participant: InsertSessionParticipant
    ): Promise<SessionParticipant>;
    updateParticipant(
        id: number,
        participantData: Partial<InsertSessionParticipant>
    ): Promise<SessionParticipant | undefined>;
    removeParticipant(sessionId: number, userId: number): Promise<boolean>;

    // Public sessions operations
    getPublicSessions(): Promise<Session[]>;

    // Collaboration request operations
    getCollaborationRequest(
        id: number
    ): Promise<CollaborationRequest | undefined>;
    getCollaborationRequestsByUser(
        userId: number
    ): Promise<CollaborationRequest[]>;
    getCollaborationRequestsBySession(
        sessionId: number
    ): Promise<CollaborationRequest[]>;
    createCollaborationRequest(request: {
        sessionId: number;
        fromUserId: number;
        status?: string;
    }): Promise<CollaborationRequest>;
    updateCollaborationRequest(
        id: number,
        requestData: Partial<{ status: string; }>
    ): Promise<CollaborationRequest | undefined>;
}
