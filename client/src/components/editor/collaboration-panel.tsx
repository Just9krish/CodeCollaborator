import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { wsManager } from "@/lib/websocket";
import { User } from "@shared/schema";
import { ExecutionResult } from "@/lib/websocket";

type CollaborationPanelProps = {
  sessionId: number;
  participants: Array<{
    userId: number;
    username: string;
    isActive: boolean;
  }>;
  executionResult?: ExecutionResult;
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
  executionResult
}: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState("output");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
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
      const sender = participants.find(p => p.userId === data.message.userId);
      if (sender) {
        setMessages(prev => [...prev, {
          ...data.message,
          username: sender.username,
          createdAt: new Date(data.message.createdAt)
        }]);
      }
    });
    
    return () => unsubscribe();
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
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex-shrink-0 flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="flex border-b border-gray-700 bg-transparent">
          <TabsTrigger
            value="output"
            className="flex-1 py-2 px-4 text-sm font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Output
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="flex-1 py-2 px-4 text-sm font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="people"
            className="flex-1 py-2 px-4 text-sm font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-white data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            People
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="output" className="flex-1 overflow-auto p-4 font-mono text-sm bg-gray-900">
          {executionResult ? (
            <>
              {executionResult.logs.map((log, index) => (
                <div key={index} className="text-gray-300 whitespace-pre-wrap">{log}</div>
              ))}
              
              {executionResult.error && (
                <div className="text-red-400 mt-2 whitespace-pre-wrap">{executionResult.error}</div>
              )}
              
              {!executionResult.error && executionResult.output && (
                <div className="text-white mt-2 whitespace-pre-wrap">{executionResult.output}</div>
              )}
              
              <div ref={outputEndRef} />
            </>
          ) : (
            <div className="text-gray-400 italic">Run your code to see output here</div>
          )}
        </TabsContent>
        
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden bg-gray-900">
          <div className="flex-1 overflow-auto p-4">
            {messages.length > 0 ? (
              messages.map((message, index) => {
                const isCurrentUser = user?.id === message.userId;
                
                return (
                  <div
                    key={index}
                    className={`mb-3 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isCurrentUser && (
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback className="bg-secondary text-xs">
                          {getInitials(message.username)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-lg ${
                        isCurrentUser
                          ? 'bg-primary text-white'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      {!isCurrentUser && (
                        <div className="text-xs text-gray-300 mb-1">{message.username}</div>
                      )}
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs mt-1 opacity-70">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                className="bg-gray-700 border-gray-600 text-white"
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
        
        <TabsContent value="people" className="flex-1 overflow-auto p-4 bg-gray-900">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-white mb-2">Active Collaborators</h3>
            <div className="space-y-2">
              {participants
                .filter(p => p.isActive)
                .map(participant => (
                  <div key={participant.userId} className="flex items-center py-2">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback className={`${
                        participant.userId === user?.id ? 'bg-primary' : 'bg-secondary'
                      }`}>
                        {getInitials(participant.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-white">
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
              
              {participants.filter(p => p.isActive).length === 0 && (
                <div className="text-gray-400 text-sm italic">No active collaborators</div>
              )}
            </div>
          </div>
          
          {participants.some(p => !p.isActive) && (
            <div>
              <h3 className="text-sm font-medium text-white mb-2">Inactive</h3>
              <div className="space-y-2">
                {participants
                  .filter(p => !p.isActive)
                  .map(participant => (
                    <div key={participant.userId} className="flex items-center py-2">
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
      </Tabs>
    </div>
  );
}
