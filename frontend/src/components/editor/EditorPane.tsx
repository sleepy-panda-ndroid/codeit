"use client";

import Editor from "@monaco-editor/react";
import { guessLanguage } from "@/lib/editor/lang";

export function EditorPane({
  activePath,
  content,
  onChange,
  onSave,
  saving,
  dirty,
  readOnly,
}: {
  activePath: string;
  content: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  readOnly: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b px-3 py-2 flex items-center justify-between">
        <div className="text-sm">{activePath || "No file selected"}</div>

        <button
          className="bg-black text-white px-3 py-1 text-sm disabled:opacity-50"
          disabled={!activePath || saving || readOnly || !dirty}
          onClick={onSave}
        >
          {readOnly ? "Read-only" : saving ? "Saving..." : dirty ? "Save (Ctrl+S)" : "Saved"}
        </button>
      </div>

      <div className="flex-1">
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