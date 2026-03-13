"use client";

import { useMemo, useState } from "react";
import type { ExecutionResult } from "@/lib/execution";

type TerminalTab = "input" | "output" | "error" | "terminal";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`px-3 py-1.5 text-sm border-r ${
        active ? "bg-white font-medium" : "bg-gray-100 text-gray-600"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function buildOutputText(result: ExecutionResult | null) {
  if (!result) return "No output yet.";

  if (result.stdout) return result.stdout;
  if (result.compileOutput) return result.compileOutput;
  if (result.message) return result.message;
  if (result.stderr) return result.stderr;

  return "Program finished with no output.";
}

function buildErrorText(result: ExecutionResult | null, error: string | null) {
  if (error) return error;
  if (!result) return "No errors yet.";

  const chunks = [result.stderr, result.compileOutput, result.message].filter(Boolean);
  return chunks.length ? chunks.join("\n\n") : "No errors.";
}

export function TerminalPanel({
  loading,
  result,
  error,
  stdin,
  onChangeStdin,
  onClear,
}: {
  loading: boolean;
  result: ExecutionResult | null;
  error: string | null;
  stdin: string;
  onChangeStdin: (value: string) => void;
  onClear: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TerminalTab>("output");

  const outputText = useMemo(() => buildOutputText(result), [result]);
  const errorText = useMemo(() => buildErrorText(result, error), [result, error]);
  const statusLabel = loading
    ? "Running"
    : result
    ? result.status.description
    : error
    ? "Failed"
    : "Idle";
  const timeLabel = result?.time ? `${result.time}s` : "-";
  const exitLabel = result?.exitCode ?? "-";

  async function handleImportInputFile(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      onChangeStdin(text);
      setActiveTab("input");
    } catch {
      alert("Failed to read input file.");
    } finally {
      e.target.value = "";
    }
  }

  function handleExportOutput() {
    const blob = new Blob([outputText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "codeit-output.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  async function handleCopyOutput() {
    try {
      await navigator.clipboard.writeText(outputText);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = outputText;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }

  return (
    <div className="h-full flex flex-col border-t bg-gray-50 min-h-0">
      <div className="flex items-center justify-between border-b bg-white">
        <div className="flex items-center overflow-x-auto">
          <TabButton active={activeTab === "input"} onClick={() => setActiveTab("input")}>
            Input
          </TabButton>
          <TabButton active={activeTab === "output"} onClick={() => setActiveTab("output")}>
            Output
          </TabButton>
          <TabButton active={activeTab === "error"} onClick={() => setActiveTab("error")}>
            Error
          </TabButton>
          <TabButton active={activeTab === "terminal"} onClick={() => setActiveTab("terminal")}>
            Terminal
          </TabButton>
        </div>

        <div className="flex items-center gap-2 px-2 py-1.5">
          {activeTab === "input" && (
            <label className="border px-2 py-1 text-xs cursor-pointer">
              Import Input
              <input
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={handleImportInputFile}
              />
            </label>
          )}

          {activeTab === "output" && (
            <>
              <button
                className="border px-2 py-1 text-xs"
                onClick={handleCopyOutput}
                type="button"
              >
                Copy Output
              </button>
              <button
                className="border px-2 py-1 text-xs"
                onClick={handleExportOutput}
                type="button"
              >
                Export Output
              </button>
            </>
          )}

          <button
            className="border px-2 py-1 text-xs disabled:opacity-50"
            onClick={onClear}
            disabled={loading}
            type="button"
          >
            Clear
          </button>

          <div className="text-xs text-gray-600 text-right">
            <div>Status: {statusLabel}</div>
            <div>Time: {timeLabel}</div>
            <div>Exit: {exitLabel}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white">
        {activeTab === "input" && (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide text-gray-600">
              Standard Input
            </div>
            <textarea
              className="flex-1 w-full p-3 text-sm outline-none resize-none font-mono"
              placeholder={"Type program input here...\nExample:\n5\n1 2 3 4 5"}
              value={stdin}
              onChange={(e) => onChangeStdin(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {activeTab === "output" && (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide text-gray-600">
              Standard Output
            </div>
            <pre className="flex-1 overflow-auto p-3 text-sm whitespace-pre-wrap break-words font-mono">
              {loading ? "Executing current file..." : outputText}
            </pre>
          </div>
        )}

        {activeTab === "error" && (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide text-gray-600">
              Errors / Diagnostics
            </div>
            <pre className="flex-1 overflow-auto p-3 text-sm whitespace-pre-wrap break-words font-mono">
              {loading ? "Waiting for result..." : errorText}
            </pre>
          </div>
        )}

        {activeTab === "terminal" && (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide text-gray-600">
              Terminal
            </div>
            <div className="flex-1 overflow-auto p-3 text-sm text-gray-500 font-mono">
              Terminal support will be added later.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}