import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface MobileControlsProps {
  showSidebar: boolean;
  showCollaborationPanel: boolean;
  isRunning: boolean;
  onToggleSidebar: () => void;
  onToggleCollaborationPanel: () => void;
  onRunCode: () => void;
}

export function MobileControls({
  showSidebar,
  showCollaborationPanel,
  isRunning,
  onToggleSidebar,
  onToggleCollaborationPanel,
  onRunCode,
}: MobileControlsProps) {
  return (
    <div className="md:hidden fixed bottom-4 right-4 flex space-x-2">
      <Button
        variant="default"
        size="icon"
        className="p-3 bg-card text-foreground rounded-full shadow-lg hover:bg-accent"
        onClick={onToggleSidebar}
      >
        <i className="ri-folder-line"></i>
      </Button>
      <Button
        variant="default"
        size="icon"
        className="p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90"
        onClick={onRunCode}
        disabled={isRunning}
      >
        {isRunning ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <i className="ri-play-fill"></i>
        )}
      </Button>
      <Button
        variant="default"
        size="icon"
        className="p-3 bg-card text-foreground rounded-full shadow-lg hover:bg-accent"
        onClick={onToggleCollaborationPanel}
      >
        <i className="ri-terminal-box-line"></i>
      </Button>
    </div>
  );
}
