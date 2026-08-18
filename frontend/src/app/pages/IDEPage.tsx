import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Play,
  Save,
  File,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  Bot,
  CheckCheck,
  Clock,
  AlertCircle,
  Settings,
  Users,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import FileExplorer from "../components/FileExplorer";
import CodeEditor from "../components/CodeEditor";
import TerminalPanel, { ExecutionResult } from "../components/TerminalPanel";
import AIChatPanel from "../components/AIChatPanel";

import EditorDashboard, { DEFAULT_EDITOR_SETTINGS, type EditorSettings } from "../components/EditorDashboard";
import EditorTabs from "../components/EditorTabs";

import {
  createNode,
  deleteNode,
  listNodes,
  moveNode,
  renameNode,
  saveNode,
  type ProjectNode,
  type NodeType,
} from "../../lib/nodes";
import { executeProjectCode, type ExecutionLanguage } from "../../lib/execution";
import { getProject } from "../../lib/projects";
import { getStoredToken, getStoredUser } from "../../lib/auth";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";

interface OpenFile {
  id: string; // node id
  name: string;
  language: string;
  content: string;
  savedContent: string;
}

interface PersistedIdeState {
  openIds: string[];
  activeId: string;
  drafts: Record<string, string>; // keyed by node id
  stdin?: string;
  layout: {
    showSidebar: boolean;
    showAIPanel: boolean;
    showTerminal: boolean;
  };
}

type SaveStatus = "saved" | "saving" | "unsaved";
type Role = "OWNER" | "WRITER" | "READER";
type CollabStatus = "idle" | "connecting" | "syncing" | "ready" | "error";

type CollaboratorPresence = {
  clientId: number;
  userId: string;
  name: string;
  email: string;
  color: string;
};

const EDITOR_SETTINGS_STORAGE_KEY = "codeit:editor-dashboard-settings";

function loadEditorDashboardSettings(): EditorSettings {
  if (typeof window === "undefined") {
    return DEFAULT_EDITOR_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_EDITOR_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<EditorSettings> & {
      autoSaveEnabled?: boolean;
      renderWhitespace?: EditorSettings["renderWhitespace"] | boolean;
    };

    const migrated: Partial<EditorSettings> = {
      ...parsed,
      autoSave:
        typeof parsed.autoSave === "boolean"
          ? parsed.autoSave
          : typeof parsed.autoSaveEnabled === "boolean"
          ? parsed.autoSaveEnabled
          : DEFAULT_EDITOR_SETTINGS.autoSave,
    };

    if (typeof parsed.renderWhitespace === "boolean") {
      migrated.renderWhitespace = parsed.renderWhitespace ? "all" : "none";
    }

    return {
      ...DEFAULT_EDITOR_SETTINGS,
      ...migrated,
    };
  } catch {
    return DEFAULT_EDITOR_SETTINGS;
  }
}

function formatContentOnSave(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/g, ""))
    .join("\n");
}

const LANGUAGE_DISPLAY: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  markdown: "Markdown",
  plaintext: "Plain Text",
};

// Language is derived from the node name (which carries the extension).
function languageFromName(name: string): string {
  const p = name.toLowerCase();

  if (p.endsWith(".tsx") || p.endsWith(".ts")) return "typescript";
  if (p.endsWith(".jsx") || p.endsWith(".js")) return "javascript";
  if (p.endsWith(".py")) return "python";
  if (p.endsWith(".java")) return "java";
  if (p.endsWith(".cpp") || p.endsWith(".cc") || p.endsWith(".cxx")) return "cpp";
  if (p.endsWith(".c")) return "c";
  if (p.endsWith(".html")) return "html";
  if (p.endsWith(".css")) return "css";
  if (p.endsWith(".json")) return "json";
  if (p.endsWith(".md")) return "markdown";

  return "plaintext";
}

function executionLanguageFromName(name: string): ExecutionLanguage | null {
  const p = name.toLowerCase();

  if (p.endsWith(".cpp") || p.endsWith(".cc") || p.endsWith(".cxx")) return "cpp";
  if (p.endsWith(".c")) return "c";
  if (p.endsWith(".java")) return "java";
  if (p.endsWith(".js") || p.endsWith(".jsx")) return "javascript";
  if (p.endsWith(".py")) return "python";

  return null;
}

function mapNodeToOpenFile(node: ProjectNode): OpenFile {
  return {
    id: node.id,
    name: node.name,
    language: languageFromName(node.name),
    content: node.content,
    savedContent: node.content,
  };
}

// Given the flat node list, collect a node id plus all its descendant ids.
function collectLocalSubtreeIds(nodes: ProjectNode[], rootId: string): Set<string> {
  const childrenByParent = new Map<string | null, string[]>();
  nodes.forEach((n) => {
    const parent = n.parentId ?? null;
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
    childrenByParent.get(parent)!.push(n.id);
  });

  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    for (const childId of childrenByParent.get(id) ?? []) stack.push(childId);
  }
  return result;
}

function mapExecutionResultToTerminal(result: Awaited<ReturnType<typeof executeProjectCode>>): ExecutionResult {
  const statusText = result.status.description.toLowerCase();
  const output = [result.stdout].filter(Boolean).join("\n");
  const errorMessage = [result.compileOutput, result.stderr, result.message].filter(Boolean).join("\n");

  const status: ExecutionResult["status"] = statusText.includes("accepted")
    ? "accepted"
    : statusText.includes("compile")
      ? "compilation_error"
      : "runtime_error";

  return {
    output,
    errorMessage,
    status,
    executionTime: result.time ? Math.max(0, Math.round(Number(result.time) * 1000)) : 0,
    exitCode: typeof result.exitCode === "number" ? result.exitCode : status === "accepted" ? 0 : 1,
  };
}

function getIdeStorageKey(projectId: string): string {
  return `codeit:ide:${projectId}`;
}

function loadPersistedIdeState(projectId: string): PersistedIdeState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getIdeStorageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedIdeState>;

    if (!parsed || typeof parsed !== "object") return null;

    return {
      openIds: Array.isArray(parsed.openIds) ? parsed.openIds.filter((item): item is string => typeof item === "string") : [],
      activeId: typeof parsed.activeId === "string" ? parsed.activeId : "",
      drafts: parsed.drafts && typeof parsed.drafts === "object" ? parsed.drafts as Record<string, string> : {},
      stdin: typeof parsed.stdin === "string" ? parsed.stdin : "",
      layout: {
        showSidebar: parsed.layout?.showSidebar ?? true,
        showAIPanel: parsed.layout?.showAIPanel ?? true,
        showTerminal: parsed.layout?.showTerminal ?? true,
      },
    };
  } catch {
    return null;
  }
}

function getExecutionErrorStatus(message: string): ExecutionResult["status"] {
  if (/judge0|rapidapi|submission|quota|sandbox|compile service/i.test(message)) {
    return "api_error";
  }

  if (/failed to fetch|network|econn|timeout|http 5|gateway|unavailable|internal server/i.test(message)) {
    return "backend_failure";
  }

  return "backend_failure";
}

function hashToColor(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 58%)`;
}

function replaceTextContent(text: Y.Text, nextValue: string): void {
  const currentValue = text.toString();
  if (currentValue === nextValue) return;

  let prefix = 0;
  while (prefix < currentValue.length && prefix < nextValue.length && currentValue[prefix] === nextValue[prefix]) {
    prefix += 1;
  }

  let currentSuffix = currentValue.length - 1;
  let nextSuffix = nextValue.length - 1;
  while (currentSuffix >= prefix && nextSuffix >= prefix && currentValue[currentSuffix] === nextValue[nextSuffix]) {
    currentSuffix -= 1;
    nextSuffix -= 1;
  }

  const deleteCount = currentSuffix - prefix + 1;
  const insertValue = nextValue.slice(prefix, nextSuffix + 1);

  if (deleteCount > 0) {
    text.delete(prefix, deleteCount);
  }
  if (insertValue) {
    text.insert(prefix, insertValue);
  }
}

function buildCollabWsUrl(projectId: string, nodeId: string, token: string): string {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:4000";
  const wsBase = apiBase.replace(/^http/, "ws");
  const url = new URL(`${wsBase}/ws/collab`);
  url.searchParams.set("token", token);
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("nodeId", nodeId);
  return url.toString();
}

function toCollaborators(awareness: Awareness): CollaboratorPresence[] {
  return Array.from(awareness.getStates().entries())
    .map(([clientId, state]) => {
      const user = state as Partial<CollaboratorPresence> | undefined;
      if (!user || typeof user.userId !== "string" || typeof user.name !== "string") {
        return null;
      }
      return {
        clientId,
        userId: user.userId,
        name: user.name,
        email: typeof user.email === "string" ? user.email : "",
        color: typeof user.color === "string" ? user.color : hashToColor(user.userId),
      };
    })
    .filter((item): item is CollaboratorPresence => !!item);
}

export default function IDEPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [projectName, setProjectName] = useState("Project");
  const [role, setRole] = useState<Role>("READER");
  const [nodes, setNodes] = useState<ProjectNode[]>([]);

  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [stdin, setStdin] = useState("");
  const [showEditorSettings, setShowEditorSettings] = useState(false);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => loadEditorDashboardSettings());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [collabStatus, setCollabStatus] = useState<CollabStatus>("idle");
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [closeConfirm, setCloseConfirm] = useState<{ fileId: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileError, setFileError] = useState("");
  const hasHydratedProjectStateRef = useRef(false);
  const collabDocRef = useRef<Y.Doc | null>(null);
  const collabTextRef = useRef<Y.Text | null>(null);
  const collabAwarenessRef = useRef<Awareness | null>(null);
  const collabSocketRef = useRef<WebSocket | null>(null);
  const collabReadyRef = useRef(false);
  const activeFileIdRef = useRef("");

  const readOnly = role === "READER";

  const activeFile = openFiles.find((f) => f.id === activeFileId) ?? null;

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  const loadProject = useCallback(async () => {
    if (!projectId) {
      navigate("/app", { replace: true });
      return;
    }

    setLoading(true);
    setFileError("");
    hasHydratedProjectStateRef.current = false;

    try {
      const [projectDetail, allNodes] = await Promise.all([getProject(projectId), listNodes(projectId)]);
      const persisted = loadPersistedIdeState(projectId);

      setProjectName(projectDetail.project.name);
      setRole(projectDetail.role);
      setNodes(allNodes);

      if (persisted) {
        setShowSidebar(persisted.layout.showSidebar);
        setShowAIPanel(persisted.layout.showAIPanel);
        setShowTerminal(persisted.layout.showTerminal);
        setStdin(persisted.stdin ?? "");
      }

      const fileNodes = allNodes.filter((n) => n.type === "file");
      const filesById = new Map(fileNodes.map((node) => [node.id, node] as const));

      const preferredIds = persisted?.openIds.filter((id) => filesById.has(id)) ?? [];
      const initialIds = preferredIds.length > 0
        ? preferredIds
        : fileNodes[0]
          ? [fileNodes[0].id]
          : [];

      const restoredOpenFiles = initialIds
        .map((id) => filesById.get(id))
        .filter((item): item is ProjectNode => !!item)
        .map((node) => {
          const base = mapNodeToOpenFile(node);
          const draft = persisted?.drafts?.[node.id];
          return {
            ...base,
            content: typeof draft === "string" ? draft : base.content,
          };
        });

      const preferredActive = persisted?.activeId;
      const hasPreferredActive = !!preferredActive && restoredOpenFiles.some((file) => file.id === preferredActive);

      setOpenFiles(restoredOpenFiles);
      setActiveFileId(hasPreferredActive
        ? preferredActive!
        : restoredOpenFiles[0]?.id ?? "");

      hasHydratedProjectStateRef.current = true;
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [navigate, projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (!activeFile) {
      setSaveStatus("saved");
      return;
    }
    setSaveStatus(activeFile.content !== activeFile.savedContent ? "unsaved" : "saved");
  }, [activeFile?.content, activeFile?.savedContent]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EDITOR_SETTINGS_STORAGE_KEY, JSON.stringify(editorSettings));
  }, [editorSettings]);

  useEffect(() => {
    const activeFileIdValue = activeFile?.id ?? "";
    let disposed = false;

    if (!projectId || !activeFileIdValue || loading) {
      collabSocketRef.current?.close();
      collabSocketRef.current = null;
      collabDocRef.current?.destroy();
      collabDocRef.current = null;
      collabTextRef.current = null;
      collabAwarenessRef.current?.destroy();
      collabAwarenessRef.current = null;
      collabReadyRef.current = false;
      setCollabStatus("idle");
      setCollaborators([]);
      return;
    }

    const token = getStoredToken();
    const user = getStoredUser();
    if (!token || !user) {
      setCollabStatus("error");
      return;
    }

    const doc = new Y.Doc();
    const text = doc.getText("content");
    const awareness = new Awareness(doc);
    const socket = new WebSocket(buildCollabWsUrl(projectId, activeFileIdValue, token));

    socket.binaryType = "arraybuffer";
    collabDocRef.current = doc;
    collabTextRef.current = text;
    collabAwarenessRef.current = awareness;
    collabSocketRef.current = socket;
    collabReadyRef.current = false;
    setCollabStatus("connecting");
    setCollaborators([]);

    const refreshCollaborators = () => {
      setCollaborators(toCollaborators(awareness));
    };

    const syncActiveFileContent = () => {
      const nextValue = text.toString();
      setOpenFiles((prev) => prev.map((file) => (
        file.id === activeFileIdRef.current ? { ...file, content: nextValue } : file
      )));
    };

    const localPresence = {
      userId: user.id,
      name: user.name,
      email: user.email,
      color: hashToColor(user.id),
    };

    const sendLocalPresence = () => {
      if (socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ type: "hello", clientId: doc.clientID, name: user.name, email: user.email }));
      awareness.setLocalState(localPresence);
      socket.send(new Uint8Array([1, ...Array.from(encodeAwarenessUpdate(awareness, [doc.clientID]))]));
    };

    text.observe(() => {
      syncActiveFileContent();
      refreshCollaborators();
    });

    doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(new Uint8Array([0, ...Array.from(update)]));
      }
    });

    awareness.on("update", () => {
      refreshCollaborators();
    });

    socket.onopen = () => {
      if (disposed) return;
      setCollabStatus("syncing");
      sendLocalPresence();
    };

    socket.onmessage = (event) => {
      if (typeof event.data === "string") return;

      const payload = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : new Uint8Array(event.data);
      if (!payload.length) return;

      const messageType = payload[0];
      const message = payload.slice(1);

      if (messageType === 0) {
        Y.applyUpdate(doc, message, "remote");
        collabReadyRef.current = true;
        setCollabStatus("ready");
        return;
      }

      if (messageType === 1) {
        applyAwarenessUpdate(awareness, message, "remote");
        refreshCollaborators();
      }
    };

    socket.onerror = () => {
      if (disposed) return;
      setCollabStatus("error");
    };

    socket.onclose = () => {
      if (disposed) return;
      setCollabStatus("error");
    };

    return () => {
      disposed = true;
      socket.close();
      awareness.destroy();
      doc.destroy();
      if (collabSocketRef.current === socket) collabSocketRef.current = null;
      if (collabDocRef.current === doc) collabDocRef.current = null;
      if (collabTextRef.current === text) collabTextRef.current = null;
      if (collabAwarenessRef.current === awareness) collabAwarenessRef.current = null;
      collabReadyRef.current = false;
    };
  }, [activeFile?.id, loading, projectId]);

  useEffect(() => {
    if (!projectId || !hasHydratedProjectStateRef.current || typeof window === "undefined") return;

    const drafts = openFiles.reduce<Record<string, string>>((accumulator, file) => {
      if (file.content !== file.savedContent) {
        accumulator[file.id] = file.content;
      }
      return accumulator;
    }, {});

    const state: PersistedIdeState = {
      openIds: openFiles.map((file) => file.id),
      activeId: activeFileId,
      drafts,
      stdin,
      layout: {
        showSidebar,
        showAIPanel,
        showTerminal,
      },
    };

    window.localStorage.setItem(getIdeStorageKey(projectId), JSON.stringify(state));
  }, [activeFileId, openFiles, projectId, showAIPanel, showSidebar, showTerminal, stdin]);

  const handleCodeChange = useCallback((value: string) => {
    const text = collabTextRef.current;
    if (!text || !collabReadyRef.current) {
      setOpenFiles((prev) => prev.map((f) => (f.id === activeFileId ? { ...f, content: value } : f)));
      return;
    }

    replaceTextContent(text, value);
  }, [activeFileId]);

  const handleFileOpen = useCallback((node: ProjectNode) => {
    if (node.type !== "file") return;

    setOpenFiles((prev) => {
      const existing = prev.find((item) => item.id === node.id);
      if (existing) {
        setActiveFileId(existing.id);
        return prev;
      }

      const nextFile = mapNodeToOpenFile(node);
      setActiveFileId(nextFile.id);
      return [...prev, nextFile];
    });
  }, []);

  const doCloseFile = useCallback((fileId: string) => {
    setOpenFiles((prev) => {
      const remaining = prev.filter((file) => file.id !== fileId);
      setActiveFileId((currentActiveId) => {
        if (currentActiveId !== fileId) return currentActiveId;
        return remaining[remaining.length - 1]?.id ?? "";
      });
      return remaining;
    });
    setCloseConfirm(null);
  }, []);

  const requestCloseFile = useCallback((fileId: string) => {
    const file = openFiles.find((f) => f.id === fileId);
    if (!file) return;

    if (file.content !== file.savedContent) {
      setCloseConfirm({ fileId, name: file.name });
      return;
    }

    doCloseFile(fileId);
  }, [doCloseFile, openFiles]);

  const handleSave = useCallback(async (fileId?: string): Promise<boolean> => {
    if (!projectId || readOnly) return false;

    const targetId = fileId ?? activeFileId;
    const target = openFiles.find((f) => f.id === targetId);
    if (!target || target.content === target.savedContent) return true;

    const contentToSave = editorSettings.formatOnSave
      ? formatContentOnSave(target.content)
      : target.content;

    setSaveStatus("saving");
    setFileError("");

    try {
      await saveNode(projectId, target.id, contentToSave);

      setOpenFiles((prev) => prev.map((f) => (
        f.id === targetId ? { ...f, content: contentToSave, savedContent: contentToSave } : f
      )));

      setNodes((prev) => prev.map((node) => (
        node.id === target.id ? { ...node, content: contentToSave, updatedAt: new Date().toISOString() } : node
      )));

      setSaveStatus("saved");
      return true;
    } catch (err) {
      setSaveStatus("unsaved");
      setFileError(err instanceof Error ? err.message : "Failed to save file");
      return false;
    }
  }, [activeFileId, editorSettings.formatOnSave, openFiles, projectId, readOnly]);

  useEffect(() => {
    if (!editorSettings.autoSave || readOnly || !activeFile || saveStatus === "saving") return;
    if (activeFile.content === activeFile.savedContent) return;

    const timeout = window.setTimeout(() => {
      void handleSave(activeFile.id);
    }, editorSettings.autoSaveDelay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    activeFile,
    editorSettings.autoSaveDelay,
    editorSettings.autoSave,
    handleSave,
    readOnly,
    saveStatus,
  ]);

  const handleCreateNode = useCallback(async (input: { parentId: string | null; type: NodeType; name: string }) => {
    if (!projectId || readOnly) return;

    setFileBusy(true);
    setFileError("");

    try {
      const created = await createNode(projectId, input);
      setNodes((prev) => [...prev, created]);

      if (created.type === "file") {
        handleFileOpen(created);
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setFileBusy(false);
    }
  }, [handleFileOpen, projectId, readOnly]);

  const handleRenameNode = useCallback(async (nodeId: string, name: string) => {
    if (!projectId || readOnly) return;

    setFileBusy(true);
    setFileError("");

    try {
      const updated = await renameNode(projectId, nodeId, name);

      setNodes((prev) => prev.map((node) => (
        node.id === nodeId ? { ...node, name: updated.name, updatedAt: updated.updatedAt } : node
      )));

      // If the renamed node is an open file, update its tab label and language.
      setOpenFiles((prev) => prev.map((f) => (
        f.id === nodeId ? { ...f, name: updated.name, language: languageFromName(updated.name) } : f
      )));
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to rename");
    } finally {
      setFileBusy(false);
    }
  }, [projectId, readOnly]);

  const handleMoveNode = useCallback(async (nodeId: string, parentId: string | null) => {
    if (!projectId || readOnly) return;

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if ((node.parentId ?? null) === (parentId ?? null)) return; // no-op

    if (node.type === "folder" && parentId) {
      const subtree = collectLocalSubtreeIds(nodes, nodeId);
      if (subtree.has(parentId)) {
        setFileError("Cannot move a folder into its own subtree");
        return;
      }
    }

    setFileBusy(true);
    setFileError("");

    try {
      const updated = await moveNode(projectId, nodeId, parentId);
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, parentId: updated.parentId } : n)));
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to move");
    } finally {
      setFileBusy(false);
    }
  }, [nodes, projectId, readOnly]);

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    if (!projectId || readOnly) return;

    setFileBusy(true);
    setFileError("");

    // Folders delete their whole subtree on the backend; mirror that locally.
    const removedIds = collectLocalSubtreeIds(nodes, nodeId);

    try {
      await deleteNode(projectId, nodeId);

      setNodes((prev) => prev.filter((node) => !removedIds.has(node.id)));

      removedIds.forEach((id) => {
        if (openFiles.some((f) => f.id === id)) {
          doCloseFile(id);
        }
      });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setFileBusy(false);
    }
  }, [doCloseFile, nodes, openFiles, projectId, readOnly]);

  const handleRun = useCallback(async () => {
    if (!projectId || !activeFile || isRunning) return;

    if (!activeFile.content.trim()) {
      setExecutionResult({
        output: "",
        exitCode: 1,
        executionTime: 0,
        status: "empty_file",
        errorMessage: "Cannot execute an empty file.\nPlease write some code first.",
      });
      setShowTerminal(true);
      return;
    }

    const executionLanguage = executionLanguageFromName(activeFile.name);
    if (!executionLanguage) {
      setExecutionResult({
        output: "",
        exitCode: 1,
        executionTime: 0,
        status: "unsupported_language",
        errorMessage: "This file type is not supported for execution. Use .js, .py, .java, .c, or .cpp files.",
      });
      setShowTerminal(true);
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    setShowTerminal(true);

    try {
      const result = await executeProjectCode(projectId, {
        sourceCode: activeFile.content,
        language: executionLanguage,
        filePath: activeFile.name,
        stdin: stdin || undefined,
      });

      setExecutionResult(mapExecutionResultToTerminal(result));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Execution failed";
      const status = getExecutionErrorStatus(message);

      setExecutionResult({
        output: "",
        exitCode: -1,
        executionTime: 0,
        status,
        errorMessage: message,
      });
    } finally {
      setIsRunning(false);
    }
  }, [activeFile, isRunning, projectId, stdin]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;

      if (ctrl && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
      if (ctrl && e.key === "Enter") {
        e.preventDefault();
        if (!isRunning) void handleRun();
      }
      if (ctrl && e.key === "b") {
        e.preventDefault();
        setShowSidebar((v) => !v);
      }
      if (ctrl && e.key === "j") {
        e.preventDefault();
        setShowTerminal((v) => !v);
      }
      if (ctrl && e.key === ",") {
        e.preventDefault();
        setShowEditorSettings(true);
      }

      if (alt && e.key === "w") {
        e.preventDefault();
        if (activeFileId) requestCloseFile(activeFileId);
      }

      if (alt && e.key === "Tab") {
        e.preventDefault();
        if (openFiles.length > 1) {
          const idx = openFiles.findIndex((f) => f.id === activeFileId);
          setActiveFileId(openFiles[(idx + 1) % openFiles.length].id);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFileId, handleRun, handleSave, isRunning, openFiles, requestCloseFile]);

  const tabFiles = useMemo(() => {
    return openFiles.map((f) => ({
      ...f,
      unsaved: f.content !== f.savedContent,
    }));
  }, [openFiles]);

  const collabPillLabel = useMemo(() => {
    if (collabStatus === "ready") return `${collaborators.length} online`;
    if (collabStatus === "syncing" || collabStatus === "connecting") return "Syncing…";
    if (collabStatus === "error") return "Offline";
    return "Local";
  }, [collabStatus, collaborators.length]);

  const langLabel = activeFile ? (LANGUAGE_DISPLAY[activeFile.language] ?? activeFile.language) : "";
  const initials = useMemo(() => (role === "OWNER" ? "OW" : role === "WRITER" ? "ED" : "RD"), [role]);
  const updateEditorSettings = useCallback((next: EditorSettings) => {
    setEditorSettings(next);
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
      {closeConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#252526] border border-[#4e4e52] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white mb-1">Unsaved Changes</h3>
                <p className="text-gray-400 text-sm">
                  <span className="text-white font-medium">{closeConfirm.name}</span> has unsaved changes.
                  Do you want to save before closing?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white"
                onClick={() => setCloseConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-[#2a2d2e]"
                onClick={async () => {
                  const targetId = closeConfirm.fileId;
                  const saved = await handleSave(targetId);
                  if (saved) {
                    doCloseFile(targetId);
                  }
                }}
              >
                Save & Close
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => doCloseFile(closeConfirm.fileId)}
              >
                Discard & Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEditorSettings && (
        <EditorDashboard
          settings={editorSettings}
          onChange={updateEditorSettings}
          onClose={() => setShowEditorSettings(false)}
        />
      )}

      <div className="h-11 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between px-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            className="w-7 h-7 text-gray-400 hover:text-white hover:bg-[#2a2d2e]"
            onClick={() => setShowSidebar((v) => !v)}
            title="Toggle sidebar (Ctrl+B)"
          >
            {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </Button>

          <span className="text-sm text-gray-200">{projectName}</span>
          <span className="text-xs text-gray-600">·</span>
          <span className="text-xs text-gray-500">{langLabel}</span>

          <span className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
            collabStatus === "ready"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : collabStatus === "error"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                : "border-slate-500/30 bg-slate-500/10 text-slate-300"
          }`}>
            <Users className="w-3 h-3" />
            {collabPillLabel}
          </span>

          {activeFile && (
            <>
              <span className="text-xs text-gray-600">·</span>
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-xs text-yellow-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCheck className="w-3 h-3" /> Saved
                </span>
              )}
              {saveStatus === "unsaved" && (
                <span className="flex items-center gap-1 text-xs text-orange-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Unsaved
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs text-gray-300 hover:text-white hover:bg-[#2a2d2e] disabled:opacity-40"
            onClick={() => void handleSave()}
            disabled={readOnly || saveStatus === "saved" || saveStatus === "saving"}
            title="Save (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save
          </Button>

          <Button
            size="sm"
            className={`h-7 px-3 text-xs text-white transition-all ${
              isRunning
                ? "bg-green-700 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-500"
            }`}
            onClick={() => void handleRun()}
            disabled={isRunning}
            title="Run (Ctrl+Enter)"
          >
            {isRunning ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running…</>
            ) : (
              <><Play className="w-3.5 h-3.5 mr-1.5" />Run</>
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className={`w-7 h-7 hover:bg-[#2a2d2e] ${showAIPanel ? "text-indigo-400" : "text-gray-400 hover:text-white"}`}
            onClick={() => setShowAIPanel((v) => !v)}
            title="Toggle AI assistant"
          >
            <Bot className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className={`w-7 h-7 hover:bg-[#2a2d2e] ${showEditorSettings ? "text-indigo-400" : "text-gray-400 hover:text-white"}`}
            onClick={() => setShowEditorSettings(true)}
            title="Editor settings (Ctrl+,)"
          >
            <Settings className="w-4 h-4" />
          </Button>

          <Avatar className="w-7 h-7 ml-1">
            <AvatarFallback className="bg-indigo-600 text-white text-xs">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {fileError && (
        <div className="px-3 py-2 bg-red-950/20 border-b border-red-800/50 text-red-300 text-xs">
          {fileError}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {showSidebar && (
          <div className="w-72 bg-[#252526] border-r border-[#3e3e42] flex flex-col flex-shrink-0">
            <FileExplorer
              nodes={nodes}
              activeNodeId={activeFile?.id}
              readOnly={readOnly}
              busy={fileBusy || loading}
              onFileOpen={handleFileOpen}
              onCreateNode={handleCreateNode}
              onRenameNode={handleRenameNode}
              onDeleteNode={handleDeleteNode}
              onMoveNode={handleMoveNode}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <EditorTabs
            files={tabFiles}
            activeFileId={activeFileId}
            onTabClick={setActiveFileId}
            onTabClose={requestCloseFile}
          />

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading project...
              </div>
            ) : activeFile ? (
              <CodeEditor
                value={activeFile.content}
                language={activeFile.language}
                onChange={handleCodeChange}
                settings={editorSettings}
                readOnly={readOnly || collabStatus === "connecting" || collabStatus === "syncing"}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600">
                <div className="text-center space-y-3">
                  <File className="w-14 h-14 mx-auto opacity-15" />
                  <p className="text-sm">No file open</p>
                  <p className="text-xs opacity-70">Create or select a file from the explorer to start coding</p>
                  <div className="text-xs opacity-50 space-y-1 mt-4">
                    <p>Ctrl+S · Save &nbsp;&nbsp; Ctrl+Enter · Run</p>
                    <p>Ctrl+B · Sidebar &nbsp;&nbsp; Ctrl+J · Terminal</p>
                    <p>Ctrl+, · Settings</p>
                    <p>Alt+W · Close tab &nbsp;&nbsp; Alt+Tab · Next tab</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {showTerminal && (
            <div className="h-60 border-t border-[#3e3e42] flex-shrink-0">
              <TerminalPanel
                onClose={() => setShowTerminal(false)}
                isRunning={isRunning}
                executionResult={executionResult}
                stdin={stdin}
                onStdinChange={setStdin}
              />
            </div>
          )}

          {!showTerminal && (
            <div className="h-7 border-t border-[#3e3e42] bg-[#252526] flex items-center px-3 gap-3 flex-shrink-0">
              <button
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
                onClick={() => setShowTerminal(true)}
                title="Show terminal (Ctrl+J)"
              >
                <Clock className="w-3 h-3" />
                {executionResult ? (
                  <span className={executionResult.status === "accepted" ? "text-green-400" : "text-red-400"}>
                    {executionResult.status === "accepted" ? "✓ Accepted" : "✗ Error"} — {executionResult.executionTime}ms
                  </span>
                ) : (
                  <span>Terminal</span>
                )}
              </button>
            </div>
          )}
        </div>

        {showAIPanel && (
          <div className="w-88 bg-[#252526] border-l border-[#3e3e42] flex-shrink-0" style={{ width: "22rem" }}>
            <AIChatPanel onClose={() => setShowAIPanel(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
