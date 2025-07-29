import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { wsManager, ExecutionResult } from "@/lib/websocket";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type CollaborationPanelProps = {
  sessionId: number;
  participants: Array<{
    userId: number;
    username: string;
    isActive: boolean;
  }>;
  executionResult?: ExecutionResult;
};

type CollaborationRequest = {
  id: number;
  sessionId: number;
  fromUserId: number;
  status: string;
  createdAt: Date;
  username?: string;
};

type Message = {
  id: number;
  content: string;
  userId: number;
  username: string;
  createdAt: Date;
};

export function CollaborationPanel({
  sessionId,
  participants,
  executionResult,
}: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState("output");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch collaboration requests (only if current user is the session owner)
  const { data: sessionData } = useQuery<{
    session: { id: number; ownerId: number; };
  }>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!user && !!sessionId,
  });

  const isSessionOwner = sessionData?.session.ownerId === user?.id;

  // Fetch collaboration requests
  const { data: collaborationRequests = [], refetch: refetchRequests } =
    useQuery<CollaborationRequest[]>({
      queryKey: ["/api/sessions", sessionId, "collaboration-requests"],
      queryFn: async () => {
        const response = await apiRequest(
          "GET",
          `/api/sessions/${sessionId}/collaboration-requests?status=pending`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch collaboration requests");
        }
        return response.json();
      },
      enabled: !!isSessionOwner && !!sessionId,
    });

  // Handle request response (accept/reject)
  const handleRequestResponse = async (
    requestId: number,
    status: "accepted" | "rejected"
  ) => {
    try {
      const response = await apiRequest(
        "PATCH",
        `/api/collaboration-requests/${requestId}`,
        { status }
      );

      if (response.ok) {
        toast({
          title: `Request ${status}`,
          description: `The collaboration request has been ${status}.`,
        });

        // Refetch the collaboration requests
        refetchRequests();
      }
    } catch (error) {
      toast({
        title: "Failed to respond to request",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && activeTab === "chat") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Auto-scroll output when execution results change
  useEffect(() => {
    if (outputEndRef.current && activeTab === "output" && executionResult) {
      outputEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [executionResult, activeTab]);

  // Subscribe to chat messages from websocket
  useEffect(() => {
    const unsubscribe = wsManager.on("chat_message", (data) => {
      const sender = participants.find((p) => p.userId === data.message.userId);
      if (sender) {
        setMessages((prev) => [
          ...prev,
          {
            ...data.message,
            username: sender.username,
            createdAt: new Date(data.message.createdAt),
          },
        ]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [participants]);

  const sendMessage = () => {
    if (!newMessage.trim() || !user) return;

    wsManager.sendChatMessage(newMessage);
    setNewMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex-shrink-0 flex flex-col overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsList className="flex border-b border-gray-700 bg-transparent">
          <TabsTrigger
            value="output"
            className="flex-1 py-2 px-4 text-sm font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-foreground data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Output
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="flex-1 py-2 px-4 text-sm font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-foreground data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="people"
            className="flex-1 py-2 px-4 text-sm font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-foreground data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            People
          </TabsTrigger>
          {isSessionOwner && (
            <TabsTrigger
              value="requests"
              className="flex-1 py-2 px-4 text-sm font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-foreground data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none relative"
            >
              Requests
              {collaborationRequests.length > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-primary text-[10px]">
                  {collaborationRequests.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent
          value="output"
          className="flex-1 overflow-auto p-4 font-mono text-sm bg-gray-900"
        >
          {executionResult ? (
            <>
              {executionResult.logs.map((log, index) => (
                <div key={index} className="text-gray-300 whitespace-pre-wrap">
                  {log}
                </div>
              ))}

              {executionResult.error && (
                <div className="text-red-400 mt-2 whitespace-pre-wrap">
                  {executionResult.error}
                </div>
              )}

              {!executionResult.error && executionResult.output && (
                <div className="text-foreground mt-2 whitespace-pre-wrap">
                  {executionResult.output}
                </div>
              )}

              <div ref={outputEndRef} />
            </>
          ) : (
            <div className="text-gray-400 italic">
              Run your code to see output here
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="chat"
          className="flex-1 flex flex-col overflow-hidden bg-gray-900"
        >
          <div className="flex-1 overflow-auto p-4">
            {messages.length > 0 ? (
              messages.map((message, index) => {
                const isCurrentUser = user?.id === message.userId;

                return (
                  <div
                    key={index}
                    className={`mb-3 flex ${isCurrentUser ? "justify-end" : "justify-start"
                      }`}
                  >
                    {!isCurrentUser && (
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback className="bg-secondary text-xs">
                          {getInitials(message.username)}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-lg ${isCurrentUser
                        ? "bg-background text-foreground"
                        : "bg-gray-700 text-foreground"
                        }`}
                    >
                      {!isCurrentUser && (
                        <div className="text-xs text-gray-300 mb-1">
                          {message.username}
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                      <div className="text-xs mt-1 opacity-70">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-400 mt-4">
                No messages yet. Start the conversation!
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-700 bg-gray-800">
            <div className="flex space-x-2">
              <Input
                className="bg-gray-700 border-gray-600 text-foreground"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                className="shrink-0"
                size="sm"
                onClick={sendMessage}
                disabled={!newMessage.trim()}
              >
                <i className="ri-send-plane-fill"></i>
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="people"
          className="flex-1 overflow-auto p-4 bg-gray-900"
        >
          <div className="mb-4">
            <h3 className="text-sm font-medium text-foreground mb-2">
              Active Collaborators
            </h3>
            <div className="space-y-2">
              {participants
                .filter((p) => p.isActive)
                .map((participant) => (
                  <div
                    onClick={() => console.log(participant)}
                    key={participant.userId}
                    className="flex items-center py-2"
                  >
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback
                        className={`${participant.userId === user?.id
                          ? "bg-primary"
                          : "bg-secondary"
                          }`}
                      >
                        {getInitials(participant.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {participant.username}
                        {participant.userId === user?.id && " (You)"}
                      </div>
                      <div className="text-xs text-green-400 flex items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 mr-1"></span>
                        Online
                      </div>
                    </div>
                  </div>
                ))}

              {participants.filter((p) => p.isActive).length === 0 && (
                <div className="text-gray-400 text-sm italic">
                  No active collaborators
                </div>
              )}
            </div>
          </div>

          {participants.some((p) => !p.isActive) && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Inactive</h3>
              <div className="space-y-2">
                {participants
                  .filter((p) => !p.isActive)
                  .map((participant) => (
                    <div
                      key={participant.userId}
                      className="flex items-center py-2"
                    >
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarFallback className="bg-gray-600">
                          {getInitials(participant.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-300">
                          {participant.username}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-500 mr-1"></span>
                          Offline
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Requests Tab - only visible to session owner */}
        {isSessionOwner && (
          <TabsContent
            value="requests"
            className="flex-1 overflow-auto p-4 bg-gray-900"
          >
            <h3 className="text-sm font-medium text-foreground mb-4">
              Collaboration Requests
            </h3>

            {collaborationRequests.length > 0 ? (
              <div className="space-y-4">
                {collaborationRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                  >
                    <div className="flex items-center mb-2">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback>
                          {getInitials(
                            request.username || `User ${request.fromUserId}`
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {request.username || `User ${request.fromUserId}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge className="ml-auto" variant="secondary">
                        Pending
                      </Badge>
                    </div>

                    <div className="flex space-x-2 mt-3">
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full"
                        onClick={() =>
                          handleRequestResponse(request.id, "accepted")
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          handleRequestResponse(request.id, "rejected")
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 p-8">
                <i className="ri-user-add-line text-4xl mb-2"></i>
                <p>No collaboration requests yet</p>
                <p className="text-xs mt-1">
                  Requests will appear here when users want to join this project
                </p>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
