import { Router } from "express";
import { storage } from "../storage";

export function createNotificationRoutes() {
  const router = Router();

  // Get all notifications for the current user
  router.get("/", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const notifications = await storage.getNotifications(req.user!.id);
      return res.status(200).json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  router.get("/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const count = await storage.getUnreadNotificationCount(req.user!.id);
      return res.status(200).json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      return res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Mark a notification as read
  router.patch("/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const notificationId = req.params.id;
      const notification = await storage.getNotification(notificationId);

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      if (notification.userId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this notification" });
      }

      const updatedNotification =
        await storage.markNotificationAsRead(notificationId);
      return res.status(200).json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return res
        .status(500)
        .json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  router.patch("/read-all", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      await storage.markAllNotificationsAsRead(req.user!.id);
      return res
        .status(200)
        .json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return res
        .status(500)
        .json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Delete a notification
  router.delete("/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const notificationId = req.params.id;
      const notification = await storage.getNotification(notificationId);

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      if (notification.userId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to delete this notification" });
      }

      const success = await storage.deleteNotification(notificationId);
      if (success) {
        return res.status(200).json({ message: "Notification deleted" });
      } else {
        return res
          .status(500)
          .json({ message: "Failed to delete notification" });
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      return res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  return router;
}
