"use client";

import { useRef, useState } from "react";
import { FileSidebar } from "@/components/editor/FileSidebar";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import type { FileItem } from "@/lib/files";
import type { ExecutionLanguage } from "@/lib/editor/executionLang";
import type { ExecutionResult } from "@/lib/execution";

const MIN_LEFT_WIDTH = 180;
const MAX_LEFT_WIDTH = 420;

export function IDELayout({
  files,
  activePath,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onBack,
  readOnly,
  content,
  onChangeContent,
  onSave,
  saving,
  dirty,
  onRun,
  running,
  executionLanguage,
  executionResult,
  executionError,
  stdin,
  onChangeStdin,
  onClearOutput,
}: {
  files: FileItem[];
  activePath: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onBack: () => void;
  readOnly: boolean;
  content: string;
  onChangeContent: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  onRun: () => void;
  running: boolean;
  executionLanguage: ExecutionLanguage | null;
  executionResult: ExecutionResult | null;
  executionError: string | null;
  stdin: string;
  onChangeStdin: (v: string) => void;
  onClearOutput: () => void;
}) {
  const layoutRef = useRef<HTMLDivElement | null>(null);

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [leftWidth, setLeftWidth] = useState(260);

  function startLeftResize(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();

    function onMove(ev: MouseEvent) {
      if (!layoutRef.current) return;

      const rect = layoutRef.current.getBoundingClientRect();
      const nextWidth = ev.clientX - rect.left;

      setLeftWidth(
        Math.max(MIN_LEFT_WIDTH, Math.min(MAX_LEFT_WIDTH, nextWidth))
      );
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div ref={layoutRef} className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
      {!leftCollapsed && (
        <>
          <div
            className="shrink-0 min-h-0 border-r bg-white"
            style={{ width: `${leftWidth}px` }}
          >
            <FileSidebar
              files={files}
              activePath={activePath}
              onSelect={onSelectFile}
              onCreate={onCreateFile}
              onDelete={onDeleteFile}
              onBack={onBack}
              readOnly={readOnly}
            />
          </div>

          <div
            className="w-1.5 shrink-0 cursor-col-resize bg-gray-200 hover:bg-gray-400 transition-colors"
            onMouseDown={startLeftResize}
            title="Resize files panel"
          />
        </>
      )}

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="border-b px-3 py-2 flex items-center justify-between bg-white shrink-0">
          <div className="text-sm font-medium">Editor</div>

          <button
            className="border px-2 py-1 text-xs"
            onClick={() => setLeftCollapsed((v) => !v)}
            type="button"
          >
            {leftCollapsed ? "Show Files" : "Hide Files"}
          </button>
        </div>

        <div className="flex-1 min-h-0 min-w-0">
          <EditorWorkspace
            activePath={activePath}
            content={content}
            onChange={onChangeContent}
            onSave={onSave}
            saving={saving}
            dirty={dirty}
            readOnly={readOnly}
            onRun={onRun}
            running={running}
            executionLanguage={executionLanguage}
            executionResult={executionResult}
            executionError={executionError}
            stdin={stdin}
            onChangeStdin={onChangeStdin}
            onClearOutput={onClearOutput}
          />
        </div>
      </div>
    </div>
  );
}