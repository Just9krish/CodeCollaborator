import { apiRequest } from "../queryClient";
import type { Session, File, SessionParticipant } from "@shared/schema";

export interface CreateSessionData {
  name: string;
  language: string;
  isPublic: boolean;
}

export interface UpdateSessionData {
  name?: string;
  language?: string;
  isPublic?: boolean;
}

export interface SessionResponse {
  session: Session;
  files: File[];
  participants?: SessionParticipant[];
}

export const sessionsApi = {
  /**
   * Get all sessions (optionally filtered to user's own sessions)
   */
  async getAll(mine = false): Promise<Session[]> {
    const url = mine ? "/api/sessions?mine=true" : "/api/sessions";
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch sessions");
    return res.json();
  },

  /**
   * Get sessions where user is a collaborator (participant but not owner)
   */
  async getCollaborations(): Promise<Session[]> {
    const res = await fetch("/api/sessions?collaborations=true", {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch collaboration sessions");
    return res.json();
  },

  /**
   * Get a specific session by ID
   */
  async getById(id: string): Promise<SessionResponse> {
    const res = await fetch(`/api/sessions/${id}`, { credentials: "include" });

    if (res.status === 401) {
      const data = await res.json();
      throw Object.assign(new Error("Authentication required"), {
        requiresAuth: true,
        sessionId: data.sessionId,
      });
    }

    if (res.status === 403) {
      const data = await res.json();
      throw Object.assign(new Error("Access denied"), {
        requiresRequest: true,
        sessionId: data.sessionId,
        ownerId: data.ownerId,
      });
    }

    if (!res.ok) throw new Error("Failed to fetch session");
    return res.json();
  },

  /**
   * Create a new session
   */
  async create(data: CreateSessionData): Promise<SessionResponse> {
    const res = await apiRequest("POST", "/api/sessions", data);
    return res.json();
  },

  /**
   * Update a session
   */
  async update(id: string, data: UpdateSessionData): Promise<Session> {
    const res = await apiRequest("PATCH", `/api/sessions/${id}`, data);
    return res.json();
  },

  /**
   * Delete a session
   */
  async delete(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/sessions/${id}`);
  },
};
