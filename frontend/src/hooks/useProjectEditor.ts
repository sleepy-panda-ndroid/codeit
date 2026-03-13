"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createFile,
  deleteFile,
  listFiles,
  saveFile,
  renameFile,
  FileItem,
} from "@/lib/files";
import { getProjectDetail } from "@/lib/projectDetail";
import { executeProjectCode, type ExecutionResult } from "@/lib/execution";
import {
  detectExecutionLanguage,
  type ExecutionLanguage,
} from "@/lib/editor/executionLang";

type Role = "OWNER" | "WRITER" | "READER" | "";

type EditorDraftState = {
  activePath: string;
  contentByPath: Record<string, string>;
  stdin: string;
  openPaths: string[];
};

function getStorageKey(projectId: string) {
  return `codeit:editor:${projectId}`;
}

function loadDraft(projectId: string): EditorDraftState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as EditorDraftState;

    return {
      activePath: typeof parsed.activePath === "string" ? parsed.activePath : "",
      contentByPath:
        parsed.contentByPath && typeof parsed.contentByPath === "object"
          ? parsed.contentByPath
          : {},
      stdin: typeof parsed.stdin === "string" ? parsed.stdin : "",
      openPaths: Array.isArray(parsed.openPaths)
        ? parsed.openPaths.filter((path) => typeof path === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function saveDraft(projectId: string, draft: EditorDraftState) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(draft));
  } catch {
    // ignore storage errors
  }
}

export function useProjectEditor(projectId: string) {
  const [projectName, setProjectName] = useState("");
  const [visibility, setVisibility] = useState("");
  const [role, setRole] = useState<Role>("");
  const readOnly = role === "READER";

  const [files, setFiles] = useState<FileItem[]>([]);
  const [activePath, setActivePathState] = useState("");
  const [content, setContentState] = useState("");
  const [saving, setSaving] = useState(false);
  const [openPaths, setOpenPaths] = useState<string[]>([]);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [stdin, setStdinState] = useState("");
  const [draftsByPath, setDraftsByPath] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  const [running, setRunning] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  const fileByPath = useMemo(() => {
    return new Map(files.map((file) => [file.path, file]));
  }, [files]);

  const activeFile = useMemo(
    () => fileByPath.get(activePath) || null,
    [fileByPath, activePath]
  );

  const isPathDirty = useCallback(
    (path: string) => {
      if (!path) return false;
      const draft = draftsByPath[path];
      if (typeof draft !== "string") return false;
      const file = fileByPath.get(path);
      if (!file) return true;
      return draft !== file.content;
    },
    [draftsByPath, fileByPath]
  );

  const dirty = activePath ? isPathDirty(activePath) : false;
  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(draftsByPath).some((path) => isPathDirty(path));
  }, [draftsByPath, isPathDirty]);

  const executionLanguage: ExecutionLanguage | null = useMemo(() => {
    if (!activePath) return null;
    return detectExecutionLanguage(activePath);
  }, [activePath]);

  function setActivePath(path: string) {
    setActivePathState(path);
    if (path) {
      setOpenPaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    }
  }

  function setContent(value: string) {
    setContentState(value);
    if (activePath) {
      setDraftsByPath((prev) => ({
        ...prev,
        [activePath]: value,
      }));
    }
  }

  function setStdin(value: string) {
    setStdinState(value);
  }

  function clearOutput() {
    setExecutionError(null);
    setExecutionResult(null);
  }

  function clearFileError() {
    setFileError(null);
  }
/*
Drafts are rehydrated from localStorage on load and saved on every change to ensure that unsaved changes are not lost on page refresh or accidental navigation. The useEffect hooks handle this synchronization between the component state and localStorage, keyed by the projectId to isolate drafts for different projects.
*/
  useEffect(() => {
    const draft = loadDraft(projectId);
    if (draft) {
      setActivePathState(draft.activePath || "");
      setDraftsByPath(draft.contentByPath || {});
      setStdinState(draft.stdin || "");
      setOpenPaths(draft.openPaths || []);
    } else {
      setActivePathState("");
      setDraftsByPath({});
      setStdinState("");
      setOpenPaths([]);
    }
    setHydrated(true);
  }, [projectId]);

  useEffect(() => {
    if (!hydrated) return;

    saveDraft(projectId, {
      activePath,
      contentByPath: draftsByPath,
      stdin,
      openPaths,
    });
  }, [projectId, activePath, draftsByPath, stdin, openPaths, hydrated]);

  async function refresh(options?: {
    preferredActivePath?: string;
    preferredOpenPaths?: string[];
  }) {
    const detail = await getProjectDetail(projectId);
    setProjectName(detail.project.name);
    setVisibility(detail.project.visibility);
    setRole(detail.role);

    const list = await listFiles(projectId);
    setFiles(list);

    if (list.length === 0) {
      setActivePathState("");
      setContentState("");
      setOpenPaths([]);
      return;
    }

    const availablePaths = new Set(list.map((file) => file.path));
    const preferredOpenPaths = options?.preferredOpenPaths ?? openPaths;
    const nextOpenPaths = preferredOpenPaths.filter((path) => availablePaths.has(path));

    const preferredActivePath = options?.preferredActivePath ?? activePath;
    const resolvedActivePath =
      (preferredActivePath && availablePaths.has(preferredActivePath)
        ? preferredActivePath
        : nextOpenPaths[0]) || list[0].path;

    const finalOpenPaths = nextOpenPaths.includes(resolvedActivePath)
      ? nextOpenPaths
      : [...nextOpenPaths, resolvedActivePath];

    setOpenPaths(finalOpenPaths);

    const selectedFile = list.find((f) => f.path === resolvedActivePath) || list[0];
    setActivePathState(selectedFile.path);

    const draftContent = draftsByPath[selectedFile.path];
    const nextContent =
      typeof draftContent === "string" ? draftContent : selectedFile.content;

    setContentState(nextContent);
  }

  useEffect(() => {
    if (!hydrated) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, hydrated]);

  useEffect(() => {
    if (!activePath) {
      setContentState("");
      return;
    }

    const file = files.find((f) => f.path === activePath);
    if (!file) {
      setContentState("");
      return;
    }

    const draftContent = draftsByPath[activePath];
    const nextContent =
      typeof draftContent === "string" ? draftContent : file.content;

    setContentState(nextContent);
    setExecutionError(null);
    setExecutionResult(null);
  }, [activePath, files, draftsByPath]);

  async function handleSave() {
    if (!activeFile || readOnly) return;

    setSaving(true);
    try {
      await saveFile(projectId, activeFile.path, content);

      setDraftsByPath((prev) => {
        const next = { ...prev };
        delete next[activeFile.path];
        return next;
      });

      await refresh({
        preferredActivePath: activeFile.path,
        preferredOpenPaths: openPaths,
      });
    } finally {
      setSaving(false);
    }
  }
/*The handleRun function performs several checks before attempting to execute the code. It verifies that there is an active file, that the language is supported, and that the content is not empty. If any of these checks fail, it sets an appropriate error message. If all checks pass, it calls the executeProjectCode function and handles any errors that may arise, categorizing them based on their messages to provide more user-friendly feedback.
*/
  async function handleRun() {
    if (!activePath) return;

    if (!executionLanguage) {
      setExecutionResult(null);
      setExecutionError("Unsupported language.");
      return;
    }

    if (!content.trim()) {
      setExecutionResult(null);
      setExecutionError("Empty file execution is not allowed.");
      return;
    }

    setRunning(true);
    setExecutionError(null);
    setExecutionResult(null);

    try {
      const result = await executeProjectCode(projectId, {
        sourceCode: content,
        language: executionLanguage,
        stdin,
        filePath: activePath,
      });

      setExecutionResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Execution failed";

      if (message.includes("Unsupported execution language")) {
        setExecutionError("Unsupported language.");
      } else if (
        message.includes("Judge0") ||
        message.includes("RapidAPI") ||
        message.includes("Execution timed out")
      ) {
        setExecutionError(`Judge0 API error: ${message}`);
      } else if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError") ||
        message.includes("ECONNREFUSED") ||
        message.startsWith("HTTP 5")
      ) {
        setExecutionError(`Backend failure: ${message}`);
      } else {
        setExecutionError(message);
      }
    } finally {
      setRunning(false);
    }
  }

  // useEffect(() => {
  //   function onKeyDown(e: KeyboardEvent) {
  //     const key = e.key.toLowerCase();

  //     if ((e.ctrlKey || e.metaKey) && key === "s") {
  //       e.preventDefault();
  //       handleSave();
  //       return;
  //     }

  //     if ((e.ctrlKey || e.metaKey) && key === "enter") {
  //       e.preventDefault();
  //       handleRun();
  //     }
  //   }

  //   window.addEventListener("keydown", onKeyDown);
  //   return () => window.removeEventListener("keydown", onKeyDown);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [content, activePath, readOnly, executionLanguage, stdin]);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [hasUnsavedChanges]);

  async function handleCreateFile(path: string) {
    if (readOnly) return;
    const nextPath = path.trim();
    if (!nextPath) return;

    if (files.some((file) => file.path === nextPath)) {
      setFileError("File path already exists.");
      return;
    }

    setFileBusy(true);
    setFileError(null);

    try {
      await createFile(projectId, nextPath, "");

      setDraftsByPath((prev) => ({
        ...prev,
        [nextPath]: "",
      }));

      const nextOpenPaths = Array.from(new Set([...openPaths, nextPath]));
      setOpenPaths(nextOpenPaths);
      setActivePathState(nextPath);

      await refresh({
        preferredActivePath: nextPath,
        preferredOpenPaths: nextOpenPaths,
      });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to create file.");
    } finally {
      setFileBusy(false);
    }
  }

  async function handleDeleteFile(path: string) {
    if (readOnly) return;
    setFileBusy(true);
    setFileError(null);

    try {
      await deleteFile(projectId, path);

      setDraftsByPath((prev) => {
        const next = { ...prev };
        delete next[path];
        return next;
      });

      setExecutionError(null);
      setExecutionResult(null);

      const nextOpenPaths = openPaths.filter((p) => p !== path);
      setOpenPaths(nextOpenPaths);

      let nextActive = activePath;
      if (activePath === path) {
        const removedIndex = openPaths.indexOf(path);
        nextActive =
          nextOpenPaths[removedIndex] ||
          nextOpenPaths[removedIndex - 1] ||
          nextOpenPaths[0] ||
          "";
        setActivePathState(nextActive);
        setContentState("");
      }

      await refresh({
        preferredActivePath: nextActive,
        preferredOpenPaths: nextOpenPaths,
      });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to delete file.");
    } finally {
      setFileBusy(false);
    }
  }

  async function handleRenameFile(path: string, newPath: string) {
    if (readOnly) return;

    const trimmed = newPath.trim();
    if (!trimmed || trimmed === path) return;

    if (files.some((file) => file.path === trimmed)) {
      setFileError("File path already exists.");
      return;
    }

    setFileBusy(true);
    setFileError(null);

    try {
      await renameFile(projectId, path, trimmed);

      setDraftsByPath((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, path)) return prev;
        const next = { ...prev };
        next[trimmed] = next[path];
        delete next[path];
        return next;
      });

      const nextOpenPaths = openPaths.map((p) => (p === path ? trimmed : p));
      setOpenPaths(nextOpenPaths);

      const nextActive = activePath === path ? trimmed : activePath;
      if (nextActive !== activePath) setActivePathState(nextActive);

      await refresh({
        preferredActivePath: nextActive,
        preferredOpenPaths: nextOpenPaths,
      });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to rename file.");
    } finally {
      setFileBusy(false);
    }
  }

  function closeTab(path: string) {
    if (!path) return;

    if (typeof window !== "undefined" && isPathDirty(path)) {
      const ok = window.confirm(
        `"${path}" has unsaved changes. Close anyway?`
      );
      if (!ok) return;
    }

    setOpenPaths((prev) => {
      const index = prev.indexOf(path);
      if (index === -1) return prev;

      const next = prev.filter((p) => p !== path);

      if (activePath === path) {
        const nextActive = next[index] || next[index - 1] || next[0] || "";
        setActivePathState(nextActive);
      }

      return next;
    });
  }

  function switchTab(direction: 1 | -1) {
    if (openPaths.length === 0) return;

    const currentIndex = openPaths.indexOf(activePath);
    const startIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex =
      (startIndex + direction + openPaths.length) % openPaths.length;
    const nextPath = openPaths[nextIndex];
    if (nextPath) setActivePath(nextPath);
  }

  return {
    projectName,
    visibility,
    role,
    readOnly,

    files,
    activePath,
    setActivePath,
    activeFile,
    openPaths,
    isPathDirty,
    fileBusy,
    fileError,

    content,
    setContent,

    saving,
    dirty,

    stdin,
    setStdin,

    executionLanguage,
    running,
    executionError,
    executionResult,

    refresh,
    handleSave,
    handleRun,
    handleCreateFile,
    handleDeleteFile,
    handleRenameFile,
    closeTab,
    switchTab,
    clearFileError,
    clearOutput,
  };
}