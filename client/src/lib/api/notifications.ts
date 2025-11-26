import { apiRequest } from "../queryClient";
import type { Notification } from "@shared/schema";

export const notificationsApi = {
  /**
   * Get all notifications for the current user
   */
  async getAll(): Promise<Notification[]> {
    const res = await fetch("/api/notifications", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch notifications");
    return res.json();
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const res = await fetch("/api/notifications/unread-count", {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch unread count");
    const data = await res.json();
    return data.count;
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<void> {
    await apiRequest("PATCH", `/api/notifications/${id}/read`, {});
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await apiRequest("PATCH", "/api/notifications/read-all", {});
  },

  /**
   * Delete a notification
   */
  async delete(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/notifications/${id}`);
  },
};
