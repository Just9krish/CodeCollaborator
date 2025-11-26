import { apiRequest } from "../queryClient";
import type { CollaborationRequest } from "@shared/schema";

export interface CollaborationRequestWithUsername extends CollaborationRequest {
  username: string;
}

export const collaborationApi = {
  /**
   * Create a collaboration request for a session
   */
  async createRequest(sessionId: string): Promise<CollaborationRequest> {
    const res = await apiRequest(
      "POST",
      `/api/sessions/${sessionId}/collaboration-requests`,
      {}
    );
    return res.json();
  },

  /**
   * Get collaboration requests for a session (owner only)
   */
  async getBySession(
    sessionId: string
  ): Promise<CollaborationRequestWithUsername[]> {
    const res = await fetch(
      `/api/sessions/${sessionId}/collaboration-requests`,
      { credentials: "include" }
    );
    if (!res.ok) throw new Error("Failed to fetch collaboration requests");
    return res.json();
  },

  /**
   * Update a collaboration request (accept/reject)
   */
  async updateRequest(
    id: string,
    status: "accepted" | "rejected"
  ): Promise<CollaborationRequest> {
    const res = await apiRequest("PATCH", `/api/collaboration-requests/${id}`, {
      status,
    });
    return res.json();
  },
};
