"use client";

import { useEffect, useMemo, useState } from "react";
import type { FileItem } from "@/lib/files";

type TreeNode = {
  type: "folder" | "file";
  name: string;
  path: string;
  children?: TreeNode[];
};

function sortNodes(nodes: TreeNode[]) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  nodes.forEach((node) => {
    if (node.children) sortNodes(node.children);
  });
}

// Converts flat file list into a nested tree structure based on paths 
function buildTree(files: FileItem[]) {
  const root: TreeNode = { type: "folder", name: "", path: "", children: [] };

  files.forEach((file) => {
    const parts = file.path.split("/").filter(Boolean);
    let current = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const nodePath = parts.slice(0, index + 1).join("/");

      if (!current.children) current.children = [];
      let next = current.children.find((node) => node.path === nodePath);

      if (!next) {
        next = {
          type: isFile ? "file" : "folder",
          name: part,
          path: nodePath,
          children: isFile ? undefined : [],
        };
        current.children.push(next);
      }

      if (!isFile) {
        current = next;
      }
    });
  });

  if (!root.children) return [];
  sortNodes(root.children);
  return root.children;
}

export function FileSidebar({
  files,
  activePath,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onBack,
  readOnly,
  busy,
  error,
  onClearError,
}: {
  files: FileItem[];
  activePath: string;
  onSelect: (path: string) => void;
  onCreate: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newPath: string) => void;
  onBack: () => void;
  readOnly: boolean;
  busy: boolean;
  error: string | null;
  onClearError: () => void;
}) {
  const [newPath, setNewPath] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const tree = useMemo(() => buildTree(files), [files]);

  useEffect(() => {
    if (!activePath) return;
    const parts = activePath.split("/").filter(Boolean);
    if (parts.length <= 1) return;

    setExpandedFolders((prev) => {
      const next = { ...prev };
      parts.slice(0, -1).forEach((_, index) => {
        const folderPath = parts.slice(0, index + 1).join("/");
        next[folderPath] = true;
      });
      return next;
    });
  }, [activePath]);

  function handleCreate() {
    const path = newPath.trim();
    if (!path) return;
    onCreate(path);
    setNewPath("");
  }

  function toggleFolder(path: string) {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !(prev[path] ?? true),
    }));
  }

  function startRename(path: string) {
    setRenamingPath(path);
    setRenameValue(path);
  }

  function cancelRename() {
    setRenamingPath(null);
    setRenameValue("");
  }

  function commitRename() {
    if (!renamingPath) return;
    const nextPath = renameValue.trim();
    if (!nextPath) return;
    onRename(renamingPath, nextPath);
    cancelRename();
  }

  function renderNode(node: TreeNode, depth: number) {
    const paddingLeft = 12 + depth * 14;

    if (node.type === "folder") {
      const expanded = expandedFolders[node.path] ?? true;
      return (
        <div key={node.path}>
          <button
            className="w-full flex items-center gap-2 text-left px-2 py-1 text-sm"
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft: `${paddingLeft}px` }}
            type="button"
          >
            <span className="text-xs text-gray-500">{expanded ? "-" : "+"}</span>
            <span className="font-medium">{node.name}</span>
          </button>

          {expanded && node.children && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const active = node.path === activePath;
    const isRenaming = renamingPath === node.path;

    return (
      <div
        key={node.path}
        className={`flex items-center gap-2 border ${
          active ? "bg-gray-100" : "bg-white"
        }`}
        style={{ marginLeft: `${paddingLeft}px` }}
      >
        {isRenaming ? (
          <div className="flex-1 flex items-center gap-2 px-2 py-1">
            <input
              className="flex-1 min-w-0 border px-2 py-1 text-sm"
              value={renameValue}
              onChange={(e) => {
                onClearError();
                setRenameValue(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") cancelRename();
              }}
              disabled={busy}
            />
            <button
              className="border px-2 py-1 text-xs"
              onClick={commitRename}
              type="button"
              disabled={busy}
            >
              Save
            </button>
            <button
              className="border px-2 py-1 text-xs"
              onClick={cancelRename}
              type="button"
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              className="flex-1 min-w-0 text-left px-3 py-2 text-sm truncate"
              onClick={() => onSelect(node.path)}
              type="button"
              title={node.path}
            >
              {node.name}
            </button>

            {!readOnly && (
              <div className="flex items-center gap-1 pr-2">
                <button
                  className="border px-2 py-1 text-xs"
                  onClick={() => startRename(node.path)}
                  type="button"
                  disabled={busy}
                >
                  Rename
                </button>
                <button
                  className="border px-2 py-1 text-xs"
                  onClick={() => onDelete(node.path)}
                  type="button"
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
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
            onChange={(e) => {
              onClearError();
              setNewPath(e.target.value);
            }}
            disabled={readOnly || busy}
          />
          <button
            className="border px-3 py-2 text-sm disabled:opacity-50"
            onClick={handleCreate}
            disabled={readOnly || busy || !newPath.trim()}
            type="button"
          >
            +
          </button>
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-600" role="alert">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-3 pb-3">
        <div className="space-y-2">
          {tree.length === 0 && (
            <div className="text-sm text-gray-500">No files yet.</div>
          )}
          {tree.map((node) => renderNode(node, 0))}
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