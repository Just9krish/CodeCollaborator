import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Globe, Lock } from "lucide-react";
import { languages } from "@shared/schema";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    isPublic: boolean;
    language: string;
  }) => void;
  isPending: boolean;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [language, setLanguage] = useState("javascript");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name, isPublic, language });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setName("");
      setIsPublic(false);
      setLanguage("javascript");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] text-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Create New Project
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set up a new coding project with your preferred settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="My Awesome Project"
              className="border-border text-foreground"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Programming Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="border-border text-foreground">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent className="border-border text-foreground">
                {languages.map(lang => (
                  <SelectItem
                    key={lang.id}
                    value={lang.id}
                    className="text-foreground hover:bg-muted-foreground/10"
                  >
                    <div className="flex items-center">
                      <i className={`${lang.icon} ${lang.iconColor} mr-2`}></i>
                      {lang.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="public-visibility" className="cursor-pointer">
              Project Visibility
            </Label>
            <div className="flex items-center space-x-2">
              <Label
                htmlFor="public-visibility"
                className={
                  isPublic ? "text-primary" : "text-secondary-foreground"
                }
              >
                {isPublic ? (
                  <div className="flex items-center">
                    <Globe className="w-4 h-4 mr-1" />
                    Public
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Lock className="w-4 h-4 mr-1" />
                    Private
                  </div>
                )}
              </Label>
              <Switch
                id="public-visibility"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </div>

          {isPublic && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-md text-sm text-primary">
              <div className="flex items-start">
                <Globe className="size-5 mr-2 mt-0.5 text-primary" />
                <div>
                  Public projects can be accessed by anyone with the link. Your
                  code will be visible to all visitors.
                </div>
              </div>
            </div>
          )}

          {!isPublic && (
            <div className="p-3 bg-secondary/50 border border-secondary/30 rounded-md text-sm text-secondary-foreground">
              <div className="flex items-start">
                <Lock className="size-5 mr-2 mt-0.5 text-secondary-foreground" />
                <div>
                  Private projects require collaboration requests for others to
                  join. Only you can approve access.
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="bg-transparent hover:bg-accent text-foreground border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            className="relative"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
