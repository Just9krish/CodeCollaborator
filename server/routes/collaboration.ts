import { Router } from "express";
import { storage } from "../storage";
import { notificationService } from "../notification-service";

export function createCollaborationRoutes() {
  const router = Router();

  // Create a collaboration request
  router.post(
    "/sessions/:sessionId/collaboration-requests",
    async (req, res) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const sessionId = req.params.sessionId;
        const session = await storage.getSession(sessionId);

        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }

        if (session.isPublic) {
          return res.status(400).json({
            message: "Cannot request collaboration for public sessions",
          });
        }

        const existingRequests = await storage.getCollaborationRequestsByUser(
          req.user!.id
        );
        const existingRequest = existingRequests.find(
          r => r.sessionId === sessionId && r.status === "pending"
        );

        if (existingRequest) {
          return res.status(409).json({
            message: "You already have a pending request for this session",
          });
        }

        const request = await storage.createCollaborationRequest({
          sessionId,
          fromUserId: req.user!.id,
          status: "pending",
        });

        await notificationService.notifyCollaborationRequest(
          sessionId,
          req.user!.id,
          session.ownerId,
          session.name
        );

        return res.status(201).json(request);
      } catch (error) {
        console.error("Error creating collaboration request:", error);
        return res
          .status(500)
          .json({ message: "Failed to create collaboration request" });
      }
    }
  );

  // Get collaboration requests for a session
  router.get(
    "/sessions/:sessionId/collaboration-requests",
    async (req, res) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const sessionId = req.params.sessionId;
        const session = await storage.getSession(sessionId);

        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }

        if (session.ownerId !== req.user!.id) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const requests =
          await storage.getCollaborationRequestsBySession(sessionId);

        const requestsWithUsernames = await Promise.all(
          requests.map(async request => {
            const requester = await storage.getUser(request.fromUserId);
            return {
              ...request,
              username: requester?.username || `User ${request.fromUserId}`,
            };
          })
        );

        return res.status(200).json(requestsWithUsernames);
      } catch (error) {
        console.error("Error fetching collaboration requests:", error);
        return res
          .status(500)
          .json({ message: "Failed to fetch collaboration requests" });
      }
    }
  );

  // Update a collaboration request (accept/reject)
  router.patch("/collaboration-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const requestId = req.params.id;
      const request = await storage.getCollaborationRequest(requestId);

      if (!request) {
        return res
          .status(404)
          .json({ message: "Collaboration request not found" });
      }

      const session = await storage.getSession(request.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (session.ownerId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this request" });
      }

      const { status } = req.body;
      if (status !== "accepted" && status !== "rejected") {
        return res.status(400).json({ message: "Invalid status value" });
      }

      const updatedRequest = await storage.updateCollaborationRequest(
        requestId,
        { status }
      );

      if (status === "accepted") {
        const participants = await storage.getSessionParticipants(session.id);
        const existingParticipant = participants.find(
          p => p.userId === request.fromUserId
        );

        if (!existingParticipant) {
          await storage.addParticipant({
            sessionId: session.id,
            userId: request.fromUserId,
            isActive: false,
            cursor: null,
          });
        }
      }

      await notificationService.notifyRequestResponse(
        session.id,
        req.user!.id,
        request.fromUserId,
        status,
        session.name
      );

      return res.status(200).json(updatedRequest);
    } catch (error) {
      console.error("Error updating collaboration request:", error);
      return res
        .status(500)
        .json({ message: "Failed to update collaboration request" });
    }
  });

  return router;
}
