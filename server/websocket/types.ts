import type { WebSocket } from "ws";

// Type for WebSocket clients with session information
export interface ClientConnection {
  ws: WebSocket;
  userId: string;
  sessionId: string | null;
}

// WebSocket message types
export interface AuthMessage {
  type: "auth";
  userId: string;
}

export interface JoinSessionMessage {
  type: "join_session";
  sessionId: string;
  cursor?: CursorPosition | null;
}

export interface LeaveSessionMessage {
  type: "leave_session";
}

export interface CursorUpdateMessage {
  type: "cursor_update";
  cursor: CursorPosition;
}

export interface CodeChangeMessage {
  type: "code_change";
  fileId: string;
  content: string;
}

export interface ChatMessage {
  type: "chat_message";
  content: string;
}

export interface CollaborationRequestSentMessage {
  type: "collaboration_request_sent";
  ownerId: string;
  request: any;
}

export interface CollaborationRequestApprovedMessage {
  type: "collaboration_request_approved";
  userId: string;
  session: any;
}

export type CursorPosition = {
  line: number;
  column: number;
  fileId: string;
};

export type WebSocketMessage =
  | AuthMessage
  | JoinSessionMessage
  | LeaveSessionMessage
  | CursorUpdateMessage
  | CodeChangeMessage
  | ChatMessage
  | CollaborationRequestSentMessage
  | CollaborationRequestApprovedMessage;

// Broadcast function types
export type BroadcastToSessionFn = (
  sessionId: string,
  message: any,
  excludeClient?: ClientConnection
) => void;

export type BroadcastToUserFn = (userId: string, message: any) => void;
