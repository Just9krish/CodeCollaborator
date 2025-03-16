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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Session, languages } from "@shared/schema";
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
            <Button onClick={openCreateDialog}>
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
              <Card className="bg-gray-800 border-gray-700 hover:border-primary transition-colors cursor-pointer" onClick={openCreateDialog}>
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
                          {session.isPublic ? (
                            <div className="flex items-center">
                              <Globe className="w-4 h-4 mr-1" />
                              Public
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Lock className="w-4 h-4 mr-1" />
                              Private
                            </div>
                          )}
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
                      <Button onClick={openCreateDialog}>
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
      
      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Project</DialogTitle>
            <DialogDescription className="text-gray-400">
              Set up a new coding project with your preferred settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input 
                id="project-name" 
                placeholder="My Awesome Project" 
                className="bg-gray-700 border-gray-600 text-white"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Programming Language</Label>
              <Select 
                value={projectLanguage} 
                onValueChange={(value) => setProjectLanguage(value)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 text-white">
                  {languages.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id} className="text-white hover:bg-gray-600">
                      <div className="flex items-center">
                        <i className={`${lang.icon} ${lang.iconColor} mr-2`}></i>
                        {lang.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="public-visibility" className="cursor-pointer">Project Visibility</Label>
              <div className="flex items-center space-x-2">
                <Label htmlFor="public-visibility" className="text-gray-400">
                  {isPublic ? (
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 mr-1" />
                      Public
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Lock className="w-4 h-4 mr-1" />
                      Private
                    </div>
                  )}
                </Label>
                <Switch 
                  id="public-visibility" 
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
            </div>
            
            {isPublic && (
              <div className="p-3 bg-blue-900/20 border border-blue-900/30 rounded-md text-sm text-blue-300">
                <div className="flex items-start">
                  <Globe className="w-4 h-4 mr-2 mt-0.5 text-blue-400" />
                  <div>
                    Public projects can be accessed by anyone with the link. Your code will be visible to all visitors.
                  </div>
                </div>
              </div>
            )}
            
            {!isPublic && (
              <div className="p-3 bg-orange-900/20 border border-orange-900/30 rounded-md text-sm text-orange-300">
                <div className="flex items-start">
                  <Lock className="w-4 h-4 mr-2 mt-0.5 text-orange-400" />
                  <div>
                    Private projects require collaboration requests for others to join. Only you can approve access.
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              className="bg-transparent hover:bg-gray-700 text-white border-gray-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSession}
              disabled={createSessionMutation.isPending}
              className="relative"
            >
              {createSessionMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Share URL Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Project Created!</DialogTitle>
            <DialogDescription className="text-gray-400">
              Your public project has been created successfully. Share this link with others to collaborate.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex items-center space-x-2">
              <Input
                ref={urlInputRef}
                readOnly
                value={sharingUrl}
                className="bg-gray-700 border-gray-600 text-white flex-1"
              />
              <Button 
                onClick={copyToClipboard} 
                variant="outline"
                className="bg-transparent hover:bg-gray-700 text-white border-gray-600"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-3 bg-blue-900/20 border border-blue-900/30 rounded-md text-sm text-blue-300">
              <div className="flex items-start">
                <Globe className="w-4 h-4 mr-2 mt-0.5 text-blue-400" />
                <div>
                  Anyone with this link can view and participate in this coding session. No approval needed.
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                setIsShareDialogOpen(false);
                if (newSessionId) {
                  navigate(`/playground/${newSessionId}`);
                }
              }}
            >
              Go to Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
