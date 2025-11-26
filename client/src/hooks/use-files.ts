import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  filesApi,
  type CreateFileData,
  type CreateFolderData,
  type UpdateFileData,
} from "@/lib/api/files";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to fetch messages for a session
 */
export function useMessages(sessionId: string | null) {
  return useQuery({
    queryKey: sessionId
      ? queryKeys.messages.bySession(sessionId)
      : ["disabled"],
    queryFn: () =>
      sessionId ? filesApi.getMessages(sessionId) : Promise.reject(),
    enabled: !!sessionId,
  });
}

/**
 * Hook to create a new file
 */
export function useCreateFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: CreateFileData;
    }) => filesApi.create(sessionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.detail(variables.sessionId),
      });
      toast({
        title: "File created",
        description: "Your new file has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating file",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to create a new folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: CreateFolderData;
    }) => filesApi.createFolder(sessionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.detail(variables.sessionId),
      });
      toast({
        title: "Folder created",
        description: "Your new folder has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to update a file
 */
export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFileData }) =>
      filesApi.update(id, data),
    onSuccess: updatedFile => {
      // Invalidate session queries to refresh file list
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.detail(updatedFile.sessionId),
      });
    },
    onError: (error: Error) => {
      console.error("Error updating file:", error);
    },
  });
}

/**
 * Hook to delete a file
 */
export function useDeleteFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, sessionId }: { id: string; sessionId: string }) =>
      filesApi.delete(id).then(() => sessionId),
    onSuccess: sessionId => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.detail(sessionId),
      });
      toast({
        title: "File deleted",
        description: "The file has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting file",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
