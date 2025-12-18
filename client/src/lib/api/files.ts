import { apiRequest } from "../queryClient";
import type { File, Message } from "@shared/schema";

export interface CreateFileData {
  name: string;
  content?: string;
  parentId?: string;
}

export interface CreateFolderData {
  name: string;
  parentId?: string;
}

export interface UpdateFileData {
  name?: string;
  content?: string;
  parentId?: string;
}

export const filesApi = {
  /**
   * Create a new file in a session
   */
  async create(sessionId: string, data: CreateFileData): Promise<File> {
    const res = await apiRequest(
      "POST",
      `/api/sessions/${sessionId}/files`,
      data
    );
    return res.json();
  },

  /**
   * Create a new folder in a session
   */
  async createFolder(sessionId: string, data: CreateFolderData): Promise<File> {
    const res = await apiRequest(
      "POST",
      `/api/sessions/${sessionId}/folders`,
      data
    );
    return res.json();
  },

  /**
   * Update a file
   */
  async update(id: string, data: UpdateFileData): Promise<File> {
    const res = await apiRequest("PATCH", `/api/files/${id}`, data);
    return res.json();
  },

  /**
   * Delete a file
   */
  async delete(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/files/${id}`);
  },

  /**
   * Get messages for a session
   */
  async getMessages(sessionId: string): Promise<Message[]> {
    const res = await fetch(`/api/sessions/${sessionId}/messages`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch messages");
    return res.json();
  },
};
