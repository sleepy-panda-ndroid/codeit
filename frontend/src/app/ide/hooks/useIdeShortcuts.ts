import { useEffect } from "react";
import type { OpenFile } from "../ideTypes";

type IdeShortcutsOptions = {
  activeFileId: string;
  openFiles: OpenFile[];
  isRunning: boolean;
  onSave: () => void;
  onRun: () => void;
  onToggleSidebar: () => void;
  onToggleTerminal: () => void;
  onOpenSettings: () => void;
  onCloseFile: (id: string) => void;
  onSetActiveFile: (id: string) => void;
};

export function useIdeShortcuts({
  activeFileId,
  openFiles,
  isRunning,
  onSave,
  onRun,
  onToggleSidebar,
  onToggleTerminal,
  onOpenSettings,
  onCloseFile,
  onSetActiveFile,
}: IdeShortcutsOptions): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;

      if (ctrl && e.key === "s") {
        e.preventDefault();
        onSave();
      }
      if (ctrl && e.key === "Enter") {
        e.preventDefault();
        if (!isRunning) onRun();
      }
      if (ctrl && e.key === "b") {
        e.preventDefault();
        onToggleSidebar();
      }
      if (ctrl && e.key === "j") {
        e.preventDefault();
        onToggleTerminal();
      }
      if (ctrl && e.key === ",") {
        e.preventDefault();
        onOpenSettings();
      }

    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFileId, onRun, onSave, isRunning, openFiles, onCloseFile, onToggleSidebar, onToggleTerminal, onOpenSettings]);
}
