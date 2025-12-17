/**
 * Query key factory for React Query
 * Centralizes all query keys for consistent cache management
 */
export const queryKeys = {
  // Auth queries
  auth: {
    user: ["/api/user"] as const,
  },

  // Session queries
  sessions: {
    all: ["/api/sessions"] as const,
    mine: () => ["/api/sessions", { mine: true }] as const,
    collaborations: () => ["/api/sessions", { collaborations: true }] as const,
    detail: (id: string) => ["/api/sessions", id] as const,
  },

  // File queries
  files: {
    bySession: (sessionId: string) =>
      ["/api/sessions", sessionId, "files"] as const,
  },

  // Message queries
  messages: {
    bySession: (sessionId: string) =>
      ["/api/sessions", sessionId, "messages"] as const,
  },

  // Collaboration request queries
  collaborationRequests: {
    bySession: (sessionId: string) =>
      ["/api/sessions", sessionId, "collaboration-requests"] as const,
    byUser: (userId: string) =>
      ["/api/collaboration-requests", { userId }] as const,
  },

  // Notification queries
  notifications: {
    all: ["/api/notifications"] as const,
    unreadCount: ["/api/notifications/unread-count"] as const,
  },

  // Language queries
  languages: {
    all: ["/api/languages"] as const,
  },
} as const;

/**
 * Helper to invalidate all session-related queries
 */
export function getSessionInvalidationKeys(sessionId?: string) {
  if (sessionId) {
    return [
      queryKeys.sessions.all,
      queryKeys.sessions.detail(sessionId),
      queryKeys.files.bySession(sessionId),
      queryKeys.messages.bySession(sessionId),
      queryKeys.collaborationRequests.bySession(sessionId),
    ];
  }
  return [queryKeys.sessions.all];
}

/**
 * Helper to invalidate all notification-related queries
 */
export function getNotificationInvalidationKeys() {
  return [queryKeys.notifications.all, queryKeys.notifications.unreadCount];
}
