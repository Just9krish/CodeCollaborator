import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull(),
  language: text("language").notNull().default("javascript"),
  isPublic: boolean("is_public").notNull().default(false), // Changed to private by default
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  name: true,
  ownerId: true,
  language: true,
  isPublic: true,
});

// Collaboration requests
export const collaborationRequests = pgTable("collaboration_requests", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  fromUserId: integer("from_user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Type for selecting data from the table
export type CollaborationRequest = InferSelectModel<
  typeof collaborationRequests
>;

// Type for inserting data into the table
export type NewCollaborationRequest = InferInsertModel<
  typeof collaborationRequests
>;

export const insertCollaborationRequestSchema = createInsertSchema(
  collaborationRequests
).pick({
  sessionId: true,
  fromUserId: true,
  status: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull().default(""),
  sessionId: integer("session_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFileSchema = createInsertSchema(files).pick({
  name: true,
  content: true,
  sessionId: true,
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").notNull(),
  sessionId: integer("session_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  userId: true,
  sessionId: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const languages = [
  {
    id: "javascript",
    name: "JavaScript",
    icon: "ri-javascript-line",
    iconColor: "text-yellow-400",
  },
  {
    id: "python",
    name: "Python",
    icon: "ri-python-line",
    iconColor: "text-blue-400",
  },
  {
    id: "java",
    name: "Java",
    icon: "ri-code-s-slash-line",
    iconColor: "text-orange-400",
  },
  {
    id: "cpp",
    name: "C++",
    icon: "ri-code-s-slash-line",
    iconColor: "text-blue-500",
  },
  { id: "ruby", name: "Ruby", icon: "ri-ruby-line", iconColor: "text-red-500" },
];

export const sessionParticipants = pgTable("session_participants", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  userId: integer("user_id").notNull(),
  cursor: jsonb("cursor"),
  isActive: boolean("is_active").notNull().default(true),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const insertSessionParticipantSchema = createInsertSchema(
  sessionParticipants
).pick({
  sessionId: true,
  userId: true,
  cursor: true,
  isActive: true,
});

export type InsertSessionParticipant = z.infer<
  typeof insertSessionParticipantSchema
>;
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
