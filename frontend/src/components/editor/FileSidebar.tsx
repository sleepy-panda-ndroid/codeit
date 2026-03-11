"use client";

import { useState } from "react";
import { FileItem } from "@/lib/files";

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
  onCreate: (path: string) => Promise<void>;
  onDelete: (path: string) => Promise<void>;
  onBack: () => void;
  readOnly: boolean;
}) {
  const [newPath, setNewPath] = useState("");

  return (
    <div className="w-64 border-r p-3 space-y-3">
      <div className="font-semibold">Files</div>

      <div className="flex gap-2">
        <input
          className="border p-2 flex-1 text-sm"
          placeholder='e.g. "src/main.cpp"'
          value={newPath}
          disabled={readOnly}
          onChange={(e) => setNewPath(e.target.value)}
        />
        <button
          className="border px-2 text-sm disabled:opacity-50"
          disabled={readOnly || !newPath.trim()}
          onClick={async () => {
            const p = newPath.trim();
            setNewPath("");
            await onCreate(p);
          }}
        >
          +
        </button>
      </div>

      <div className="space-y-1">
        {files.map((f) => (
          <div
            key={f.id}
            className={`flex items-center justify-between gap-2 px-2 py-1 border cursor-pointer ${
              f.path === activePath ? "bg-gray-100" : ""
            }`}
            onClick={() => onSelect(f.path)}
          >
            <div className="text-sm truncate">{f.path}</div>
            <button
              className="text-xs border px-1 disabled:opacity-50"
              disabled={readOnly}
              onClick={async (e) => {
                e.stopPropagation();
                if (!confirm(`Delete ${f.path}?`)) return;
                await onDelete(f.path);
              }}
            >
              x
            </button>
          </div>
        ))}

        {files.length === 0 && (
          <div className="text-sm opacity-70">No files yet.</div>
        )}
      </div>

      <button className="border px-3 py-2 w-full" onClick={onBack}>
        Back
      </button>
    </div>
  );
}