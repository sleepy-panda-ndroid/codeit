"use client";

import { useState } from "react";
import type { FileItem } from "@/lib/files";

export function FileSidebar({
  files,
  activePath,
  onSelect,
  onCreate,
  onDelete,
  onBack,
  readOnly,
}: {
  files: FileItem[];
  activePath: string;
  onSelect: (path: string) => void;
  onCreate: (path: string) => void;
  onDelete: (path: string) => void;
  onBack: () => void;
  readOnly: boolean;
}) {
  const [newPath, setNewPath] = useState("");

  function handleCreate() {
    const path = newPath.trim();
    if (!path) return;
    onCreate(path);
    setNewPath("");
  }

  return (
    <div className="h-full w-full min-w-0 flex flex-col bg-white">
      <div className="border-b px-3 py-3 shrink-0">
        <div className="text-sm font-semibold">Files</div>
      </div>

      <div className="p-3 shrink-0">
        <div className="flex gap-2">
          <input
            className="flex-1 min-w-0 border px-3 py-2 text-sm"
            placeholder={`e.g. "src/main.cpp"`}
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            disabled={readOnly}
          />
          <button
            className="border px-3 py-2 text-sm disabled:opacity-50"
            onClick={handleCreate}
            disabled={readOnly || !newPath.trim()}
            type="button"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-3 pb-3">
        <div className="space-y-2">
          {files.map((file) => {
            const active = file.path === activePath;

            return (
              <div
                key={file.path}
                className={`border flex items-center gap-2 ${
                  active ? "bg-gray-100" : "bg-white"
                }`}
              >
                <button
                  className="flex-1 min-w-0 text-left px-3 py-2 text-sm truncate"
                  onClick={() => onSelect(file.path)}
                  type="button"
                  title={file.path}
                >
                  {file.path}
                </button>

                {!readOnly && (
                  <button
                    className="shrink-0 border-l px-3 py-2 text-sm"
                    onClick={() => onDelete(file.path)}
                    type="button"
                    title={`Delete ${file.path}`}
                  >
                    x
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3 border-t shrink-0">
        <button
          className="w-full border px-3 py-2 text-sm"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
      </div>
    </div>
  );
}