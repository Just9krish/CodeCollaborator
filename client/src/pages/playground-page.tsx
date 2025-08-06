import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/layout/app-header";
import { SessionControls } from "@/components/layout/session-controls";
import { MonacoEditor } from "@/components/editor/monaco-editor";
import { FileExplorer } from "@/components/editor/file-explorer";
import { CollaborationPanel } from "@/components/editor/collaboration-panel";
import { Session, File, SessionParticipant, User } from "@shared/schema";
import {
  wsManager,
  type CursorPosition,
  type ExecutionResult,
} from "@/lib/websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createLoginUrl } from "@/lib/utils";

// Type definitions for session data
type SessionData = {
  session: Session;
  files: File[];
  participants: SessionParticipant[];
};

// Type for combined participant data
type EnhancedParticipant = {
  id: string;
  userId: string;
  username: string;
  cursor: CursorPosition | null;
  isActive: boolean;
  color: string;
};

export default function PlaygroundPage() {
  const params = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const sessionId = params?.id ? params.id : null;

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

  // Ref to track if we have already joined the session
  const hasJoinedSession = useRef(false);

  // State for auth/access errors
  const [accessError, setAccessError] = useState<{
    requiresAuth?: boolean;
    requiresRequest?: boolean;
    sessionId?: string;
    ownerId?: string;
    message: string;
  } | null>(null);

  // Fetch or create session
  const {
    data: sessionData,
    isLoading,
    error,
    refetch,
  } = useQuery<SessionData>({
    queryKey: ["/api/sessions", sessionId],
    queryFn: async () => {
      if (sessionId) {
        // Fetch existing session
        const response = await fetch(`/api/sessions/${sessionId}`);

        if (response.status === 401) {
          // Authentication required - user needs to login
          const data = await response.json();
          setAccessError({
            requiresAuth: true,
            sessionId: data.sessionId,
            message: "Authentication required to access this session",
          });
          throw new Error("Authentication required");
        }

        if (response.status === 403) {
          // Access denied - need to request collaboration
          const data = await response.json();
          setAccessError({
            requiresRequest: true,
            sessionId: data.sessionId,
            ownerId: data.ownerId,
            message: "You don't have access to this private session",
          });
          throw new Error("Access denied");
        }

        if (!response.ok) {
          throw new Error("Failed to fetch session");
        }

        return response.json();
      } else {
        // Create new session
        const response = await apiRequest("POST", "/api/sessions", {
          name: "Untitled Project",
          language: "javascript",
          isPublic: true,
          // ownerId is set by the server based on the authenticated user
        });
        return response.json();
      }
    },
    enabled: !!user,
    retry: false, // Don't retry on auth errors
  });

  // Create mutation for updating file content
  const updateFileMutation = useMutation({
    mutationFn: async ({
      fileId,
      content,
    }: {
      fileId: string;
      content: string;
    }) => {
      const response = await apiRequest("PATCH", `/api/files/${fileId}`, {
        content,
      });
      return response.json();
    },
  });

  // Connect to WebSocket
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
  }, [user]);

  // Join session when data is available
  useEffect(() => {
    if (sessionData && user && sessionId && !hasJoinedSession.current) {
      wsManager.joinSession(sessionId);
      hasJoinedSession.current = true;
    }
  }, [sessionData, user, sessionId]);

  // Process initial session data to set up enhanced participants
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

  // Set active file when session data changes
  useEffect(() => {
    if (sessionData?.files && sessionData.files.length > 0 && !activeFileId) {
      setActiveFileId(sessionData.files[0].id);
      setOpenFiles([sessionData.files[0]]);
    }
  }, [sessionData, activeFileId]);

  // Handle WebSocket messages
  useEffect(() => {
    const onCodeChange = (data: any) => {
      // Only update if change came from someone else
      if (data.userId !== user?.id && data.fileId === activeFileId) {
        // Find the file and update it
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
        setCursorPositions(prev => {
          const newMap = new Map(prev);
          newMap.set(data.userId, data.cursor);
          return newMap;
        });
      }
    };

    const onParticipantsUpdate = (data: any) => {
      if (sessionData) {
        // Update participants with cursor information
        const participants = data.participants.map((p: any) => {
          // The participant data now includes username from the server
          const username = p.username || `User ${p.userId}`;

          return {
            ...p,
            username,
            // Get cursor from our local map or from the participant data
            cursor: cursorPositions.get(p.userId) || p.cursor,
            // Generate a color based on user ID
            color: generateUserColor(username),
          };
        });

        setEnhancedParticipants(participants);
      }
    };

    const onFileCreated = () => {
      refetch();
    };

    const onFileUpdated = () => {
      refetch();
    };

    const onFileDeleted = (data: any) => {
      // Remove deleted file from open files
      setOpenFiles(prev => prev.filter(f => f.id !== data.fileId));

      // If the deleted file was the active file, select another file
      if (activeFileId === data.fileId && openFiles.length > 1) {
        const newActiveFile = openFiles.find(f => f.id !== data.fileId);
        if (newActiveFile) {
          setActiveFileId(newActiveFile.id);
        }
      }

      refetch();
    };

    // Register WebSocket event handlers
    const unsubscribeCodeChange = wsManager.on("code_change", onCodeChange);
    const unsubscribeCursorUpdate = wsManager.on(
      "cursor_update",
      onCursorUpdate
    );
    const unsubscribeParticipantsUpdate = wsManager.on(
      "participants_update",
      onParticipantsUpdate
    );
    const unsubscribeFileCreated = wsManager.on("file_created", onFileCreated);
    const unsubscribeFolderCreated = wsManager.on(
      "folder_created",
      onFileCreated
    ); // Treat folder as file for now
    const unsubscribeFileUpdated = wsManager.on("file_updated", onFileUpdated);
    const unsubscribeFileDeleted = wsManager.on("file_deleted", onFileDeleted);

    return () => {
      unsubscribeCodeChange();
      unsubscribeCursorUpdate();
      unsubscribeParticipantsUpdate();
      unsubscribeFileCreated();
      unsubscribeFolderCreated();
      unsubscribeFileUpdated();
      unsubscribeFileDeleted();
    };
  }, [
    sessionData,
    activeFileId,
    openFiles,
    cursorPositions,
    refetch,
    user?.id,
  ]);

  useEffect(() => {
    const onRequestUpdate = (data: any) => {
      // Handle the incoming request update event
      toast({
        title: "Collaboration Request Updated",
        description: `User ${data.userId} has ${
          data.status === "approved" ? "joined" : "been rejected"
        } the session.`,
      });

      // Refresh session data to reflect the latest participants
      refetch();
    };

    // Register WebSocket event handler
    const unsubscribeRequestUpdate = wsManager.on(
      "request_update",
      onRequestUpdate
    );

    return () => {
      // Cleanup event listener when the component unmounts
      unsubscribeRequestUpdate();
    };
  }, [refetch]);

  // Handle file selection
  const handleFileSelect = (fileId: string) => {
    setActiveFileId(fileId);

    // Add to open files if not already open
    if (!openFiles.some(f => f.id === fileId) && sessionData) {
      const file = sessionData.files.find(f => f.id === fileId);
      if (file) {
        setOpenFiles(prev => [...prev, file]);
      }
    }
  };

  // Handle file tab selection
  const handleSelectFileTab = (fileId: string) => {
    setActiveFileId(fileId);
  };

  // Handle file tab close
  const handleCloseFileTab = (fileId: string) => {
    // Remove from open files
    setOpenFiles(prev => prev.filter(f => f.id !== fileId));

    // If this was the active file, select another file
    if (activeFileId === fileId && openFiles.length > 1) {
      const newActiveFile = openFiles.find(f => f.id !== fileId);
      if (newActiveFile) {
        setActiveFileId(newActiveFile.id);
      }
    }
  };

  // Handle code changes
  const handleCodeChange = (content: string) => {
    if (!activeFileId) return;

    // Update the local state
    const updatedFiles = openFiles.map(file =>
      file.id === activeFileId ? { ...file, content } : file
    );
    setOpenFiles(updatedFiles);

    // Send to server via WebSocket
    wsManager.sendCodeChange(activeFileId, content);
  };

  // Handle language change
  const handleLanguageChange = (language: string) => {
    if (!sessionData) return;

    apiRequest("PATCH", `/api/sessions/${sessionData.session.id}`, {
      language,
    })
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: ["/api/sessions", sessionId],
        });
        toast({
          title: "Language changed",
          description: `Language set to ${language}`,
        });
      })
      .catch(error => {
        toast({
          title: "Failed to change language",
          description: "Please try again.",
          variant: "destructive",
        });
      });
  };

  // Handle code execution
  const handleExecute = (result: ExecutionResult) => {
    setExecutionResult(result);
    setIsRunning(false);

    // Switch to output tab in the collaboration panel
    setShowCollaborationPanel(true);
  };

  // Run code
  const runCode = async () => {
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
    } catch (error) {
      toast({
        title: "Execution failed",
        description: "Failed to execute code. Please try again.",
        variant: "destructive",
      });
      setIsRunning(false);
    }
  };

  // Generate user colors for collaboration
  const generateUserColor = (username: string) => {
    const colors = [
      "#4F46E5", // Indigo
      "#10B981", // Green
      "#F59E0B", // Amber
      "#EF4444", // Red
      "#8B5CF6", // Purple
      "#EC4899", // Pink
      "#06B6D4", // Cyan
    ];

    const hash = Array.from(username).reduce(
      (acc, char) => acc + char.charCodeAt(0),
      0
    );

    return colors[hash % colors.length];
  };

  // If loading, show loader
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handle collaboration request sending
  const sendCollaborationRequest = async () => {
    if (!accessError?.sessionId) return;

    try {
      const response = await apiRequest(
        "POST",
        `/api/sessions/${accessError.sessionId}/collaboration-requests`,
        {}
      );

      if (response.ok) {
        toast({
          title: "Request sent",
          description:
            "Your collaboration request has been sent to the project owner.",
        });
      }
    } catch (error) {
      toast({
        title: "Request failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send collaboration request",
        variant: "destructive",
      });
    }
  };

  // If authentication required, show login prompt
  if (accessError?.requiresAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="text-amber-500 text-6xl mb-4">
          <i className="ri-lock-line"></i>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Authentication Required
        </h1>
        <p className="text-muted-foreground mb-6">
          You need to log in to access this private project. Your session will
          be saved and you'll be redirected back after login.
        </p>
        <div className="space-y-4">
          <Button
            onClick={() => {
              // Save current URL to query parameter to redirect back after login
              const redirectUrl = createLoginUrl(window.location.pathname);
              window.location.href = redirectUrl;
            }}
          >
            Log In
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // If access denied (requires a request), show collaboration request UI
  if (accessError?.requiresRequest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="text-amber-500 text-6xl mb-4">
          <i className="ri-team-line"></i>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Private Project
        </h1>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          This is a private project. You need to request access from the owner.
          Once your request is approved, you'll be able to collaborate on this
          project.
        </p>
        <div className="space-y-4">
          <Button onClick={sendCollaborationRequest}>
            <i className="ri-user-add-line mr-2"></i>
            Request Collaboration Access
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Handle general errors
  if (error || !sessionData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="text-destructive text-6xl mb-4">
          <i className="ri-error-warning-line"></i>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Failed to load playground
        </h1>
        <p className="text-muted-foreground mb-6">
          {error instanceof Error
            ? error.message
            : "An unexpected error occurred"}
        </p>
        <Button onClick={() => (window.location.href = "/")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  // Get the active file
  const activeFile = openFiles.find(f => f.id === activeFileId) || openFiles[0];

  return (
    <div className="min-h-svh flex flex-col bg-background">
      {/* Session Controls */}
      <SessionControls
        sessionId={sessionData.session.id}
        sessionName={sessionData.session.name}
        language={sessionData.session.language}
        onLanguageChange={handleLanguageChange}
        activeFile={activeFile}
        onExecute={handleExecute}
        isRunning={isRunning}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (File Explorer) */}
        <div
          className={`w-56 bg-card border-r border-border flex-shrink-0 overflow-auto ${
            showSidebar ? "block" : "hidden"
          } md:block`}
        >
          {/* File Explorer */}
          <FileExplorer
            files={sessionData.files}
            activeFileId={activeFileId || ""}
            sessionId={sessionData.session.id}
            onFileSelect={handleFileSelect}
            onFileUpdated={() => refetch()}
          />
        </div>

        {/* Editor Panel */}
        <div className="flex-grow flex flex-col bg-background overflow-hidden">
          {/* Tabbed file navigation */}
          <div className="bg-muted border-b border-border flex overflow-x-auto hide-scrollbar">
            {openFiles.map(file => (
              <div
                key={file.id}
                className={`px-3 py-2 flex items-center border-r border-border cursor-pointer ${
                  file.id === activeFileId
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => handleSelectFileTab(file.id)}
              >
                <i
                  className={`${getFileIcon(file.name).icon} ${
                    getFileIcon(file.name).color
                  } mr-2 text-sm`}
                ></i>
                <span className="text-sm font-mono">{file.name}</span>
                <button
                  className="ml-2 text-muted-foreground hover:text-foreground"
                  onClick={e => {
                    e.stopPropagation();
                    handleCloseFileTab(file.id);
                  }}
                >
                  <i className="ri-close-line text-xs"></i>
                </button>
              </div>
            ))}
          </div>

          {/* Code editor area */}
          <div className="flex-grow relative overflow-hidden">
            {activeFile ? (
              <MonacoEditor
                value={activeFile.content}
                language={sessionData.session.language}
                fileId={activeFile.id}
                onChange={handleCodeChange}
                participants={enhancedParticipants}
              />
            ) : (
              <div className="p-4 text-muted-foreground">
                No file selected. Create or select a file to start coding.
              </div>
            )}
          </div>
        </div>

        {/* Collaboration Panel */}
        {showCollaborationPanel && (
          <CollaborationPanel
            sessionId={sessionData.session.id}
            participants={enhancedParticipants}
            executionResult={executionResult}
          />
        )}
      </div>

      {/* Mobile controls */}
      <div className="md:hidden fixed bottom-4 right-4 flex space-x-2">
        <Button
          variant="default"
          size="icon"
          className="p-3 bg-card text-foreground rounded-full shadow-lg hover:bg-accent"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <i className="ri-folder-line"></i>
        </Button>
        <Button
          variant="default"
          size="icon"
          className="p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90"
          onClick={runCode}
          disabled={isRunning}
        >
          {isRunning ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <i className="ri-play-fill"></i>
          )}
        </Button>
        <Button
          variant="default"
          size="icon"
          className="p-3 bg-card text-foreground rounded-full shadow-lg hover:bg-accent"
          onClick={() => setShowCollaborationPanel(!showCollaborationPanel)}
        >
          <i className="ri-terminal-box-line"></i>
        </Button>
      </div>
    </div>
  );
}

// Helpers
function getFileIcon(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "js":
      return { icon: "ri-javascript-line", color: "text-yellow-400" };
    case "py":
      return { icon: "ri-python-line", color: "text-blue-400" };
    case "java":
      return { icon: "ri-code-s-slash-line", color: "text-orange-400" };
    case "cpp":
    case "c":
    case "h":
      return { icon: "ri-code-s-slash-line", color: "text-blue-500" };
    case "rb":
      return { icon: "ri-ruby-line", color: "text-red-500" };
    case "html":
      return { icon: "ri-html5-line", color: "text-orange-400" };
    case "css":
      return { icon: "ri-file-list-line", color: "text-blue-400" };
    case "json":
      return { icon: "ri-brackets-line", color: "text-yellow-300" };
    case "md":
      return { icon: "ri-markdown-line", color: "text-blue-300" };
    default:
      return { icon: "ri-file-code-line", color: "text-muted-foreground" };
  }
}
