import { useCallback, useMemo, useState } from "react";
import type { ProjectNode } from "../../../lib/nodes";
import type { OpenFile } from "../ideTypes";
import { languageFromName, mapNodeToOpenFile } from "../ideUtils";

type CloseConfirm = { fileId: string; name: string } | null;

export type OpenFilesApi = {
  openFiles: OpenFile[];
  activeFileId: string;
  activeFile: OpenFile | null;
  tabFiles: Array<OpenFile & { unsaved: boolean }>;
  setActiveFileId: (id: string) => void;
  openFile: (node: ProjectNode) => void;
  closeFile: (id: string) => void;
  updateActiveContent: (value: string) => void;
  markSaved: (id: string, content: string) => void;
  initializeFiles: (files: OpenFile[], activeId: string) => void;
  renameFile: (id: string, name: string) => void;
  requestCloseFile: (id: string) => void;
  clearCloseConfirm: () => void;
  closeConfirm: CloseConfirm;
};

export function useOpenFiles(): OpenFilesApi {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState("");
  const [closeConfirm, setCloseConfirm] = useState<CloseConfirm>(null);

  const activeFile = openFiles.find((file) => file.id === activeFileId) ?? null;

  const initializeFiles = useCallback((files: OpenFile[], activeId: string) => {
    setOpenFiles(files);
    setActiveFileId(activeId);
  }, []);

  const updateActiveContent = useCallback((value: string) => {
    setOpenFiles((prev) => prev.map((file) => (
      file.id === activeFileId ? { ...file, content: value } : file
    )));
  }, [activeFileId]);

  const markSaved = useCallback((id: string, content: string) => {
    setOpenFiles((prev) => prev.map((file) => (
      file.id === id ? { ...file, content, savedContent: content } : file
    )));
  }, []);

  const openFile = useCallback((node: ProjectNode) => {
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

  const closeFile = useCallback((fileId: string) => {
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
    const file = openFiles.find((item) => item.id === fileId);
    if (!file) return;
    if (file.content !== file.savedContent) {
      setCloseConfirm({ fileId, name: file.name });
      return;
    }
    closeFile(fileId);
  }, [closeFile, openFiles]);

  const renameFile = useCallback((fileId: string, name: string) => {
    setOpenFiles((prev) => prev.map((file) => (
      file.id === fileId ? { ...file, name, language: languageFromName(name) } : file
    )));
  }, []);

  const clearCloseConfirm = useCallback(() => {
    setCloseConfirm(null);
  }, []);

  const tabFiles = useMemo(() => openFiles.map((file) => ({
    ...file,
    unsaved: file.content !== file.savedContent,
  })), [openFiles]);

  return {
    openFiles,
    activeFileId,
    activeFile,
    tabFiles,
    setActiveFileId,
    openFile,
    closeFile,
    updateActiveContent,
    markSaved,
    initializeFiles,
    renameFile,
    requestCloseFile,
    clearCloseConfirm,
    closeConfirm,
  };
}
