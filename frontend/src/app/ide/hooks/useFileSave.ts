import { useCallback, useEffect, useState } from "react";
import { saveNode, type ProjectNode } from "../../../lib/nodes";
import type { OpenFile } from "../ideTypes";
import { formatContentOnSave } from "../ideUtils";
import type { OpenFilesApi } from "./useOpenFiles";

type SetNodes = (updater: (previous: ProjectNode[]) => ProjectNode[]) => void;

export function useFileSave(
  projectId: string | undefined,
  readOnly: boolean,
  formatOnSave: boolean,
  autoSave: boolean,
  autoSaveDelay: number,
  openFilesApi: OpenFilesApi,
  setNodes: SetNodes,
  setFileError: (value: string) => void,
) {
  const { activeFile, activeFileId, openFiles, markSaved } = openFilesApi;
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  useEffect(() => {
    if (!activeFile) {
      setSaveStatus("saved");
      return;
    }
    setSaveStatus(activeFile.content !== activeFile.savedContent ? "unsaved" : "saved");
  }, [activeFile?.content, activeFile?.savedContent]);

  const handleSave = useCallback(async (fileId?: string): Promise<boolean> => {
    if (!projectId || readOnly) return false;

    const targetId = fileId ?? activeFileId;
    const target = openFiles.find((file) => file.id === targetId);
    if (!target || target.content === target.savedContent) return true;

    const contentToSave = formatOnSave ? formatContentOnSave(target.content) : target.content;

    setSaveStatus("saving");
    setFileError("");

    try {
      await saveNode(projectId, target.id, contentToSave);
      markSaved(targetId, contentToSave);
      setNodes((previous) => previous.map((node) => (
        node.id === target.id ? { ...node, content: contentToSave, updatedAt: new Date().toISOString() } : node
      )));
      setSaveStatus("saved");
      return true;
    } catch (err) {
      setSaveStatus("unsaved");
      setFileError(err instanceof Error ? err.message : "Failed to save file");
      return false;
    }
  }, [activeFileId, formatOnSave, openFiles, projectId, readOnly]);

  useEffect(() => {
    if (!autoSave || readOnly || !activeFile || saveStatus === "saving") return;
    if (activeFile.content === activeFile.savedContent) return;

    const timeout = window.setTimeout(() => {
      void handleSave(activeFile.id);
    }, autoSaveDelay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    activeFile,
    autoSaveDelay,
    autoSave,
    handleSave,
    readOnly,
    saveStatus,
  ]);

  return { saveStatus, handleSave };
}
