"use client";

import { useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
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
  tabs,
  onSelectTab,
  onCloseTab,
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
  tabs?: {
    path: string;
    label: string;
    dirty: boolean;
  }[];
  onSelectTab?: (path: string) => void;
  onCloseTab?: (path: string) => void;
}) {
  const runRef = useRef(onRun);
  const saveRef = useRef(onSave);

  useEffect(() => {
    runRef.current = onRun;
    saveRef.current = onSave;
  }, [onRun, onSave]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runRef.current();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveRef.current();
    });
  };

  const canRun = !!activePath && !!executionLanguage && !running;
  const saveState = readOnly
    ? "Read-only"
    : saving
    ? "Saving..."
    : dirty
    ? "Unsaved"
    : "Saved";

  return (
    <div className="h-full min-h-0 min-w-0 grid grid-rows-[auto_auto_minmax(0,1fr)] bg-white">
      <div className="border-b bg-gray-50">
        {tabs && tabs.length > 0 ? (
          <div className="flex items-center overflow-x-auto">
            {tabs.map((tab) => {
              const active = tab.path === activePath;
              return (
                <div
                  key={tab.path}
                  className={`flex items-center border-r ${
                    active ? "bg-white" : "bg-gray-100"
                  }`}
                >
                  <button
                    className={`px-3 py-2 text-sm truncate max-w-[220px] ${
                      active ? "font-medium" : "text-gray-600"
                    }`}
                    onClick={() => onSelectTab?.(tab.path)}
                    title={tab.path}
                    type="button"
                  >
                    <span>{tab.label}</span>
                    {tab.dirty && <span className="ml-2 text-xs text-orange-600">●</span>}
                  </button>

                  {onCloseTab && (
                    <button
                      className="px-2 text-xs text-gray-500 hover:text-black"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.path);
                      }}
                      title={`Close ${tab.path}`}
                      type="button"
                    >
                      x
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-3 py-2 text-sm font-medium">Editor</div>
        )}
      </div>

      <div className="border-b px-3 py-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm truncate">{activePath || "No file selected"}</div>
          <div className="text-xs text-gray-500">
            Run language: {getExecutionLabel(executionLanguage)}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-xs text-gray-500 min-w-[90px] text-right">{saveState}</div>

          <button
            className="border px-3 py-1 text-sm disabled:opacity-50"
            disabled={!canRun}
            onClick={onRun}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              {running && (
                <span className="inline-block h-3 w-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
              )}
              {running ? "Running..." : "Run (Ctrl+Enter)"}
            </span>
          </button>

          <button
            className="bg-black text-white px-3 py-1 text-sm disabled:opacity-50"
            disabled={!activePath || saving || readOnly || !dirty}
            onClick={onSave}
            type="button"
          >
            {readOnly ? "Read-only" : saving ? "Saving..." : dirty ? "Save (Ctrl+S)" : "Saved"}
          </button>
        </div>
      </div>

      <div className="min-h-0 min-w-0">
        <Editor
          height="100%"
          width="100%"
          theme="vs-dark"
          language={activePath ? guessLanguage(activePath) : "plaintext"}
          value={content}
          onChange={(v) => onChange(v ?? "")}
          onMount={handleEditorMount}
          options={{
            readOnly,
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}