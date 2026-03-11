"use client";

import { useEffect, useMemo, useState } from "react";
import { createFile, deleteFile, listFiles, saveFile, FileItem } from "@/lib/files";
import { getProjectDetail } from "@/lib/projectDetail";

export function useProjectEditor(projectId: string) {
  const [projectName, setProjectName] = useState("");
  const [visibility, setVisibility] = useState("");
  const [role, setRole] = useState<"OWNER" | "WRITER" | "READER" | "">("");
  const readOnly = role === "READER";

  const [files, setFiles] = useState<FileItem[]>([]);
  const [activePath, setActivePath] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const activeFile = useMemo(
    () => files.find((f) => f.path === activePath) || null,
    [files, activePath]
  );

  async function refresh() {
    const detail = await getProjectDetail(projectId);
    setProjectName(detail.project.name);
    setVisibility(detail.project.visibility);
    setRole(detail.role);

    const list = await listFiles(projectId);
    setFiles(list);

    if (!activePath && list.length > 0) {
      setActivePath(list[0].path);
      setContent(list[0].content);
      setDirty(false);
      return;
    }

    const still = list.find((f) => f.path === activePath);
    if (still) {
      setContent(still.content);
      setDirty(false);
    }
  }

  // load when project changes
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // when switching files, load its content
  useEffect(() => {
    if (!activeFile) return;
    setContent(activeFile.content);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile?.path]);

  async function handleSave() {
    if (!activeFile || readOnly) return;
    setSaving(true);
    try {
      await saveFile(projectId, activeFile.path, content);
      await refresh();
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  // Ctrl+S save
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, activeFile?.path, readOnly]);

  // Warn before leaving if dirty
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
    await refresh();
    setActivePath(path);
  }

  async function handleDeleteFile(path: string) {
    if (readOnly) return;
    await deleteFile(projectId, path);
    if (activePath === path) {
      setActivePath("");
      setContent("");
      setDirty(false);
    }
    await refresh();
  }

  return {
    // project meta
    projectName,
    visibility,
    role,
    readOnly,

    // file state
    files,
    activePath,
    setActivePath,
    activeFile,

    content,
    setContent: (v: string) => {
      setContent(v);
      setDirty(true);
    },

    saving,
    dirty,

    // actions
    refresh,
    handleSave,
    handleCreateFile,
    handleDeleteFile,
  };
}