import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";

export interface ExplorerFile {
  path: string;
  content: string;
}

interface FileExplorerProps {
  files: ExplorerFile[];
  activePath?: string;
  readOnly?: boolean;
  busy?: boolean;
  onFileOpen: (file: { name: string; path: string; language?: string; content?: string }) => void;
  onCreateFile: (path: string) => Promise<void>;
  onRenameFile: (oldPath: string, newPath: string) => Promise<void>;
  onDeleteFile: (path: string) => Promise<void>;
}

type TreeNode =
  | {
      type: "folder";
      name: string;
      path: string;
      children: TreeNode[];
    }
  | {
      type: "file";
      name: string;
      path: string;
      content: string;
    };

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    tsx: "typescript",
    ts: "typescript",
    jsx: "javascript",
    js: "javascript",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    cc: "cpp",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
  };
  return map[ext] || "plaintext";
}

function getNameFromPath(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

function buildTree(files: ExplorerFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  const ensureFolder = (nodes: TreeNode[], folderName: string, folderPath: string) => {
    let node = nodes.find((item) => item.type === "folder" && item.path === folderPath) as Extract<TreeNode, { type: "folder" }> | undefined;

    if (!node) {
      node = {
        type: "folder",
        name: folderName,
        path: folderPath,
        children: [],
      };
      nodes.push(node);
    }

    return node;
  };

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let currentNodes = root;
    let currentPath = "";

    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = index === parts.length - 1;

      if (isLast) {
        currentNodes.push({
          type: "file",
          name: part,
          path: file.path,
          content: file.content,
        });
      } else {
        const folder = ensureFolder(currentNodes, part, currentPath);
        currentNodes = folder.children;
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return [...nodes]
      .sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === "folder" ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      })
      .map((node) =>
        node.type === "folder"
          ? { ...node, children: sortNodes(node.children) }
          : node
      );
  };

  return sortNodes(root);
}

function getFileIcon(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  if (["tsx", "ts", "jsx", "js", "py", "java", "c", "cpp", "cc"].includes(ext ?? "")) {
    return <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
  }
  if (ext === "json") return <FileJson className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />;
  if (["md", "txt", "html"].includes(ext ?? "")) return <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
  return <File className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
}

export default function FileExplorer({
  files,
  activePath,
  readOnly,
  busy,
  onFileOpen,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
}: FileExplorerProps) {
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editedPath, setEditedPath] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(["src", "public"]));
  const [error, setError] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => a.path.localeCompare(b.path));
  }, [files]);

  const tree = useMemo(() => buildTree(sortedFiles), [sortedFiles]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((previous) => {
      const next = new Set(previous);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const startRename = (path: string) => {
    if (readOnly) return;
    setError("");
    setEditingPath(path);
    setEditedPath(path);
  };

  const commitCreate = async () => {
    const trimmed = newPath.trim().replace(/^\/+/, "");
    if (!trimmed) {
      setShowCreateInput(false);
      return;
    }

    if (sortedFiles.some((file) => file.path === trimmed)) {
      setError("File path already exists");
      return;
    }

    setError("");
    try {
      await onCreateFile(trimmed);
      const segments = trimmed.split("/").filter(Boolean);
      if (segments.length > 1) {
        setExpandedFolders((previous) => {
          const next = new Set(previous);
          for (let index = 1; index < segments.length; index++) {
            next.add(segments.slice(0, index).join("/"));
          }
          return next;
        });
      }
      setNewPath("");
      setShowCreateInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    }
  };

  const commitRename = async () => {
    if (!editingPath) return;

    const trimmed = editedPath.trim();
    if (!trimmed || trimmed === editingPath) {
      setEditingPath(null);
      return;
    }

    if (sortedFiles.some((file) => file.path === trimmed && file.path !== editingPath)) {
      setError("File path already exists");
      return;
    }

    setError("");
    try {
      await onRenameFile(editingPath, trimmed);
      setEditingPath(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename file");
    }
  };

  const handleDelete = async (path: string) => {
    if (readOnly) return;
    if (!window.confirm(`Delete ${path}?`)) return;

    setError("");
    try {
      await onDeleteFile(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[#3e3e42] flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Explorer</span>
        <Button
          size="icon"
          variant="ghost"
          className="w-6 h-6 text-gray-400 hover:text-white hover:bg-[#2a2d2e]"
          onClick={() => {
            setShowCreateInput(true);
            setNewPath("");
            setTimeout(() => createInputRef.current?.focus(), 0);
          }}
          disabled={!!readOnly || !!busy}
          title={readOnly ? "Read-only access" : "New File"}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {showCreateInput && (
        <div className="px-3 py-2 border-b border-[#3e3e42] bg-[#1e1e1e]">
          <p className="text-xs text-gray-400 mb-1">File path (e.g. src/main.py)</p>
          <input
            ref={createInputRef}
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitCreate();
              if (e.key === "Escape") setShowCreateInput(false);
            }}
            onBlur={() => {
              if (!newPath.trim()) {
                setShowCreateInput(false);
              }
            }}
            placeholder="src/main.py"
            className="w-full bg-[#3c3c3c] border border-indigo-500 text-white text-xs px-2 py-1 rounded outline-none placeholder:text-gray-600"
            spellCheck={false}
          />
        </div>
      )}

      {error && (
        <div className="px-3 py-2 border-b border-[#3e3e42] bg-red-950/20 text-red-400 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {sortedFiles.length === 0 && (
          <div className="px-3 py-4 text-xs text-gray-500">No files in this project.</div>
        )}

        {tree.map((node) => (
          <TreeNodeRow
            key={node.path}
            node={node}
            level={0}
            activePath={activePath}
            editingPath={editingPath}
            editedPath={editedPath}
            expandedFolders={expandedFolders}
            readOnly={readOnly}
            busy={busy}
            setEditedPath={setEditedPath}
            setEditingPath={setEditingPath}
            toggleFolder={toggleFolder}
            commitRename={commitRename}
            startRename={startRename}
            onFileOpen={onFileOpen}
            handleDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

function TreeNodeRow({
  node,
  level,
  activePath,
  editingPath,
  editedPath,
  expandedFolders,
  readOnly,
  busy,
  setEditedPath,
  setEditingPath,
  toggleFolder,
  commitRename,
  startRename,
  onFileOpen,
  handleDelete,
}: {
  node: TreeNode;
  level: number;
  activePath?: string;
  editingPath: string | null;
  editedPath: string;
  expandedFolders: Set<string>;
  readOnly?: boolean;
  busy?: boolean;
  setEditedPath: (value: string) => void;
  setEditingPath: (value: string | null) => void;
  toggleFolder: (path: string) => void;
  commitRename: () => Promise<void>;
  startRename: (path: string) => void;
  onFileOpen: (file: { name: string; path: string; language?: string; content?: string }) => void;
  handleDelete: (path: string) => Promise<void>;
}) {
  const leftPad = 8 + level * 14;

  if (node.type === "folder") {
    const expanded = expandedFolders.has(node.path);

    return (
      <div>
        <button
          className="w-full flex items-center gap-1.5 py-1 text-sm hover:bg-[#2a2d2e]"
          style={{ paddingLeft: `${leftPad}px`, paddingRight: "8px" }}
          onClick={() => toggleFolder(node.path)}
          title={node.path}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          {expanded ? <FolderOpen className="w-3.5 h-3.5 text-indigo-400" /> : <Folder className="w-3.5 h-3.5 text-indigo-400" />}
          <span className="truncate text-gray-300">{node.name}</span>
        </button>

        {expanded && node.children.map((child) => (
          <TreeNodeRow
            key={child.path}
            node={child}
            level={level + 1}
            activePath={activePath}
            editingPath={editingPath}
            editedPath={editedPath}
            expandedFolders={expandedFolders}
            readOnly={readOnly}
            busy={busy}
            setEditedPath={setEditedPath}
            setEditingPath={setEditingPath}
            toggleFolder={toggleFolder}
            commitRename={commitRename}
            startRename={startRename}
            onFileOpen={onFileOpen}
            handleDelete={handleDelete}
          />
        ))}
      </div>
    );
  }

  const isActive = activePath === node.path;
  const isEditing = editingPath === node.path;

  return (
    <div
      className={`flex items-center gap-2 py-1.5 text-sm group ${
        isActive ? "bg-indigo-600/20" : "hover:bg-[#2a2d2e]"
      }`}
      style={{ paddingLeft: `${leftPad + 16}px`, paddingRight: "8px" }}
    >
      {getFileIcon(node.path)}

      {isEditing ? (
        <input
          value={editedPath}
          onChange={(event) => setEditedPath(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void commitRename();
            if (event.key === "Escape") setEditingPath(null);
            event.stopPropagation();
          }}
          onBlur={() => void commitRename()}
          className="flex-1 bg-[#3c3c3c] border border-indigo-500 text-white text-xs px-1 py-0.5 rounded outline-none"
          spellCheck={false}
        />
      ) : (
        <button
          className={`flex-1 text-left truncate ${isActive ? "text-white" : "text-gray-300 group-hover:text-white"}`}
          onClick={() =>
            onFileOpen({
              name: getNameFromPath(node.path),
              path: node.path,
              language: getLanguageFromPath(node.path),
              content: node.content,
            })
          }
          title={node.path}
        >
          {node.name}
        </button>
      )}

      {!isEditing && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 text-gray-400 hover:text-white hover:bg-[#2a2d2e]"
            onClick={() => startRename(node.path)}
            disabled={!!readOnly || !!busy}
            title="Rename"
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 text-gray-400 hover:text-red-300 hover:bg-red-950/20"
            onClick={() => void handleDelete(node.path)}
            disabled={!!readOnly || !!busy}
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
