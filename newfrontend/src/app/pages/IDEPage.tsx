import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Play,
  Save,
  Share2,
  File,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  Bot,
  CheckCheck,
  Clock,
  AlertCircle,
  Settings,
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
  createFile,
  deleteFile,
  listFiles,
  renameFile,
  saveFile,
  type ProjectFile,
} from "../../lib/files";
import { executeProjectCode, type ExecutionLanguage } from "../../lib/execution";
import { getProject } from "../../lib/projects";

interface OpenFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  savedContent: string;
}

interface PersistedIdeState {
  openPaths: string[];
  activePath: string;
  drafts: Record<string, string>;
  stdin?: string;
  layout: {
    showSidebar: boolean;
    showAIPanel: boolean;
    showTerminal: boolean;
  };
}

type SaveStatus = "saved" | "saving" | "unsaved";
type Role = "OWNER" | "WRITER" | "READER";
type KeybindingPreset = EditorSettings["keybinding"];

const EDITOR_SETTINGS_STORAGE_KEY = "codeit:editor-dashboard-settings";

const KEYBINDING_PREVIEWS: Record<KeybindingPreset, Array<[string, string]>> = {
  default: [
    ["Ctrl+S", "Save"],
    ["Ctrl+Enter", "Run"],
    ["Ctrl+B", "Toggle Sidebar"],
    ["Ctrl+J", "Toggle Terminal"],
    ["Ctrl+,", "Editor Settings"],
  ],
  vim: [
    [":w", "Save file"],
    [":q", "Quit editor"],
    [":wq", "Save and quit"],
    ["dd", "Delete line"],
    ["gg / G", "Top / bottom"],
  ],
  emacs: [
    ["Ctrl+X Ctrl+S", "Save"],
    ["Ctrl+X K", "Close buffer"],
    ["Ctrl+A / Ctrl+E", "Line start / end"],
    ["Alt+W", "Copy region"],
    ["Ctrl+Y", "Paste"],
  ],
};

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
      keybindings?: EditorSettings["keybinding"];
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
      keybinding:
        parsed.keybinding ?? parsed.keybindings ?? DEFAULT_EDITOR_SETTINGS.keybinding,
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

function getLanguageFromPath(path: string): string {
  const p = path.toLowerCase();

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

function getExecutionLanguage(path: string): ExecutionLanguage | null {
  const p = path.toLowerCase();

  if (p.endsWith(".cpp") || p.endsWith(".cc") || p.endsWith(".cxx")) return "cpp";
  if (p.endsWith(".c")) return "c";
  if (p.endsWith(".java")) return "java";
  if (p.endsWith(".js") || p.endsWith(".jsx")) return "javascript";
  if (p.endsWith(".py")) return "python";

  return null;
}

function mapProjectFileToOpenFile(file: ProjectFile): OpenFile {
  const parts = file.path.split("/");
  return {
    id: file.path,
    name: parts[parts.length - 1] || file.path,
    path: file.path,
    language: getLanguageFromPath(file.path),
    content: file.content,
    savedContent: file.content,
  };
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
      openPaths: Array.isArray(parsed.openPaths) ? parsed.openPaths.filter((item): item is string => typeof item === "string") : [],
      activePath: typeof parsed.activePath === "string" ? parsed.activePath : "",
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

export default function IDEPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [projectName, setProjectName] = useState("Project");
  const [role, setRole] = useState<Role>("READER");
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);

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
  const [closeConfirm, setCloseConfirm] = useState<{ fileId: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileError, setFileError] = useState("");
  const hasHydratedProjectStateRef = useRef(false);

  const readOnly = role === "READER";

  const activeFile = openFiles.find((f) => f.id === activeFileId) ?? null;

  const loadProject = useCallback(async () => {
    if (!projectId) {
      navigate("/app", { replace: true });
      return;
    }

    setLoading(true);
    setFileError("");
    hasHydratedProjectStateRef.current = false;

    try {
      const [projectDetail, files] = await Promise.all([getProject(projectId), listFiles(projectId)]);
      const persisted = loadPersistedIdeState(projectId);

      setProjectName(projectDetail.project.name);
      setRole(projectDetail.role);
      setProjectFiles(files);

      if (persisted) {
        setShowSidebar(persisted.layout.showSidebar);
        setShowAIPanel(persisted.layout.showAIPanel);
        setShowTerminal(persisted.layout.showTerminal);
        setStdin(persisted.stdin ?? "");
      }

      const filesByPath = new Map(files.map((file) => [file.path, file] as const));
      const preferredPaths = persisted?.openPaths.filter((path) => filesByPath.has(path)) ?? [];
      const initialPaths = preferredPaths.length > 0
        ? preferredPaths
        : files[0]
          ? [files[0].path]
          : [];

      const restoredOpenFiles = initialPaths
        .map((path) => filesByPath.get(path))
        .filter((item): item is ProjectFile => !!item)
        .map((file) => {
          const backendMapped = mapProjectFileToOpenFile(file);
          const draft = persisted?.drafts?.[file.path];

          return {
            ...backendMapped,
            content: typeof draft === "string" ? draft : backendMapped.content,
          };
        });

      const preferredActive = persisted?.activePath;
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
    if (!projectId || !hasHydratedProjectStateRef.current || typeof window === "undefined") return;

    const drafts = openFiles.reduce<Record<string, string>>((accumulator, file) => {
      if (file.content !== file.savedContent) {
        accumulator[file.path] = file.content;
      }
      return accumulator;
    }, {});

    const state: PersistedIdeState = {
      openPaths: openFiles.map((file) => file.path),
      activePath: activeFileId,
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
    setOpenFiles((prev) => prev.map((f) => (f.id === activeFileId ? { ...f, content: value } : f)));
  }, [activeFileId]);

  const handleFileOpen = useCallback((file: { name: string; path: string; language?: string; content?: string }) => {
    setOpenFiles((prev) => {
      const existing = prev.find((item) => item.path === file.path);
      if (existing) {
        setActiveFileId(existing.id);
        return prev;
      }

      const nextFile: OpenFile = {
        id: file.path,
        name: file.name,
        path: file.path,
        language: file.language ?? getLanguageFromPath(file.path),
        content: file.content ?? "",
        savedContent: file.content ?? "",
      };

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
      await saveFile(projectId, target.path, contentToSave);

      setOpenFiles((prev) => prev.map((f) => (
        f.id === targetId ? { ...f, content: contentToSave, savedContent: contentToSave } : f
      )));

      setProjectFiles((prev) => prev.map((file) => (
        file.path === target.path ? { ...file, content: contentToSave, updatedAt: new Date().toISOString() } : file
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

  const handleCreateFile = useCallback(async (path: string) => {
    if (!projectId || readOnly) return;

    const trimmedPath = path.trim().replace(/^\/+/, "");
    if (!trimmedPath) {
      setFileError("File path is required");
      return;
    }

    if (projectFiles.some((file) => file.path === trimmedPath)) {
      setFileError("File path already exists");
      return;
    }

    setFileBusy(true);
    setFileError("");

    try {
      const created = await createFile(projectId, trimmedPath, "");

      const createdFile: ProjectFile = {
        id: created.id,
        path: created.path,
        content: created.content,
        updatedAt: new Date().toISOString(),
      };

      setProjectFiles((prev) => [...prev, createdFile]);

      handleFileOpen({
        name: created.path.split("/").pop() || created.path,
        path: created.path,
        language: getLanguageFromPath(created.path),
        content: created.content,
      });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to create file");
    } finally {
      setFileBusy(false);
    }
  }, [handleFileOpen, projectFiles, projectId, readOnly]);

  const handleRenameFile = useCallback(async (oldPath: string, newPath: string) => {
    if (!projectId || readOnly) return;

    const trimmedPath = newPath.trim().replace(/^\/+/, "");
    if (!trimmedPath || trimmedPath === oldPath) return;

    if (projectFiles.some((file) => file.path === trimmedPath && file.path !== oldPath)) {
      setFileError("File path already exists");
      return;
    }

    setFileBusy(true);
    setFileError("");

    try {
      await renameFile(projectId, oldPath, trimmedPath);

      setProjectFiles((prev) => prev.map((file) => (
        file.path === oldPath
          ? { ...file, path: trimmedPath, updatedAt: new Date().toISOString() }
          : file
      )));

      setOpenFiles((prev) => prev.map((f) => {
        if (f.path !== oldPath) return f;

        const name = trimmedPath.split("/").pop() || trimmedPath;
        return {
          ...f,
          id: trimmedPath,
          name,
          path: trimmedPath,
          language: getLanguageFromPath(trimmedPath),
        };
      }));

      if (activeFileId === oldPath) {
        setActiveFileId(trimmedPath);
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to rename file");
    } finally {
      setFileBusy(false);
    }
  }, [activeFileId, projectFiles, projectId, readOnly]);

  const handleDeleteFile = useCallback(async (path: string) => {
    if (!projectId || readOnly) return;

    setFileBusy(true);
    setFileError("");

    try {
      await deleteFile(projectId, path);

      setProjectFiles((prev) => prev.filter((file) => file.path !== path));

      const target = openFiles.find((f) => f.path === path);
      if (target) {
        doCloseFile(target.id);
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to delete file");
    } finally {
      setFileBusy(false);
    }
  }, [doCloseFile, openFiles, projectId, readOnly]);

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

    const executionLanguage = getExecutionLanguage(activeFile.path);
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
        filePath: activeFile.path,
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
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs text-gray-300 hover:text-white hover:bg-[#2a2d2e]"
            title="Share project"
            onClick={() => navigate(`/app/collaboration/${projectId}`)}
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Share
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
              files={projectFiles}
              activePath={activeFile?.path}
              readOnly={readOnly}
              busy={fileBusy || loading}
              onFileOpen={handleFileOpen}
              onCreateFile={handleCreateFile}
              onRenameFile={handleRenameFile}
              onDeleteFile={handleDeleteFile}
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

      <div className="h-6 bg-indigo-900/30 border-t border-[#3e3e42] flex items-center px-3 gap-4 flex-shrink-0">
        {KEYBINDING_PREVIEWS[editorSettings.keybinding].map(([key, label]) => (
          <span key={key} className="flex items-center gap-1 text-xs text-gray-500">
            <kbd className="px-1 py-0 bg-[#3e3e42] rounded text-gray-400 text-[10px]">{key}</kbd>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
