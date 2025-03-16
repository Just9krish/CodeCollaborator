import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Session } from "@shared/schema";
import { Loader2, Copy, Globe, Lock } from "lucide-react";
import { wsManager } from "@/lib/websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [projectLanguage, setProjectLanguage] = useState("javascript");
  const [newSessionId, setNewSessionId] = useState<number | null>(null);
  const [sharingUrl, setSharingUrl] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch user's sessions
  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const response = await fetch("/api/sessions?mine=true");
      if (!response.ok) throw new Error("Failed to fetch sessions");
      return response.json();
    },
    enabled: !!user,
  });
  
  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: { name: string; isPublic: boolean; language: string }) => {
      if (!user) throw new Error("User not authenticated");
      
      const response = await apiRequest("POST", "/api/sessions", {
        ...sessionData,
        ownerId: user.id
      });
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      
      setNewSessionId(data.id);
      const url = `${window.location.origin}/playground/${data.id}`;
      setSharingUrl(url);
      
      setIsCreateDialogOpen(false);
      if (data.isPublic) {
        setIsShareDialogOpen(true);
      } else {
        navigate(`/playground/${data.id}`);
      }
    },
    onError: (error) => {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Connect to WebSocket when the page loads
  useEffect(() => {
    wsManager.connect();
    
    // Update WebSocket with user information when available
    if (user) {
      wsManager.setUser(user);
    }
    
    return () => {
      // No need to disconnect as we may navigate to playground
    };
  }, [user]);
  
  const openCreateDialog = () => {
    setNewProjectName("");
    setIsPublic(false);
    setProjectLanguage("javascript");
    setIsCreateDialogOpen(true);
  };
  
  const handleCreateSession = () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a name for your project",
        variant: "destructive"
      });
      return;
    }
    
    createSessionMutation.mutate({
      name: newProjectName,
      isPublic,
      language: projectLanguage
    });
  };
  
  const copyToClipboard = () => {
    if (urlInputRef.current) {
      urlInputRef.current.select();
      document.execCommand('copy');
      
      toast({
        title: "URL copied to clipboard",
        description: "Share this link with your collaborators",
      });
    }
  };
  
  // Format date to a readable string
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <div className="min-h-screen bg-dark flex flex-col">
      <AppHeader />
      
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Your Projects</h1>
            <Button onClick={createNewSession}>
              <i className="ri-add-line mr-1"></i>
              New Project
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Create New Project Card */}
              <Card className="bg-gray-800 border-gray-700 hover:border-primary transition-colors cursor-pointer" onClick={createNewSession}>
                <CardContent className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <div className="flex justify-center">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <i className="ri-add-line text-2xl text-primary"></i>
                      </div>
                    </div>
                    <h3 className="mt-4 text-xl font-medium text-white">Create New Project</h3>
                    <p className="mt-2 text-sm text-gray-400">Start a fresh coding session</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Existing Projects */}
              {sessions && sessions.map((session) => (
                <Link to={`/playground/${session.id}`} key={session.id}>
                  <Card className="bg-gray-800 border-gray-700 hover:border-primary transition-colors cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white">{session.name || "Untitled Project"}</CardTitle>
                      <CardDescription className="flex items-center text-gray-400">
                        <i className={`${getLanguageIcon(session.language)} mr-1.5`}></i>
                        {getLanguageName(session.language)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-gray-300">
                      <p className="text-sm">Last edited {formatDate(session.createdAt)}</p>
                    </CardContent>
                    <CardFooter className="pt-2 border-t border-gray-700">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center text-gray-400 text-sm">
                          <i className="ri-eye-line mr-1"></i>
                          {session.isPublic ? "Public" : "Private"}
                        </div>
                        <Button variant="ghost" size="sm" className="text-primary">
                          <i className="ri-arrow-right-line"></i>
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
              
              {sessions && sessions.length === 0 && (
                <Card className="bg-gray-800 border-gray-700 col-span-full">
                  <CardContent className="p-8 text-center">
                    <i className="ri-inbox-line text-4xl text-gray-500 mb-4"></i>
                    <h3 className="text-xl font-medium text-white">No projects yet</h3>
                    <p className="mt-2 text-gray-400">
                      Create your first coding project to get started.
                    </p>
                    <div className="mt-6">
                      <Button onClick={createNewSession}>
                        <i className="ri-add-line mr-1"></i>
                        Create Project
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Helper functions for language icons and names
function getLanguageIcon(language: string): string {
  switch (language) {
    case 'javascript':
      return 'ri-javascript-line text-yellow-400';
    case 'python':
      return 'ri-python-line text-blue-400';
    case 'java':
      return 'ri-code-s-slash-line text-orange-400';
    case 'cpp':
      return 'ri-code-s-slash-line text-blue-500';
    case 'ruby':
      return 'ri-ruby-line text-red-500';
    default:
      return 'ri-code-line text-gray-400';
  }
}

function getLanguageName(language: string): string {
  switch (language) {
    case 'javascript':
      return 'JavaScript';
    case 'python':
      return 'Python';
    case 'java':
      return 'Java';
    case 'cpp':
      return 'C++';
    case 'ruby':
      return 'Ruby';
    default:
      return language.charAt(0).toUpperCase() + language.slice(1);
  }
}
