import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  text,
  boolean,
  timestamp,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  language: text("language").notNull().default("javascript"),
  isPublic: boolean("is_public").notNull().default(false), // Changed to private by default
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  name: true,
  ownerId: true,
  language: true,
  isPublic: true,
});

// Collaboration requests
export const collaborationRequests = pgTable("collaboration_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  content: text("content").notNull().default(""),
  isFolder: boolean("is_folder").notNull().default(false),
  parentId: uuid("parent_id"), // Self-reference for nesting - will be constrained later
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFileSchema = createInsertSchema(files).pick({
  name: true,
  content: true,
  isFolder: true,
  parentId: true,
  sessionId: true,
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
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

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id), // Recipient of the notification
  type: text("type").notNull(), // e.g., "collaboration_request", "request_accepted", "request_rejected", "session_invite", etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // Additional data like sessionId, fromUserId, etc.
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  message: true,
  data: true,
  isRead: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
