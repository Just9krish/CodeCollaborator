import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { executeCode } from "./code-executor";
import { z } from "zod";
import {
  insertFileSchema,
  insertSessionSchema,
  insertMessageSchema,
  insertSessionParticipantSchema,
  languages
} from "@shared/schema";

// Type for WebSocket clients with session information
type ClientConnection = {
  ws: WebSocket;
  userId: number;
  sessionId: number | null;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Track client connections
  const clients = new Set<ClientConnection>();

  // Handle WebSocket connections
  wss.on("connection", (ws) => {
    const client: ClientConnection = { 
      ws, 
      userId: -1,  // Will be set when user joins session
      sessionId: null
    };
    
    clients.add(client);
    
    ws.on("message", async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        
        switch (message.type) {
          case "auth":
            client.userId = message.userId;
            break;
            
          case "join_session":
            // Store session ID and add user to participants
            client.sessionId = message.sessionId;
            
            if (client.userId > 0) {
              // Check if user is already a participant
              const participants = await storage.getSessionParticipants(message.sessionId);
              const existingParticipant = participants.find(p => p.userId === client.userId);
              
              if (existingParticipant) {
                // Update participant status to active
                await storage.updateParticipant(existingParticipant.id, { 
                  isActive: true,
                  cursor: message.cursor || existingParticipant.cursor
                });
              } else {
                // Add new participant
                await storage.addParticipant({
                  sessionId: message.sessionId,
                  userId: client.userId,
                  cursor: message.cursor || null,
                  isActive: true
                });
              }
              
              // Send active participants to all clients in the session
              broadcastToSession(message.sessionId, {
                type: "participants_update",
                participants: await storage.getSessionParticipants(message.sessionId, true)
              });
            }
            break;
            
          case "leave_session":
            if (client.sessionId && client.userId > 0) {
              await storage.removeParticipant(client.sessionId, client.userId);
              
              // Notify other clients
              broadcastToSession(client.sessionId, {
                type: "participants_update",
                participants: await storage.getSessionParticipants(client.sessionId, true)
              });
              
              client.sessionId = null;
            }
            break;
            
          case "cursor_update":
            if (client.sessionId && client.userId > 0) {
              // Find the participant and update cursor
              const participants = await storage.getSessionParticipants(client.sessionId);
              const participant = participants.find(p => p.userId === client.userId);
              
              if (participant) {
                await storage.updateParticipant(participant.id, { 
                  cursor: message.cursor
                });
                
                // Broadcast cursor position to other clients
                broadcastToSession(client.sessionId, {
                  type: "cursor_update",
                  userId: client.userId,
                  cursor: message.cursor
                }, client);
              }
            }
            break;
            
          case "code_change":
            if (client.sessionId) {
              // Update file content in storage
              const file = await storage.getFile(message.fileId);
              if (file) {
                await storage.updateFile(file.id, { content: message.content });
                
                // Broadcast changes to other clients
                broadcastToSession(client.sessionId, {
                  type: "code_change",
                  fileId: message.fileId,
                  content: message.content,
                  userId: client.userId
                }, client);
              }
            }
            break;
            
          case "chat_message":
            if (client.sessionId && client.userId > 0) {
              // Store message
              const newMessage = await storage.createMessage({
                content: message.content,
                userId: client.userId,
                sessionId: client.sessionId
              });
              
              // Broadcast message to all clients in the session
              broadcastToSession(client.sessionId, {
                type: "chat_message",
                message: newMessage
              });
            }
            break;
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });
    
    // Handle disconnection
    ws.on("close", async () => {
      if (client.sessionId && client.userId > 0) {
        // Mark the user as inactive in the session
        await storage.removeParticipant(client.sessionId, client.userId);
        
        // Notify other clients
        broadcastToSession(client.sessionId, {
          type: "participants_update",
          participants: await storage.getSessionParticipants(client.sessionId, true)
        });
      }
      
      clients.delete(client);
    });
  });
  
  // Helper function to broadcast messages to all clients in a session
  function broadcastToSession(sessionId: number, message: any, excludeClient?: ClientConnection) {
    for (const client of clients) {
      if (client.sessionId === sessionId && 
          client.ws.readyState === WebSocket.OPEN && 
          client !== excludeClient) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }
  
  // API Routes
  
  // Sessions
  app.get("/api/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const ownerId = req.query.mine === "true" ? req.user!.id : undefined;
      const sessions = await storage.getSessions(ownerId);
      return res.status(200).json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      return res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });
  
  app.post("/api/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const parsedBody = insertSessionSchema.safeParse(req.body);
      
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid session data" });
      }
      
      const session = await storage.createSession({
        ...parsedBody.data,
        ownerId: req.user!.id
      });
      
      // Create a default file for the session
      const defaultFile = await storage.createFile({
        name: "index.js",
        content: "// Write your code here\n",
        sessionId: session.id
      });
      
      return res.status(201).json({ session, files: [defaultFile] });
    } catch (error) {
      console.error("Error creating session:", error);
      return res.status(500).json({ message: "Failed to create session" });
    }
  });
  
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Get files for this session
      const files = await storage.getFilesBySession(sessionId);
      
      // Get participants
      const participants = await storage.getSessionParticipants(sessionId, true);
      
      return res.status(200).json({ session, files, participants });
    } catch (error) {
      console.error("Error fetching session:", error);
      return res.status(500).json({ message: "Failed to fetch session data" });
    }
  });
  
  app.patch("/api/sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to update this session" });
      }
      
      const updatedSession = await storage.updateSession(sessionId, req.body);
      return res.status(200).json(updatedSession);
    } catch (error) {
      console.error("Error updating session:", error);
      return res.status(500).json({ message: "Failed to update session" });
    }
  });
  
  // Files
  app.post("/api/sessions/:sessionId/files", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const sessionId = parseInt(req.params.sessionId);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const parsedBody = insertFileSchema.safeParse({
        ...req.body,
        sessionId
      });
      
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid file data" });
      }
      
      const file = await storage.createFile(parsedBody.data);
      
      // Notify clients about new file
      broadcastToSession(sessionId, {
        type: "file_created",
        file
      });
      
      return res.status(201).json(file);
    } catch (error) {
      console.error("Error creating file:", error);
      return res.status(500).json({ message: "Failed to create file" });
    }
  });
  
  app.patch("/api/files/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const updatedFile = await storage.updateFile(fileId, req.body);
      
      // Notify clients about file update
      if (updatedFile) {
        broadcastToSession(updatedFile.sessionId, {
          type: "file_updated",
          file: updatedFile
        });
      }
      
      return res.status(200).json(updatedFile);
    } catch (error) {
      console.error("Error updating file:", error);
      return res.status(500).json({ message: "Failed to update file" });
    }
  });
  
  app.delete("/api/files/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const sessionId = file.sessionId;
      const deleted = await storage.deleteFile(fileId);
      
      if (deleted) {
        // Notify clients about file deletion
        broadcastToSession(sessionId, {
          type: "file_deleted",
          fileId
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
  
  // Messages
  app.get("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const messages = await storage.getMessagesBySession(sessionId);
      return res.status(200).json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      return res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  
  // Code execution
  app.post("/api/execute", async (req, res) => {
    try {
      const { code, language } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: "Code and language are required" });
      }
      
      const supportedLanguage = languages.find(lang => lang.id === language);
      if (!supportedLanguage) {
        return res.status(400).json({ message: "Unsupported language" });
      }
      
      const result = await executeCode(code, language);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error executing code:", error);
      return res.status(500).json({ message: "Failed to execute code" });
    }
  });
  
  // Languages
  app.get("/api/languages", (_req, res) => {
    return res.status(200).json(languages);
  });

  return httpServer;
}
