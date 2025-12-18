import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { collaborationApi } from "@/lib/api/collaboration";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to fetch collaboration requests for a session
 */
export function useCollaborationRequests(sessionId: string | null) {
  return useQuery({
    queryKey: sessionId
      ? queryKeys.collaborationRequests.bySession(sessionId)
      : ["disabled"],
    queryFn: () =>
      sessionId ? collaborationApi.getBySession(sessionId) : Promise.reject(),
    enabled: !!sessionId,
  });
}

/**
 * Hook to create a collaboration request
 */
export function useCreateCollaborationRequest() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (sessionId: string) =>
      collaborationApi.createRequest(sessionId),
    onSuccess: () => {
      toast({
        title: "Request sent",
        description:
          "Your collaboration request has been sent to the project owner.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to update a collaboration request (accept/reject)
 */
export function useUpdateCollaborationRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      status,
      sessionId,
    }: {
      id: string;
      status: "accepted" | "rejected";
      sessionId: string;
    }) => collaborationApi.updateRequest(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.collaborationRequests.bySession(
          variables.sessionId
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.detail(variables.sessionId),
      });
      toast({
        title: `Request ${variables.status}`,
        description: `The collaboration request has been ${variables.status}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating request",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
