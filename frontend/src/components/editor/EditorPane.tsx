"use client";

import Editor from "@monaco-editor/react";
import { guessLanguage } from "@/lib/editor/lang";
import { getExecutionLabel, type ExecutionLanguage } from "@/lib/editor/executionLang";

export function EditorPane({
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
}) {
  const canRun = !!activePath && !!executionLanguage && !running;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b px-3 py-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm truncate">{activePath || "No file selected"}</div>
          <div className="text-xs text-gray-500">
            Run language: {getExecutionLabel(executionLanguage)}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            className="border px-3 py-1 text-sm disabled:opacity-50"
            disabled={!canRun}
            onClick={onRun}
            title={
              executionLanguage
                ? "Run current file"
                : "Execution is not supported for this file type"
            }
          >
            {running ? "Running..." : "Run (Ctrl+Enter)"}
          </button>

          <button
            className="bg-black text-white px-3 py-1 text-sm disabled:opacity-50"
            disabled={!activePath || saving || readOnly || !dirty}
            onClick={onSave}
          >
            {readOnly ? "Read-only" : saving ? "Saving..." : dirty ? "Save (Ctrl+S)" : "Saved"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          theme="vs-dark"
          language={activePath ? guessLanguage(activePath) : "plaintext"}
          value={content}
          onChange={(v) => onChange(v ?? "")}
          options={{
            readOnly,
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}