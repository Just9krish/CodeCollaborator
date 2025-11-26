import { Router } from "express";
import { storage } from "../storage";
import { insertFileSchema } from "@shared/schema";
import type { BroadcastFunction } from "./types";

export function createFileRoutes(broadcastToSession: BroadcastFunction) {
  const router = Router();

  // Create a new file in a session
  router.post("/sessions/:sessionId/files", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const sessionId = req.params.sessionId;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const parsedBody = insertFileSchema.safeParse({
        ...req.body,
        sessionId,
      });

      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid file data" });
      }

      const file = await storage.createFile(parsedBody.data);

      broadcastToSession(sessionId, {
        type: "file_created",
        file,
      });

      return res.status(201).json(file);
    } catch (error) {
      console.error("Error creating file:", error);
      return res.status(500).json({ message: "Failed to create file" });
    }
  });

  // Create a new folder in a session
  router.post("/sessions/:sessionId/folders", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const sessionId = req.params.sessionId;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const { name, parentId } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Folder name is required" });
      }

      const folder = await storage.createFolder({
        name,
        sessionId,
        parentId: parentId || undefined,
      });

      broadcastToSession(sessionId, {
        type: "folder_created",
        folder,
      });

      return res.status(201).json(folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      return res.status(500).json({ message: "Failed to create folder" });
    }
  });

  // Update a file
  router.patch("/files/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const fileId = req.params.id;
      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const updatedFile = await storage.updateFile(fileId, req.body);

      if (updatedFile) {
        broadcastToSession(updatedFile.sessionId, {
          type: "file_updated",
          file: updatedFile,
        });
      }

      return res.status(200).json(updatedFile);
    } catch (error) {
      console.error("Error updating file:", error);
      return res.status(500).json({ message: "Failed to update file" });
    }
  });

  // Delete a file
  router.delete("/files/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const fileId = req.params.id;
      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const sessionId = file.sessionId;
      const deleted = await storage.deleteFile(fileId);

      if (deleted) {
        broadcastToSession(sessionId, {
          type: "file_deleted",
          fileId,
        });

        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ message: "Failed to delete file" });
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      return res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Get messages for a session
  router.get("/sessions/:sessionId/messages", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const messages = await storage.getMessagesBySession(sessionId);
      return res.status(200).json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      return res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  return router;
}
