import { useRef, useState } from "react";
import { File } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Folder,
  FolderOpen,
} from "lucide-react";

type FileExplorerProps = {
  files: File[];
  activeFileId: string;
  sessionId: string;
  onFileSelect: (fileId: string) => void;
  onFileUpdated: () => void;
};

type FileTreeItem = File & {
  isFolder?: boolean;
  parentId?: string | null;
  children: FileTreeItem[];
  depth: number;
};

type FileItemProps = {
  file: File;
  isActive: boolean;
  isExpanded?: boolean;
  onSelect: () => void;
  onToggleExpanded?: () => void;
  onCreateFile?: (parentId: string) => void;
  onCreateFolder?: (parentId: string) => void;
  onUploadFile?: (parentId: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

function buildFileTree(files: File[]): FileTreeItem[] {
  const fileMap = new Map<string, FileTreeItem>();
  const rootItems: FileTreeItem[] = [];

  // First pass: create all items
  files.forEach(file => {
    // @ts-ignore - temporary until schema is fully updated
    const isFolder = file.isFolder || false;
    // @ts-ignore - temporary until schema is fully updated
    const parentId = file.parentId || null;

    const item: FileTreeItem = {
      ...file,
      isFolder,
      parentId,
      children: [],
      depth: 0,
    };
    fileMap.set(file.id, item);
  });

  // Second pass: build the tree structure
  files.forEach(file => {
    const item = fileMap.get(file.id)!;
    // @ts-ignore - temporary until schema is fully updated
    const parentId = file.parentId;

    if (parentId) {
      const parent = fileMap.get(parentId);
      if (parent) {
        parent.children.push(item);
        item.depth = parent.depth + 1;
      } else {
        // Parent not found, treat as root
        rootItems.push(item);
      }
    } else {
      rootItems.push(item);
    }
  });

  // Sort children within each folder (folders first, then files)
  const sortItems = (items: FileTreeItem[]) => {
    items.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });

    items.forEach(item => {
      if (item.children.length > 0) {
        sortItems(item.children);
      }
    });
  };

  sortItems(rootItems);
  return rootItems;
}

function getFileIcon(
  fileName: string,
  isFolder: boolean = false,
  isExpanded: boolean = false
) {
  if (isFolder) {
    return {
      icon: isExpanded ? "ri-folder-open-line" : "ri-folder-line",
      color: "text-blue-400",
    };
  }

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
      return { icon: "ri-file-code-line", color: "text-muted-foreground" };
  }
}

function FileItem({
  file,
  isActive,
  isExpanded,
  onSelect,
  onToggleExpanded,
  onCreateFile,
  onCreateFolder,
  onUploadFile,
  onRename,
  onDelete,
}: FileItemProps) {
  // @ts-ignore - temporary until schema is fully updated
  const isFolder = file.isFolder || false;
  const { icon, color } = getFileIcon(file.name, isFolder, isExpanded);

  const handleSelect = () => {
    if (isFolder) {
      onToggleExpanded?.();
    } else {
      onSelect();
    }
  };

  const FileContextMenu = () => (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => onRename(file.name)}>
        <i className="ri-pencil-line mr-2 text-sm"></i>
        Rename
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onDelete()}>
        <i className="ri-delete-bin-line mr-2 text-sm"></i>
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  );

  const FolderContextMenu = () => (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => onCreateFile?.(file.id)}>
        <i className="ri-file-add-line mr-2 text-sm"></i>
        New File
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onCreateFolder?.(file.id)}>
        <Folder className="mr-2 h-4 w-4" />
        New Folder
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => onUploadFile?.(file.id)}>
        <i className="ri-upload-line mr-2 text-sm"></i>
        Upload File
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => onRename(file.name)}>
        <i className="ri-pencil-line mr-2 text-sm"></i>
        Rename
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onDelete()}>
        <i className="ri-delete-bin-line mr-2 text-sm"></i>
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`file-item group flex items-center py-1 px-2 rounded cursor-pointer hover:bg-accent text-muted-foreground hover:text-foreground ${
            isActive ? "bg-accent text-foreground" : ""
          }`}
          onClick={handleSelect}
        >
          {isFolder && (
            <div className="mr-1">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </div>
          )}
          <i className={`${icon} ${color} mr-2 text-sm`}></i>
          <span className="text-sm font-mono truncate flex-1">{file.name}</span>
        </div>
      </ContextMenuTrigger>
      {isFolder ? <FolderContextMenu /> : <FileContextMenu />}
    </ContextMenu>
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
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isRenamingFile, setIsRenamingFile] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Build file tree
  const fileTree = buildFileTree(files);

  // Render tree recursively
  const renderTreeItems = (items: FileTreeItem[]): JSX.Element[] => {
    const result: JSX.Element[] = [];

    items.forEach(item => {
      // @ts-ignore - temporary until schema is fully updated
      const isFolder = item.isFolder || false;
      const isExpanded = expandedFolders.has(item.id);

      result.push(
        <div key={item.id} style={{ paddingLeft: `${item.depth * 16}px` }}>
          <FileItem
            file={item}
            isActive={item.id === activeFileId}
            isExpanded={isExpanded}
            onSelect={() => {
              if (!isFolder) {
                onFileSelect(item.id);
              }
            }}
            onToggleExpanded={() => {
              if (isFolder) {
                const newExpanded = new Set(expandedFolders);
                if (isExpanded) {
                  newExpanded.delete(item.id);
                } else {
                  newExpanded.add(item.id);
                }
                setExpandedFolders(newExpanded);
              }
            }}
            onCreateFile={parentId => {
              setCurrentParentId(parentId);
              setIsCreatingFile(true);
            }}
            onCreateFolder={parentId => {
              setCurrentParentId(parentId);
              setIsCreatingFolder(true);
            }}
            onUploadFile={parentId => {
              setCurrentParentId(parentId);
              fileInputRef.current?.click();
            }}
            onRename={name => {
              setCurrentFile(item);
              setNewFileName(name);
              setIsRenamingFile(true);
            }}
            onDelete={() => {
              setCurrentFile(item);
              setIsDeletingFile(true);
            }}
          />
        </div>
      );

      // Render children if folder is expanded
      if (isFolder && isExpanded && item.children.length > 0) {
        result.push(...renderTreeItems(item.children));
      }
    });

    return result;
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async e => {
      const content = e.target?.result as string;

      try {
        await apiRequest("POST", `/api/sessions/${sessionId}/files`, {
          name: file.name,
          content: content, // File content as text
          sessionId,
          parentId: currentParentId,
        });

        toast({
          title: "File Uploaded",
          description: `${file.name} has been added.`,
        });

        setCurrentParentId(null); // Reset parent ID
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
        parentId: currentParentId,
      });

      toast({
        title: "File created",
        description: `${newFileName} has been created successfully.`,
      });

      setIsCreatingFile(false);
      setNewFileName("");
      setCurrentParentId(null);
      setError(null);
      onFileUpdated();
    } catch (error) {
      setError("Failed to create file");
      console.error("Error creating file:", error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) {
      setError("Folder name is required");
      return;
    }

    try {
      await apiRequest("POST", `/api/sessions/${sessionId}/folders`, {
        name: newFolderName,
        parentId: currentParentId,
      });

      toast({
        title: "Folder created",
        description: `${newFolderName} has been created successfully.`,
      });

      setIsCreatingFolder(false);
      setNewFolderName("");
      setCurrentParentId(null);
      setError(null);
      onFileUpdated();
    } catch (error) {
      setError("Failed to create folder");
      console.error("Error creating folder:", error);
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
        const otherFile = files.find(f => f.id !== currentFile.id);
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
    <div className="py-2 h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">Files</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Plus className="size-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsCreatingFile(true)}>
              <i className="ri-file-add-line mr-2 text-sm"></i>
              New File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsCreatingFolder(true)}>
              <Folder className="mr-2 h-4 w-4" />
              New Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <i className="ri-upload-line mr-2 text-sm"></i>
              Upload File
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hidden elements */}
      <button
        id="create-file-button"
        className="hidden"
        onClick={() => setIsCreatingFile(true)}
      />

      <input
        id="upload-file-input"
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".js,.py,.java,.cpp,.c,.rb,.html,.css,.json,.md,.txt"
        onChange={handleFileUpload}
      />

      {/* Root context menu */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="min-h-full">
            {renderTreeItems(fileTree)}
            {/* Empty space for root context menu */}
            <div className="h-20 w-full" />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => {
              setCurrentParentId(null);
              setIsCreatingFile(true);
            }}
          >
            <i className="ri-file-add-line mr-2 text-sm"></i>
            New File
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              setCurrentParentId(null);
              setIsCreatingFolder(true);
            }}
          >
            <Folder className="mr-2 h-4 w-4" />
            New Folder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => {
              setCurrentParentId(null);
              fileInputRef.current?.click();
            }}
          >
            <i className="ri-upload-line mr-2 text-sm"></i>
            Upload File
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Create File Dialog */}
      <Dialog open={isCreatingFile} onOpenChange={setIsCreatingFile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Create New File
              {currentParentId && (
                <span className="text-sm text-muted-foreground font-normal">
                  {" "}
                  in{" "}
                  {files.find(f => f.id === currentParentId)?.name || "folder"}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              className="bg-background border-border text-foreground"
              placeholder="File name (e.g. main.js)"
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateFile();
                }
              }}
              autoFocus
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
                setCurrentParentId(null);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Create New Folder
              {currentParentId && (
                <span className="text-sm text-muted-foreground font-normal">
                  {" "}
                  in{" "}
                  {files.find(f => f.id === currentParentId)?.name || "folder"}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              className="bg-background border-border text-foreground"
              placeholder="Folder name (e.g. components)"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateFolder();
                }
              }}
              autoFocus
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
                setIsCreatingFolder(false);
                setNewFolderName("");
                setCurrentParentId(null);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename File Dialog */}
      <Dialog open={isRenamingFile} onOpenChange={setIsRenamingFile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Rename File</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              className="bg-background border-border text-foreground"
              placeholder="New file name"
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRenameFile();
                }
              }}
              autoFocus
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-foreground">
              Are you sure you want to delete "{currentFile?.name}"?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
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
