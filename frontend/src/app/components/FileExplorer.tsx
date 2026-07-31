import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import type { ProjectNode, NodeType } from "../../lib/nodes";

interface FileExplorerProps {
  nodes: ProjectNode[];
  activeNodeId?: string;
  readOnly?: boolean;
  busy?: boolean;
  onFileOpen: (node: ProjectNode) => void;
  onCreateNode: (input: {
    parentId: string | null;
    type: NodeType;
    name: string;
  }) => Promise<void>;
  onRenameNode: (nodeId: string, name: string) => Promise<void>;
  onDeleteNode: (nodeId: string) => Promise<void>;
  onMoveNode?: (nodeId: string, parentId: string | null) => Promise<void>;
}

type TreeNode = ProjectNode & { children: TreeNode[] };

// name with an extension -> file; bare name -> folder.
// dotfiles (.gitignore, .env) are files; a trailing slash forces a folder.
function inferType(rawName: string): NodeType {
  const name = rawName.trim();
  if (name.endsWith("/")) return "folder";
  const base = name.replace(/\/+$/, "");
  if (base.startsWith(".") && !base.slice(1).includes(".")) return "file";
  const lastDot = base.lastIndexOf(".");
  if (lastDot > 0 && lastDot < base.length - 1) return "file";
  return "folder";
}

function cleanName(rawName: string): string {
  return rawName.trim().replace(/\/+$/, "");
}

function buildTree(nodes: ProjectNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  nodes.forEach((n) => byId.set(n.id, { ...n, children: [] }));

  const roots: TreeNode[] = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (arr: TreeNode[]) => {
    arr.sort((a, b) =>
      a.type !== b.type
        ? a.type === "folder"
          ? -1
          : 1
        : a.name.localeCompare(b.name)
    );
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["tsx", "ts", "jsx", "js", "py", "java", "c", "cpp", "cc"].includes(ext ?? "")) {
    return <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
  }
  if (ext === "json") return <FileJson className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />;
  if (["md", "txt", "html"].includes(ext ?? "")) return <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
  return <File className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
}

// Shared state for the recursive rows, so we don't prop-drill through the tree.
interface ExplorerCtx {
  activeNodeId?: string;
  readOnly?: boolean;
  busy?: boolean;
  collapsed: Set<string>;
  toggleCollapse: (id: string) => void;
  creatingParent: { parentId: string | null } | null;
  startCreate: (parentId: string | null) => void;
  cancelCreate: () => void;
  commitCreate: (name: string) => Promise<void>;
  editingId: string | null;
  startRename: (id: string) => void;
  cancelRename: () => void;
  commitRename: (name: string) => Promise<void>;
  onFileOpen: (node: ProjectNode) => void;
  handleDelete: (node: ProjectNode) => Promise<void>;
  siblingsOf: (parentId: string | null) => ProjectNode[];

  // for drag and drop moving
  onMoveNode?: (nodeId: string, parentId: string | null) => Promise<void>;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  dragOverId: string | null;
  setDragOverId: (id: string | null) => void;
  performMove: (targetFolderId: string | null) => Promise<void>;
}

const Ctx = createContext<ExplorerCtx | null>(null);
const useExplorer = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Explorer context missing");
  return ctx;
};

export default function FileExplorer({
  nodes,
  activeNodeId,
  readOnly,
  busy,
  onFileOpen,
  onCreateNode,
  onRenameNode,
  onDeleteNode,
  onMoveNode,
}: FileExplorerProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [creatingParent, setCreatingParent] = useState<{ parentId: string | null } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const performMove = async (targetFolderId: string | null) => {
    const id = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (!id || !onMoveNode) return;
    if (targetFolderId) {
      setCollapsed((prev) => { const n = new Set(prev); n.delete(targetFolderId); return n; });
    }
    await onMoveNode(id, targetFolderId);
  };

  const tree = useMemo(() => buildTree(nodes), [nodes]);

  const siblingsOf = (parentId: string | null) =>
    nodes.filter((n) => (n.parentId ?? null) === parentId);

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const startCreate = (parentId: string | null) => {
    if (readOnly) return;
    setError("");
    setEditingId(null);
    setCreatingParent({ parentId });
    if (parentId) setCollapsed((prev) => { const n = new Set(prev); n.delete(parentId); return n; });
  };
  const cancelCreate = () => setCreatingParent(null);

  const commitCreate = async (raw: string) => {
    if (!creatingParent) return;
    const name = cleanName(raw);
    if (!name) { setCreatingParent(null); return; }

    if (siblingsOf(creatingParent.parentId).some((n) => n.name === name)) {
      setError(`"${name}" already exists here`);
      return;
    }
    setError("");
    try {
      await onCreateNode({
        parentId: creatingParent.parentId,
        type: inferType(raw),
        name,
      });
      setCreatingParent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  };

  const startRename = (id: string) => {
    if (readOnly) return;
    setError("");
    setCreatingParent(null);
    setEditingId(id);
  };
  const cancelRename = () => setEditingId(null);

  const commitRename = async (raw: string) => {
    if (!editingId) return;
    const name = cleanName(raw);
    const node = nodes.find((n) => n.id === editingId);
    if (!node || !name || name === node.name) { setEditingId(null); return; }

    if (siblingsOf(node.parentId ?? null).some((n) => n.name === name && n.id !== node.id)) {
      setError(`"${name}" already exists here`);
      return;
    }
    setError("");
    try {
      await onRenameNode(editingId, name);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename");
    }
  };

  const handleDelete = async (node: ProjectNode) => {
    if (readOnly) return;
    const msg =
      node.type === "folder"
        ? `Delete folder "${node.name}" and everything inside it?`
        : `Delete "${node.name}"?`;
    if (!window.confirm(msg)) return;
    setError("");
    try {
      await onDeleteNode(node.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const ctx: ExplorerCtx = {
    activeNodeId, readOnly, busy, collapsed, toggleCollapse,
    creatingParent, startCreate, cancelCreate, commitCreate,
    editingId, startRename, cancelRename, commitRename,
    onFileOpen, handleDelete, siblingsOf,
    onMoveNode, draggingId, setDraggingId, dragOverId, setDragOverId, performMove,
  };

  return (
    <Ctx.Provider value={ctx}>
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-[#3e3e42] flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Explorer</span>
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 text-gray-400 hover:text-white hover:bg-[#2a2d2e]"
            onClick={() => startCreate(null)}
            disabled={!!readOnly || !!busy}
            title={readOnly ? "Read-only access" : "New file or folder at root"}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {error && (
          <div className="px-3 py-2 border-b border-[#3e3e42] bg-red-950/20 text-red-400 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        <div
          className={`flex-1 overflow-y-auto py-1 ${dragOverId === "__root__" ? "bg-indigo-600/10" : ""}`}
          onDragOver={(e) => { if (draggingId) { e.preventDefault(); setDragOverId("__root__"); } }}
          onDrop={(e) => { e.preventDefault(); void performMove(null); }}
        >
          {nodes.length === 0 && !creatingParent && (
            <div className="px-3 py-4 text-xs text-gray-500">No files yet. Use + to add one.</div>
          )}

          {creatingParent?.parentId === null && <CreateInput level={0} />}

          {tree.map((node) => (
            <NodeRow key={node.id} node={node} level={0} />
          ))}
        </div>
      </div>
    </Ctx.Provider>
  );
}

function NodeRow({ node, level }: { node: TreeNode; level: number }) {
  const ctx = useExplorer();
  const leftPad = 8 + level * 14;
  const isEditing = ctx.editingId === node.id;

  if (node.type === "folder") {
    const expanded = !ctx.collapsed.has(node.id);
    return (
      <div>
        <div
          draggable={!ctx.readOnly}
          onDragStart={(e) => { e.stopPropagation(); ctx.setDraggingId(node.id); }}
          onDragEnd={() => { ctx.setDraggingId(null); ctx.setDragOverId(null); }}
          onDragOver={(e) => {
            if (ctx.draggingId && ctx.draggingId !== node.id) {
              e.preventDefault();
              e.stopPropagation();
              ctx.setDragOverId(node.id);
            }
          }}
          onDragLeave={(e) => { e.stopPropagation(); if (ctx.dragOverId === node.id) ctx.setDragOverId(null); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); void ctx.performMove(node.id); }}
          className={`group w-full flex items-center gap-1.5 py-1 text-sm ${
            ctx.dragOverId === node.id
              ? "bg-indigo-600/30 ring-1 ring-inset ring-indigo-500"
              : "hover:bg-[#2a2d2e]"
          }`}
          style={{ paddingLeft: `${leftPad}px`, paddingRight: "8px" }}
        >
          <button
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
            onClick={() => ctx.toggleCollapse(node.id)}
            title={node.name}
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
            {expanded ? <FolderOpen className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /> : <Folder className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
            {isEditing ? (
              <RenameInput initial={node.name} />
            ) : (
              <span className="truncate text-gray-300">{node.name}</span>
            )}
          </button>

          {!isEditing && (
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <IconBtn title="New file or folder" onClick={() => ctx.startCreate(node.id)}>
                <FolderPlus className="w-3 h-3" />
              </IconBtn>
              <IconBtn title="Rename" onClick={() => ctx.startRename(node.id)}>
                <Pencil className="w-3 h-3" />
              </IconBtn>
              <IconBtn title="Delete" danger onClick={() => void ctx.handleDelete(node)}>
                <Trash2 className="w-3 h-3" />
              </IconBtn>
            </div>
          )}
        </div>

        {expanded && (
          <>
            {ctx.creatingParent?.parentId === node.id && <CreateInput level={level + 1} />}
            {node.children.map((child) => (
              <NodeRow key={child.id} node={child} level={level + 1} />
            ))}
          </>
        )}
      </div>
    );
  }

  // file
  const isActive = ctx.activeNodeId === node.id;
  return (
    <div
      draggable={!ctx.readOnly}
      onDragStart={(e) => { e.stopPropagation(); ctx.setDraggingId(node.id); }}
      onDragEnd={() => { ctx.setDraggingId(null); ctx.setDragOverId(null); }}
      className={`group flex items-center gap-2 py-1.5 text-sm ${isActive ? "bg-indigo-600/20" : "hover:bg-[#2a2d2e]"}`}
      style={{ paddingLeft: `${leftPad + 16}px`, paddingRight: "8px" }}
    >
      {getFileIcon(node.name)}

      {isEditing ? (
        <RenameInput initial={node.name} />
      ) : (
        <button
          className={`flex-1 text-left truncate ${isActive ? "text-white" : "text-gray-300 group-hover:text-white"}`}
          onClick={() => ctx.onFileOpen(node)}
          title={node.name}
        >
          {node.name}
        </button>
      )}

      {!isEditing && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <IconBtn title="Rename" onClick={() => ctx.startRename(node.id)}>
            <Pencil className="w-3 h-3" />
          </IconBtn>
          <IconBtn title="Delete" danger onClick={() => void ctx.handleDelete(node)}>
            <Trash2 className="w-3 h-3" />
          </IconBtn>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children, title, danger, onClick,
}: {
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  const ctx = useExplorer();
  return (
    <Button
      size="icon"
      variant="ghost"
      className={`w-6 h-6 text-gray-400 ${danger ? "hover:text-red-300 hover:bg-red-950/20" : "hover:text-white hover:bg-[#2a2d2e]"}`}
      onClick={onClick}
      disabled={!!ctx.readOnly || !!ctx.busy}
      title={title}
    >
      {children}
    </Button>
  );
}

function CreateInput({ level }: { level: number }) {
  const ctx = useExplorer();
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const leftPad = 8 + level * 14 + 16;

  return (
    <div style={{ paddingLeft: `${leftPad}px`, paddingRight: "8px" }} className="py-1">
      <input
        ref={ref}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void ctx.commitCreate(value);
          if (e.key === "Escape") ctx.cancelCreate();
          e.stopPropagation();
        }}
        onBlur={() => { if (!value.trim()) ctx.cancelCreate(); }}
        placeholder="name.ext, or foldername"
        className="w-full bg-[#3c3c3c] border border-indigo-500 text-white text-xs px-2 py-1 rounded outline-none placeholder:text-gray-600"
        spellCheck={false}
      />
    </div>
  );
}

function RenameInput({ initial }: { initial: string }) {
  const ctx = useExplorer();
  const [value, setValue] = useState(initial);

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") void ctx.commitRename(value);
        if (e.key === "Escape") ctx.cancelRename();
        e.stopPropagation();
      }}
      onBlur={() => void ctx.commitRename(value)}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 min-w-0 bg-[#3c3c3c] border border-indigo-500 text-white text-xs px-1 py-0.5 rounded outline-none"
      spellCheck={false}
    />
  );
}