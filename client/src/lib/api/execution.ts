import { apiRequest } from "../queryClient";

export interface ExecutionResult {
  output: string;
  error?: string;
  exitCode: number;
}

export const executionApi = {
  /**
   * Execute code
   */
  async execute(code: string, language: string): Promise<ExecutionResult> {
    const res = await apiRequest("POST", "/api/execute", { code, language });
    return res.json();
  },

  /**
   * Get supported languages
   */
  async getLanguages(): Promise<
    Array<{ id: string; name: string; icon: string; iconColor: string }>
  > {
    const res = await fetch("/api/languages", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch languages");
    return res.json();
  },
};
