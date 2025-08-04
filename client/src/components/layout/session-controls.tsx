import { useState, useEffect } from "react";
import { LanguageSelector } from "@/components/editor/language-selector";
import { ActionButtons } from "@/components/editor/action-buttons";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { File } from "@shared/schema";
import { ExecutionResult } from "@/lib/websocket";

type SessionControlsProps = {
  sessionId: string;
  sessionName: string;
  language: string;
  onLanguageChange: (language: string) => void;
  activeFile: File;
  onExecute: (result: ExecutionResult) => void;
  isRunning: boolean;
};

export function SessionControls({
  sessionId,
  sessionName,
  language,
  onLanguageChange,
  activeFile,
  onExecute,
  isRunning,
}: SessionControlsProps) {
  const [name, setName] = useState(sessionName);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Update local state when session name prop changes
  useEffect(() => {
    setName(sessionName);
  }, [sessionName]);

  const handleNameChange = async () => {
    if (name === sessionName) {
      setIsEditing(false);
      return;
    }

    try {
      await apiRequest("PATCH", `/api/sessions/${sessionId}`, {
        name,
      });

      toast({
        title: "Session renamed",
        description: "Session name has been updated successfully.",
      });

      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Rename failed",
        description: "Failed to rename session. Please try again.",
        variant: "destructive",
      });

      // Reset to original name
      setName(sessionName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameChange();
    } else if (e.key === "Escape") {
      setName(sessionName);
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-background border-b border-border py-2 px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Session Info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <i className="ri-file-code-line text-muted-foreground mr-2"></i>
            {isEditing ? (
              <Input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={handleNameChange}
                onKeyDown={handleKeyDown}
                autoFocus
                className="bg-transparent border border-border hover:border-accent rounded px-2 py-1 text-sm font-medium focus:outline-none text-foreground h-auto w-auto"
              />
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-transparent border border-transparent hover:border-border rounded px-2 py-1 text-sm font-medium text-foreground"
              >
                {name || "Untitled Project"}
              </button>
            )}
          </div>

          <LanguageSelector
            currentLanguage={language}
            onSelect={onLanguageChange}
          />
        </div>

        {/* Action Buttons */}
        <ActionButtons
          sessionId={sessionId}
          sessionName={sessionName}
          activeFile={activeFile}
          language={language}
          onExecute={onExecute}
          isRunning={isRunning}
        />
      </div>
    </div>
  );
}
