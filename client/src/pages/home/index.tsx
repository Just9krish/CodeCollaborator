import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useSessions,
  useCreateSession,
  useDeleteSession,
  useCollaborationSessions,
} from "@/hooks/use-sessions";
import { wsManager } from "@/lib/websocket";
import {
  ProjectCard,
  CreateProjectCard,
  CreateProjectDialog,
  ShareDialog,
  DeleteConfirmationDialog,
} from "./components";

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Session state
  const [newSessionId, setNewSessionId] = useState<string | null>(null);
  const [sharingUrl, setSharingUrl] = useState("");
  const [sessionIdToDelete, setSessionIdToDelete] = useState<string | null>(
    null
  );

  // Queries and mutations
  const { data: sessions, isLoading } = useSessions(true);
  const { data: collaborationSessions } = useCollaborationSessions();
  const createSessionMutation = useCreateSession();
  const deleteSessionMutation = useDeleteSession();

  // Connect to WebSocket when the page loads
  useEffect(() => {
    wsManager.connect();
    if (user) {
      wsManager.setUser(user);
    }
  }, [user]);

  const handleCreateSession = (data: {
    name: string;
    isPublic: boolean;
    language: string;
  }) => {
    createSessionMutation.mutate(data, {
      onSuccess: response => {
        setNewSessionId(response.session.id);
        const url = `${window.location.origin}/playground/${response.session.id}`;
        setSharingUrl(url);
        setIsCreateDialogOpen(false);

        if (data.isPublic) {
          setIsShareDialogOpen(true);
        } else {
          navigate(`/playground/${response.session.id}`);
        }
      },
    });
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessionIdToDelete(sessionId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (sessionIdToDelete) {
      deleteSessionMutation.mutate(sessionIdToDelete, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSessionIdToDelete(null);
        },
      });
    }
  };

  const handleNavigateToProject = () => {
    setIsShareDialogOpen(false);
    if (newSessionId) {
      navigate(`/playground/${newSessionId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              Your Projects
            </h1>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sessions && sessions.length === 0 ? (
            <Card className="border-border col-span-full mt-20">
              <CardContent className="p-8 text-center">
                <i className="ri-inbox-line text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-xl font-medium text-foreground">
                  No projects yet
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Create your first coding project to get started.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <i className="ri-add-line mr-1"></i>
                    Create Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CreateProjectCard onClick={() => setIsCreateDialogOpen(true)} />
              {sessions?.map(session => (
                <ProjectCard
                  key={session.id}
                  session={session}
                  onDelete={handleDeleteSession}
                  showDelete={true}
                />
              ))}
            </div>
          )}

          {/* Collaboration Projects Section - Only show if there are collaboration sessions */}
          {collaborationSessions && collaborationSessions.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-6 mt-12">
                <h2 className="text-2xl font-bold text-foreground">
                  Collaboration Projects
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collaborationSessions.map(session => (
                  <ProjectCard
                    key={session.id}
                    session={session}
                    showDelete={false}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateSession}
        isPending={createSessionMutation.isPending}
      />

      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        sharingUrl={sharingUrl}
        onNavigate={handleNavigateToProject}
      />

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
