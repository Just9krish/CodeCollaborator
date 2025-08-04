import { pgTable, serial, integer, text, timestamp, jsonb, boolean, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const collaborationRequests = pgTable("collaboration_requests", {
	id: serial().primaryKey().notNull(),
	sessionId: integer("session_id").notNull(),
	fromUserId: integer("from_user_id").notNull(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const files = pgTable("files", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	content: text().default(').notNull(),
	sessionId: integer("session_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
	id: serial().primaryKey().notNull(),
	content: text().notNull(),
	userId: integer("user_id").notNull(),
	sessionId: integer("session_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	data: jsonb(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const sessionParticipants = pgTable("session_participants", {
	id: serial().primaryKey().notNull(),
	sessionId: integer("session_id").notNull(),
	userId: integer("user_id").notNull(),
	cursor: jsonb(),
	isActive: boolean("is_active").default(true).notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	ownerId: integer("owner_id").notNull(),
	language: text().default('javascript').notNull(),
	isPublic: boolean("is_public").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	email: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
]);
