// Re-export types from websocket module to avoid duplication
export type {
  ClientConnection,
  BroadcastToSessionFn as BroadcastFunction,
  BroadcastToUserFn as BroadcastToUserFunction,
} from "../websocket/types";
