import { useRef, useState } from "react";
import { File } from "@shared/schema";
import { languages } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FileExplorerProps = {
  files: File[];
  activeFileId: number;
  sessionId: number;
  onFileSelect: (fileId: number) => void;
  onFileUpdated: () => void;
};

type FileItemProps = {
  file: File;
  isActive: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

function getFileIcon(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "js":
      return { icon: "ri-javascript-line", color: "text-yellow-400" };
    case "py":
      return { icon: "ri-python-line", color: "text-blue-400" };
    case "java":
      return { icon: "ri-code-s-slash-line", color: "text-orange-400" };
    case "cpp":
    case "c":
    case "h":
      return { icon: "ri-code-s-slash-line", color: "text-blue-500" };
    case "rb":
      return { icon: "ri-ruby-line", color: "text-red-500" };
    case "html":
      return { icon: "ri-html5-line", color: "text-orange-400" };
    case "css":
      return { icon: "ri-file-list-line", color: "text-blue-400" };
    case "json":
      return { icon: "ri-brackets-line", color: "text-yellow-300" };
    case "md":
      return { icon: "ri-markdown-line", color: "text-blue-300" };
    default:
      return { icon: "ri-file-code-line", color: "text-gray-400" };
  }
}

function FileItem({
  file,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: FileItemProps) {
  const { icon, color } = getFileIcon(file.name);

  return (
    <div
      className={`file-item group flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white ${isActive ? "bg-gray-800 text-white" : ""
        }`}
      onClick={onSelect}
    >
      <i className={`${icon} ${color} mr-2 text-sm`}></i>
      <span className="text-sm font-mono truncate flex-1">{file.name}</span>
      <div className="hidden group-hover:flex space-x-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="p-0.5 text-gray-400 hover:text-white rounded hover:bg-gray-700 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(file.name);
                }}
              >
                <i className="ri-pencil-line"></i>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Rename</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="p-0.5 text-gray-400 hover:text-white rounded hover:bg-gray-700 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <i className="ri-delete-bin-line"></i>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Delete</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export function FileExplorer({
  files,
  activeFileId,
  sessionId,
  onFileSelect,
  onFileUpdated,
}: FileExplorerProps) {
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isRenamingFile, setIsRenamingFile] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;

      try {
        await apiRequest("POST", `/api/sessions/${sessionId}/files`, {
          name: file.name,
          content: content, // File content as text
          sessionId,
        });

        toast({
          title: "File Uploaded",
          description: `${file.name} has been added.`,
        });

        onFileUpdated(); // Refresh file list
      } catch (error) {
        setError("Failed to upload file");
        console.error("Upload error:", error);
      }
    };

    reader.readAsText(file);
  };

  const handleCreateFile = async () => {
    if (!newFileName) {
      setError("File name is required");
      return;
    }

    try {
      await apiRequest("POST", `/api/sessions/${sessionId}/files`, {
        name: newFileName,
        content: "",
        sessionId,
      });

      toast({
        title: "File created",
        description: `${newFileName} has been created successfully.`,
      });

      setIsCreatingFile(false);
      setNewFileName("");
      setError(null);
      onFileUpdated();
    } catch (error) {
      setError("Failed to create file");
      console.error("Error creating file:", error);
    }
  };

  const handleRenameFile = async () => {
    if (!currentFile) return;

    if (!newFileName) {
      setError("File name is required");
      return;
    }

    try {
      await apiRequest("PATCH", `/api/files/${currentFile.id}`, {
        name: newFileName,
      });

      toast({
        title: "File renamed",
        description: `File has been renamed to ${newFileName}.`,
      });

      setIsRenamingFile(false);
      setNewFileName("");
      setCurrentFile(null);
      setError(null);
      onFileUpdated();
    } catch (error) {
      setError("Failed to rename file");
      console.error("Error renaming file:", error);
    }
  };

  const handleDeleteFile = async () => {
    if (!currentFile) return;

    try {
      await apiRequest("DELETE", `/api/files/${currentFile.id}`);

      toast({
        title: "File deleted",
        description: `${currentFile.name} has been deleted.`,
      });

      setIsDeletingFile(false);
      setCurrentFile(null);
      onFileUpdated();

      // If the deleted file was active, select another file
      if (currentFile.id === activeFileId && files.length > 1) {
        const otherFile = files.find((f) => f.id !== currentFile.id);
        if (otherFile) {
          onFileSelect(otherFile.id);
        }
      }
    } catch (error) {
      setError("Failed to delete file");
      console.error("Error deleting file:", error);
    }
  };

  return (
    <div className="py-2 px-1">
      {/* Hidden button for create file dialog */}
      <button
        id="create-file-button"
        className="hidden"
        onClick={() => setIsCreatingFile(true)}
      />

      <input
        id='upload-file-input'
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".js,.py,.java,.cpp,.c,.rb,.html,.css,.json,.md,.txt"
        onChange={handleFileUpload}
      />


      {files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          isActive={file.id === activeFileId}
          onSelect={() => onFileSelect(file.id)}
          onRename={(name) => {
            setCurrentFile(file);
            setNewFileName(name);
            setIsRenamingFile(true);
          }}
          onDelete={() => {
            setCurrentFile(file);
            setIsDeletingFile(true);
          }}
        />
      ))}

      {/* Create File Dialog */}
      <Dialog open={isCreatingFile} onOpenChange={setIsCreatingFile}>
        <DialogContent className="bg-gray-800 text-white border border-gray-700">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              className="bg-gray-900 border-gray-700 text-white"
              placeholder="File name (e.g. main.js)"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
            {error && (
              <Alert variant="destructive" className="mt-2 py-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreatingFile(false);
                setNewFileName("");
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename File Dialog */}
      <Dialog open={isRenamingFile} onOpenChange={setIsRenamingFile}>
        <DialogContent className="bg-gray-800 text-white border border-gray-700">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              className="bg-gray-900 border-gray-700 text-white"
              placeholder="New file name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
            {error && (
              <Alert variant="destructive" className="mt-2 py-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRenamingFile(false);
                setNewFileName("");
                setCurrentFile(null);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameFile}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete File Confirmation Dialog */}
      <Dialog open={isDeletingFile} onOpenChange={setIsDeletingFile}>
        <DialogContent className="bg-gray-800 text-white border border-gray-700">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete "{currentFile?.name}"?</p>
            <p className="text-sm text-gray-400 mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeletingFile(false);
                setCurrentFile(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFile}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
