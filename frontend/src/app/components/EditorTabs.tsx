import { useRef, useEffect } from "react";
import { X } from "lucide-react";


export interface EditorFile {
  id: string;
  name: string;
  path?: string;
  unsaved?: boolean;
}

interface EditorTabsProps {
  files: EditorFile[];
  activeFileId: string;
  onTabClick: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
}

export default function EditorTabs({ files, activeFileId, onTabClick, onTabClose }: EditorTabsProps) {
  const activeTabRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [activeFileId]);

  return (
    <div className="h-9 bg-[#252526] border-b border-[#3e3e42] flex items-center overflow-x-auto scrollbar-thin">
      {files.map((file) => {
        const isActive = activeFileId === file.id;
        return (
          <div
            key={file.id}
            ref={isActive ? activeTabRef : null}
            className={`h-full px-3 flex items-center gap-1.5 border-r border-[#3e3e42] cursor-pointer group min-w-0 flex-shrink-0 relative ${
              isActive
                ? "bg-[#1e1e1e] text-white border-t-2 border-t-indigo-500"
                : "bg-[#252526] text-gray-400 hover:text-gray-200 hover:bg-[#2a2d2e] border-t-2 border-t-transparent"
            }`}
            onClick={() => onTabClick(file.id)}
            title={file.name}
          >
            {file.unsaved && (
              <span className="text-orange-400 text-xs leading-none flex-shrink-0" title="Unsaved changes">
                ●
              </span>
            )}
            <span className="text-sm truncate max-w-[120px]">{file.name}</span>
            <button
              className={`rounded p-0.5 transition-all hover:bg-[#3e3e42] flex-shrink-0 ${
                file.unsaved
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(file.id);
              }}
              title="Close tab (Alt+W)"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {/* Empty space to fill the rest */}
      {files.length === 0 && (
        <div className="flex-1 flex items-center px-4">
          <span className="text-xs text-gray-600">No files open</span>
        </div>
      )}
    </div>
  );
}
