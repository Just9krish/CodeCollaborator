import { Router } from "express";
import { storage } from "../storage";
import { insertSessionSchema } from "@shared/schema";
import type { BroadcastFunction } from "./types";

export function createSessionRoutes(broadcastToSession: BroadcastFunction) {
  const router = Router();

  // Get all sessions (optionally filtered by owner or collaborations)
  router.get("/", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Check if requesting collaboration sessions
      if (req.query.collaborations === "true") {
        const sessions = await storage.getCollaborationSessions(req.user!.id);
        return res.status(200).json(sessions);
      }

      // Otherwise, get sessions by owner
      const ownerId = req.query.mine === "true" ? req.user!.id : undefined;
      const sessions = await storage.getSessions(ownerId);
      return res.status(200).json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      return res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Create a new session
  router.post("/", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const createSessionSchema = insertSessionSchema.omit({ ownerId: true });
      const parsedBody = createSessionSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid session data" });
      }

      const session = await storage.createSession({
        ...parsedBody.data,
        ownerId: req.user!.id,
      });

      // Create a default file for the session
      const defaultFile = await storage.createFile({
        name: "index.js",
        content: "// Write your code here\n",
        sessionId: session.id,
      });

      return res.status(201).json({ session, files: [defaultFile] });
    } catch (error) {
      console.error("Error creating session:", error);
      return res.status(500).json({ message: "Failed to create session" });
    }
  });

  // Get a specific session by ID
  router.get("/:id", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if the user has access to this session
      if (!session.isPublic) {
        if (!req.isAuthenticated()) {
          return res.status(401).json({
            message: "Authentication required",
            requiresAuth: true,
            sessionId: session.id,
          });
        }

        if (session.ownerId !== req.user!.id) {
          const participants = await storage.getSessionParticipants(sessionId);
          const isParticipant = participants.some(
            p => p.userId === req.user!.id
          );

          if (!isParticipant) {
            const requests = await storage.getCollaborationRequestsByUser(
              req.user!.id
            );
            const hasAccess = requests.some(
              r => r.sessionId === sessionId && r.status === "accepted"
            );

            if (!hasAccess) {
              return res.status(403).json({
                message: "You don't have access to this session",
                requiresRequest: true,
                sessionId: session.id,
                ownerId: session.ownerId,
              });
            }
          }
        }
      }

      const files = await storage.getFilesBySession(sessionId);
      const participants = await storage.getSessionParticipantsWithUsers(
        sessionId,
        false
      );

      return res.status(200).json({ session, files, participants });
    } catch (error) {
      console.error("Error fetching session:", error);
      return res.status(500).json({ message: "Failed to fetch session data" });
    }
  });

  // Update a session
  router.patch("/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const sessionId = req.params.id;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (session.ownerId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this session" });
      }

      const updatedSession = await storage.updateSession(sessionId, req.body);
      return res.status(200).json(updatedSession);
    } catch (error) {
      console.error("Error updating session:", error);
      return res.status(500).json({ message: "Failed to update session" });
    }
  });

  // Delete a session
  router.delete("/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const sessionId = req.params.id;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (session.ownerId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to delete this session" });
      }

      await storage.deleteSession(sessionId);

      broadcastToSession(sessionId, {
        type: "session_deleted",
        sessionId,
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting session:", error);
      return res.status(500).json({ message: "Failed to delete session" });
    }
  });

  return router;
}
