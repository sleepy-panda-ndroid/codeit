"use client";

import { useEffect, useMemo, useState } from "react";
import { createFile, deleteFile, listFiles, saveFile, FileItem } from "@/lib/files";
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
  const [dirty, setDirty] = useState(false);

  const [stdin, setStdinState] = useState("");
  const [draftsByPath, setDraftsByPath] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  const [running, setRunning] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  const activeFile = useMemo(
    () => files.find((f) => f.path === activePath) || null,
    [files, activePath]
  );

  const executionLanguage: ExecutionLanguage | null = useMemo(() => {
    if (!activePath) return null;
    return detectExecutionLanguage(activePath);
  }, [activePath]);

  function setActivePath(path: string) {
    setActivePathState(path);
  }

  function setContent(value: string) {
    setContentState(value);
    if (activePath) {
      setDraftsByPath((prev) => ({
        ...prev,
        [activePath]: value,
      }));
    }
    setDirty(true);
  }

  function setStdin(value: string) {
    setStdinState(value);
  }

  function clearOutput() {
    setExecutionError(null);
    setExecutionResult(null);
  }

  useEffect(() => {
    const draft = loadDraft(projectId);
    if (draft) {
      setActivePathState(draft.activePath || "");
      setDraftsByPath(draft.contentByPath || {});
      setStdinState(draft.stdin || "");
    } else {
      setActivePathState("");
      setDraftsByPath({});
      setStdinState("");
    }
    setHydrated(true);
  }, [projectId]);

  useEffect(() => {
    if (!hydrated) return;

    saveDraft(projectId, {
      activePath,
      contentByPath: draftsByPath,
      stdin,
    });
  }, [projectId, activePath, draftsByPath, stdin, hydrated]);

  async function refresh() {
    const detail = await getProjectDetail(projectId);
    setProjectName(detail.project.name);
    setVisibility(detail.project.visibility);
    setRole(detail.role);

    const list = await listFiles(projectId);
    setFiles(list);

    if (list.length === 0) {
      setActivePathState("");
      setContentState("");
      setDirty(false);
      return;
    }

    const preferredPath =
      (activePath && list.some((f) => f.path === activePath) && activePath) ||
      (list.some((f) => f.path === loadDraft(projectId)?.activePath) &&
        loadDraft(projectId)?.activePath) ||
      list[0].path;

    const nextActivePath = preferredPath || list[0].path;
    const selectedFile = list.find((f) => f.path === nextActivePath) || list[0];

    setActivePathState(selectedFile.path);

    const draftContent = draftsByPath[selectedFile.path];
    const nextContent =
      typeof draftContent === "string" ? draftContent : selectedFile.content;

    setContentState(nextContent);
    setDirty(nextContent !== selectedFile.content);
  }

  useEffect(() => {
    if (!hydrated) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, hydrated]);

  useEffect(() => {
    if (!activePath) {
      setContentState("");
      setDirty(false);
      return;
    }

    const file = files.find((f) => f.path === activePath);
    if (!file) {
      setContentState("");
      setDirty(false);
      return;
    }

    const draftContent = draftsByPath[activePath];
    const nextContent =
      typeof draftContent === "string" ? draftContent : file.content;

    setContentState(nextContent);
    setDirty(nextContent !== file.content);
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

      await refresh();
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    if (!activePath) return;

    if (!executionLanguage) {
      setExecutionResult(null);
      setExecutionError("Execution is not supported for this file type.");
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
      setExecutionError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === "enter") {
        e.preventDefault();
        handleRun();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, activePath, readOnly, executionLanguage, stdin]);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  async function handleCreateFile(path: string) {
    if (readOnly) return;

    await createFile(projectId, path, "");
    setDraftsByPath((prev) => ({
      ...prev,
      [path]: "",
    }));

    await refresh();
    setActivePathState(path);
  }

  async function handleDeleteFile(path: string) {
    if (readOnly) return;

    await deleteFile(projectId, path);

    setDraftsByPath((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });

    setExecutionError(null);
    setExecutionResult(null);

    const remainingFiles = files.filter((f) => f.path !== path);

    if (activePath === path) {
      const nextActive = remainingFiles[0]?.path || "";
      setActivePathState(nextActive);
      setContentState("");
      setDirty(false);
    }

    await refresh();
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
    clearOutput,
  };
}