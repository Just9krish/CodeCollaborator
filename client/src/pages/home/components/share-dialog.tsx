import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sharingUrl: string;
  onNavigate: () => void;
}

export function ShareDialog({
  open,
  onOpenChange,
  sharingUrl,
  onNavigate,
}: ShareDialogProps) {
  const urlInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const copyToClipboard = () => {
    if (urlInputRef.current) {
      urlInputRef.current.select();
      document.execCommand("copy");
      toast({
        title: "URL copied to clipboard",
        description: "Share this link with your collaborators",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Project Created!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Your public project has been created successfully. Share this link
            with others to collaborate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center space-x-2">
            <Input
              ref={urlInputRef}
              readOnly
              value={sharingUrl}
              className="bg-muted border-border text-foreground flex-1"
            />
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="bg-transparent hover:bg-accent text-foreground border-border"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-3 bg-primary/10 border border-primary/20 rounded-md text-sm text-primary-foreground">
            <div className="flex items-start">
              <Globe className="w-4 h-4 mr-2 mt-0.5 text-primary" />
              <div>
                Anyone with this link can view and participate in this coding
                session. No approval needed.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onNavigate}>Go to Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
