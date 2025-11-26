import { getFileIcon } from "@/lib/language-utils";
import type { File } from "@shared/schema";

interface FileTabsProps {
  files: File[];
  activeFileId: string | null;
  onSelect: (fileId: string) => void;
  onClose: (fileId: string) => void;
}

export function FileTabs({
  files,
  activeFileId,
  onSelect,
  onClose,
}: FileTabsProps) {
  return (
    <div className="bg-muted border-b border-border flex overflow-x-auto hide-scrollbar">
      {files.map(file => {
        const icon = getFileIcon(file.name);
        const isActive = file.id === activeFileId;

        return (
          <div
            key={file.id}
            className={`px-3 py-2 flex items-center border-r border-border cursor-pointer ${
              isActive
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onSelect(file.id)}
          >
            <i className={`${icon.icon} ${icon.color} mr-2 text-sm`}></i>
            <span className="text-sm font-mono">{file.name}</span>
            <button
              className="ml-2 text-muted-foreground hover:text-foreground"
              onClick={e => {
                e.stopPropagation();
                onClose(file.id);
              }}
            >
              <i className="ri-close-line text-xs"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
}
