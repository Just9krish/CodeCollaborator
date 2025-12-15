import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/hooks/use-sessions";
import { useCreateCollaborationRequest } from "@/hooks/use-collaboration";
import { useToast } from "@/hooks/use-toast";
import {
  wsManager,
  type CursorPosition,
  type ExecutionResult,
} from "@/lib/websocket";
import { generateUserColor } from "@/lib/language-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/query-keys";
import type { File } from "@shared/schema";

export interface EnhancedParticipant {
  id: string;
  userId: string;
  username: string;
  cursor: CursorPosition | null;
  isActive: boolean;
  color: string;
}

interface AccessError {
  requiresAuth?: boolean;
  requiresRequest?: boolean;
  sessionId?: string;
  ownerId?: string;
  message: string;
}

export function usePlayground() {
  const params = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const sessionId = params?.id ?? null;

  // State
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<File[]>([]);
  const [cursorPositions, setCursorPositions] = useState<
    Map<string, CursorPosition>
  >(new Map());
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(true);
  const [executionResult, setExecutionResult] = useState<
    ExecutionResult | undefined
  >();
  const [isRunning, setIsRunning] = useState(false);
  const [enhancedParticipants, setEnhancedParticipants] = useState<
    EnhancedParticipant[]
  >([]);
  const [accessError, setAccessError] = useState<AccessError | null>(null);

  const hasJoinedSession = useRef(false);

  // Query
  const {
    data: sessionData,
    isLoading,
    error,
    refetch,
  } = useSession(sessionId);

  // Map API error flags (requiresAuth / requiresRequest) into accessError
  useEffect(() => {
    if (!error) {
      setAccessError(null);
      return;
    }

    const err = error as any;

    if (err.requiresAuth || err.requiresRequest) {
      setAccessError({
        requiresAuth: err.requiresAuth,
        requiresRequest: err.requiresRequest,
        sessionId: err.sessionId,
        ownerId: err.ownerId,
        message: err.message,
      });
      return;
    }

    // For other errors, leave accessError null so generic ErrorView is used
    setAccessError(null);
  }, [error]);

  // Mutations
  const createCollaborationRequest = useCreateCollaborationRequest();

  // WebSocket connection
  useEffect(() => {
    wsManager.connect();
    if (user) {
      wsManager.setUser(user);
    }
    return () => {
      if (sessionId) {
        wsManager.leaveSession();
      }
    };
  }, [user, sessionId]);

  // Listen for collaboration request approval notifications
  useEffect(() => {
    if (!user || !sessionId) return;

    // Listen for collaboration request approval notifications
    const unsubscribeNotification = wsManager.on(
      "notification",
      (data: any) => {
        const notification = data.notification;
        if (
          notification?.type === "request_accepted" &&
          notification?.data?.sessionId === sessionId
        ) {
          // Request was accepted - refetch session data to get access
          refetch();
          setAccessError(null); // Clear access error
        }
      }
    );

    // Also listen for direct collaboration_request_approved event
    const unsubscribeApproved = wsManager.on(
      "collaboration_request_approved",
      (data: any) => {
        if (data.session?.id === sessionId) {
          refetch();
          setAccessError(null);
        }
      }
    );

    return () => {
      unsubscribeNotification();
      unsubscribeApproved();
    };
  }, [user, sessionId, refetch]);

  // Join session when data is available
  useEffect(() => {
    if (sessionData && user && sessionId && !hasJoinedSession.current) {
      wsManager.joinSession(sessionId);
      hasJoinedSession.current = true;
    }
  }, [sessionData, user, sessionId]);

  // Process participants
  useEffect(() => {
    if (sessionData?.participants) {
      const participants = sessionData.participants.map((p: any) => ({
        ...p,
        username: p.username || `User ${p.userId}`,
        cursor: cursorPositions.get(p.userId) || p.cursor,
        color: generateUserColor(p.username || `User ${p.userId}`),
      }));
      setEnhancedParticipants(participants);
    }
  }, [sessionData, cursorPositions]);

  // Set initial active file
  useEffect(() => {
    if (sessionData?.files && sessionData.files.length > 0 && !activeFileId) {
      setActiveFileId(sessionData.files[0].id);
      setOpenFiles([sessionData.files[0]]);
    }
  }, [sessionData, activeFileId]);

  // WebSocket event handlers
  useEffect(() => {
    const onCodeChange = (data: any) => {
      if (data.userId !== user?.id && data.fileId === activeFileId) {
        const fileIndex = openFiles.findIndex(f => f.id === data.fileId);
        if (fileIndex >= 0) {
          const updatedFiles = [...openFiles];
          updatedFiles[fileIndex] = {
            ...updatedFiles[fileIndex],
            content: data.content,
          };
          setOpenFiles(updatedFiles);
        }
      }
    };

    const onCursorUpdate = (data: any) => {
      if (data.userId !== user?.id) {
        setCursorPositions(prev => new Map(prev).set(data.userId, data.cursor));
      }
    };

    const onParticipantsUpdate = (data: any) => {
      if (sessionData) {
        const participants = data.participants.map((p: any) => ({
          ...p,
          username: p.username || `User ${p.userId}`,
          cursor: cursorPositions.get(p.userId) || p.cursor,
          color: generateUserColor(p.username || `User ${p.userId}`),
        }));
        setEnhancedParticipants(participants);
      }
    };

    const onFileCreated = () => refetch();
    const onFileUpdated = () => refetch();
    const onFileDeleted = (data: any) => {
      setOpenFiles(prev => prev.filter(f => f.id !== data.fileId));
      if (activeFileId === data.fileId && openFiles.length > 1) {
        const newActiveFile = openFiles.find(f => f.id !== data.fileId);
        if (newActiveFile) setActiveFileId(newActiveFile.id);
      }
      refetch();
    };

    const unsubscribers = [
      wsManager.on("code_change", onCodeChange),
      wsManager.on("cursor_update", onCursorUpdate),
      wsManager.on("participants_update", onParticipantsUpdate),
      wsManager.on("file_created", onFileCreated),
      wsManager.on("folder_created", onFileCreated),
      wsManager.on("file_updated", onFileUpdated),
      wsManager.on("file_deleted", onFileDeleted),
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, [
    sessionData,
    activeFileId,
    openFiles,
    cursorPositions,
    refetch,
    user?.id,
  ]);

  // File selection handlers
  const handleFileSelect = useCallback(
    (fileId: string) => {
      setActiveFileId(fileId);
      if (!openFiles.some(f => f.id === fileId) && sessionData) {
        const file = sessionData.files.find(f => f.id === fileId);
        if (file) setOpenFiles(prev => [...prev, file]);
      }
    },
    [openFiles, sessionData]
  );

  const handleSelectFileTab = useCallback((fileId: string) => {
    setActiveFileId(fileId);
  }, []);

  const handleCloseFileTab = useCallback(
    (fileId: string) => {
      setOpenFiles(prev => prev.filter(f => f.id !== fileId));
      if (activeFileId === fileId && openFiles.length > 1) {
        const newActiveFile = openFiles.find(f => f.id !== fileId);
        if (newActiveFile) setActiveFileId(newActiveFile.id);
      }
    },
    [activeFileId, openFiles]
  );

  // Code change handler
  const handleCodeChange = useCallback(
    (content: string) => {
      if (!activeFileId) return;
      const updatedFiles = openFiles.map(file =>
        file.id === activeFileId ? { ...file, content } : file
      );
      setOpenFiles(updatedFiles);
      wsManager.sendCodeChange(activeFileId, content);
    },
    [activeFileId, openFiles]
  );

  // Language change handler
  const handleLanguageChange = useCallback(
    async (language: string) => {
      if (!sessionData) return;
      try {
        await apiRequest("PATCH", `/api/sessions/${sessionData.session.id}`, {
          language,
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.detail(sessionData.session.id),
        });
        toast({
          title: "Language changed",
          description: `Language set to ${language}`,
        });
      } catch {
        toast({
          title: "Failed to change language",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    },
    [sessionData, toast]
  );

  // Code execution
  const handleExecute = useCallback((result: ExecutionResult) => {
    setExecutionResult(result);
    setIsRunning(false);
    setShowCollaborationPanel(true);
  }, []);

  const runCode = useCallback(async () => {
    if (!activeFileId || !sessionData) return;
    setIsRunning(true);
    try {
      const activeFile = openFiles.find(f => f.id === activeFileId);
      if (!activeFile) return;
      const response = await apiRequest("POST", "/api/execute", {
        code: activeFile.content,
        language: sessionData.session.language,
      });
      const result = await response.json();
      handleExecute(result);
    } catch {
      toast({
        title: "Execution failed",
        description: "Failed to execute code.",
        variant: "destructive",
      });
      setIsRunning(false);
    }
  }, [activeFileId, sessionData, openFiles, handleExecute, toast]);

  // Collaboration request
  const sendCollaborationRequest = useCallback(() => {
    if (accessError?.sessionId) {
      createCollaborationRequest.mutate(accessError.sessionId);
    }
  }, [accessError, createCollaborationRequest]);

  const activeFile = openFiles.find(f => f.id === activeFileId) || openFiles[0];

  return {
    // State
    sessionId,
    sessionData,
    isLoading,
    error,
    accessError,
    activeFile,
    activeFileId,
    openFiles,
    showSidebar,
    showCollaborationPanel,
    executionResult,
    isRunning,
    enhancedParticipants,

    // Actions
    setShowSidebar,
    setShowCollaborationPanel,
    handleFileSelect,
    handleSelectFileTab,
    handleCloseFileTab,
    handleCodeChange,
    handleLanguageChange,
    handleExecute,
    runCode,
    sendCollaborationRequest,
    refetch,
  };
}
