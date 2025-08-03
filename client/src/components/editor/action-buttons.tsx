import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { ExecutionResult } from "@/lib/websocket";
import { FaPlay, FaShareNodes, FaClipboard } from "react-icons/fa6";
import { FaSave, FaCodeBranch } from "react-icons/fa";

type ActionButtonsProps = {
  sessionId: string;
  sessionName: string;
  activeFile: { id: string; content: string; name: string };
  language: string;
  onExecute: (result: ExecutionResult) => void;
  isRunning: boolean;
};

export function ActionButtons({
  sessionId,
  sessionName,
  activeFile,
  language,
  onExecute,
  isRunning,
}: ActionButtonsProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const { toast } = useToast();

  const saveCode = async () => {
    try {
      await apiRequest("PATCH", `/api/files/${activeFile.id}`, {
        content: activeFile.content,
      });

      toast({
        title: "Code saved",
        description: "Your code has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const runCode = async () => {
    try {
      const response = await apiRequest("POST", "/api/execute", {
        code: activeFile.content,
        language,
      });

      const result = await response.json();
      onExecute(result);
    } catch (error) {
      toast({
        title: "Execution failed",
        description: "Failed to execute code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const forkProject = async () => {
    try {
      const response = await apiRequest("POST", "/api/sessions", {
        name: `Fork of ${sessionName}`,
        language,
        isPublic: true,
      });

      const { session, files } = await response.json();

      // Copy the content of the current file to the new session's default file
      if (files && files.length > 0) {
        await apiRequest("PATCH", `/api/files/${files[0].id}`, {
          content: activeFile.content,
        });
      }

      toast({
        title: "Project forked",
        description: "A copy of this project has been created in your account.",
      });

      // Redirect to the new session
      window.location.href = `/playground/${session.id}`;
    } catch (error) {
      toast({
        title: "Fork failed",
        description: "Failed to fork project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const shareProject = () => {
    // Generate shareable link
    const origin = window.location.origin;
    const link = `${origin}/playground/${sessionId}`;
    setShareableLink(link);
    setIsSharing(true);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    toast({
      title: "Link copied",
      description: "Shareable link has been copied to clipboard.",
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-1 text-sm text-gray-300 hover:text-foreground px-2 py-1 rounded"
              onClick={saveCode}
            >
              <FaSave />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Save code</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-1 text-sm text-gray-300 hover:text-foreground px-2 py-1 rounded"
              onClick={forkProject}
            >
              <FaCodeBranch />
              <span className="hidden sm:inline">Fork</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Create a copy of this project</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button
        size="sm"
        className="flex items-center space-x-1 text-sm bg-green-500 hover:bg-green-600 text-foreground px-2 py-1 rounded"
        onClick={runCode}
        disabled={isRunning}
      >
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaPlay />}
        <span>Run</span>
      </Button>

      <Button
        variant="secondary"
        size="sm"
        className="flex items-center space-x-1 text-sm text-foreground px-2 py-1 rounded"
        onClick={shareProject}
      >
        <FaShareNodes />
        <span className="hidden sm:inline">Share</span>
      </Button>

      <Dialog open={isSharing} onOpenChange={setIsSharing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Project</DialogTitle>
            <DialogDescription>
              Anyone with this link can access and collaborate on this project.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input value={shareableLink} readOnly />
            <Button onClick={copyLink}>
              <FaClipboard />
              Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
