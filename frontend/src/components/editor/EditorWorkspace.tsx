"use client";

import { useRef, useState } from "react";
import { EditorPane } from "@/components/editor/EditorPane";
import { TerminalPanel } from "@/components/editor/TerminalPanel";
import type { ExecutionResult } from "@/lib/execution";
import type { ExecutionLanguage } from "@/lib/editor/executionLang";

const MIN_TERMINAL_HEIGHT = 140;
const MAX_TERMINAL_HEIGHT = 500;

export function EditorWorkspace({
  activePath,
  content,
  onChange,
  onSave,
  saving,
  dirty,
  readOnly,
  onRun,
  running,
  executionLanguage,
  executionResult,
  executionError,
  stdin,
  onChangeStdin,
  onClearOutput,
}: {
  activePath: string;
  content: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  readOnly: boolean;
  onRun: () => void;
  running: boolean;
  executionLanguage: ExecutionLanguage | null;
  executionResult: ExecutionResult | null;
  executionError: string | null;
  stdin: string;
  onChangeStdin: (v: string) => void;
  onClearOutput: () => void;
}) {
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(240);

  function startTerminalResize(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();

    function onMove(ev: MouseEvent) {
      if (!workspaceRef.current) return;

      const rect = workspaceRef.current.getBoundingClientRect();
      const nextHeight = rect.bottom - ev.clientY;

      setTerminalHeight(
        Math.max(MIN_TERMINAL_HEIGHT, Math.min(MAX_TERMINAL_HEIGHT, nextHeight))
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
    <div ref={workspaceRef} className="flex-1 min-w-0 min-h-0 flex flex-col">
      <div className="border-b px-3 py-2 flex items-center justify-between bg-white shrink-0">
        <div className="text-sm font-medium">Workspace</div>

        <button
          className="border px-2 py-1 text-xs"
          onClick={() => setTerminalCollapsed((v) => !v)}
          type="button"
        >
          {terminalCollapsed ? "Show Terminal" : "Hide Terminal"}
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <EditorPane
            activePath={activePath}
            content={content}
            onChange={onChange}
            onSave={onSave}
            saving={saving}
            dirty={dirty}
            readOnly={readOnly}
            onRun={onRun}
            running={running}
            executionLanguage={executionLanguage}
          />
        </div>

        {!terminalCollapsed && (
          <>
            <div
              className="h-1.5 cursor-row-resize bg-gray-200 hover:bg-gray-400 transition-colors shrink-0"
              onMouseDown={startTerminalResize}
              title="Resize terminal"
            />

            <div
              className="shrink-0 min-h-0"
              style={{ height: `${terminalHeight}px` }}
            >
              <TerminalPanel
                loading={running}
                result={executionResult}
                error={executionError}
                stdin={stdin}
                onChangeStdin={onChangeStdin}
                onClear={onClearOutput}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}