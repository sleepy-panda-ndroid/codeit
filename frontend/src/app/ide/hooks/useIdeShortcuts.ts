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

      // Alt+W closes the active tab. (Alt+Tab is intentionally NOT bound here —
      // it's an OS-level window-switcher shortcut on Windows/Linux and is
      // intercepted before any web page ever receives the keystroke, so
      // binding it here would silently never fire. Ctrl+] is used instead,
      // below, since it isn't reserved by any major browser.)
      if (alt && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeFileId) onCloseFile(activeFileId);
      }

      if (ctrl && e.key === "]") {
        e.preventDefault();
        if (openFiles.length > 1) {
          const index = openFiles.findIndex((file) => file.id === activeFileId);
          onSetActiveFile(openFiles[(index + 1) % openFiles.length].id);
        }
      }
    };

    // Registered in the CAPTURE phase, not the default bubble phase. Monaco
    // (the code editor) aggressively captures and stops propagation on many
    // keydown events while it has focus — which is exactly when a user is
    // most likely to press one of these shortcuts (mid-edit). Capture-phase
    // registration runs this handler BEFORE Monaco's own internal handling,
    // so these shortcuts still fire even while the editor has focus.
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [activeFileId, onRun, onSave, isRunning, openFiles, onCloseFile, onToggleSidebar, onToggleTerminal, onOpenSettings, onSetActiveFile]);
}
