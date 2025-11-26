import { useMutation } from "@tanstack/react-query";
import { executionApi, type ExecutionResult } from "@/lib/api/execution";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to execute code
 */
export function useExecuteCode() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ code, language }: { code: string; language: string }) =>
      executionApi.execute(code, language),
    onError: (error: Error) => {
      toast({
        title: "Execution failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export type { ExecutionResult };
