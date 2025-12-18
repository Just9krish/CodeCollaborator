import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  sessionsApi,
  type CreateSessionData,
  type UpdateSessionData,
} from "@/lib/api/sessions";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to fetch all sessions (optionally filtered to user's own)
 */
export function useSessions(mine = false) {
  return useQuery({
    queryKey: mine ? queryKeys.sessions.mine() : queryKeys.sessions.all,
    queryFn: () => sessionsApi.getAll(mine),
  });
}

/**
 * Hook to fetch collaboration sessions (where user is participant but not owner)
 */
export function useCollaborationSessions() {
  return useQuery({
    queryKey: queryKeys.sessions.collaborations(),
    queryFn: () => sessionsApi.getCollaborations(),
  });
}

/**
 * Hook to fetch a specific session by ID
 */
export function useSession(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.sessions.detail(id) : ["disabled"],
    queryFn: () => (id ? sessionsApi.getById(id) : Promise.reject()),
    enabled: !!id,
    retry: false,
  });
}

/**
 * Hook to create a new session
 */
export function useCreateSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateSessionData) => sessionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      toast({
        title: "Project created",
        description: "Your new project has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to update a session
 */
export function useUpdateSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSessionData }) =>
      sessionsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.detail(variables.id),
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating project",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to delete a session
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => sessionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      toast({
        title: "Project deleted",
        description: "Your project has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
