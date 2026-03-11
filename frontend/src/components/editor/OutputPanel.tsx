"use client";

import { useMemo, useRef } from "react";
import type { ExecutionResult } from "@/lib/execution";

function OutputBlock({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) {
  if (!value) return null;

  return (
    <div className="border rounded bg-white">
      <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide text-gray-600">
        {title}
      </div>
      <pre className="p-3 text-sm overflow-auto whitespace-pre-wrap break-words">
        {value}
      </pre>
    </div>
  );
}

function buildExportText(result: ExecutionResult | null, error: string | null) {
  if (error) {
    return `Run failed\n\n${error}\n`;
  }

  if (!result) {
    return "No output available.\n";
  }

  const parts: string[] = [];

  parts.push(`Status: ${result.status.description}`);
  parts.push(`Status ID: ${result.status.id}`);
  parts.push(`Time: ${result.time ?? "-"}`);
  parts.push(`Memory: ${result.memory != null ? result.memory : "-"}`);
  parts.push(`Exit Code: ${result.exitCode != null ? result.exitCode : "-"}`);

  if (result.stdout) {
    parts.push("\n=== Standard Output ===");
    parts.push(result.stdout);
  }

  if (result.stderr) {
    parts.push("\n=== Standard Error ===");
    parts.push(result.stderr);
  }

  if (result.compileOutput) {
    parts.push("\n=== Compilation Output ===");
    parts.push(result.compileOutput);
  }

  if (result.message) {
    parts.push("\n=== Message ===");
    parts.push(result.message);
  }

  if (
    !result.stdout &&
    !result.stderr &&
    !result.compileOutput &&
    !result.message
  ) {
    parts.push("\nProgram finished with no output.");
  }

  return `${parts.join("\n")}\n`;
}

export function OutputPanel({
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportText = useMemo(() => buildExportText(result, error), [result, error]);

  async function handleImportInputFile(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      onChangeStdin(text);
    } catch {
      alert("Failed to read input file.");
    } finally {
      e.target.value = "";
    }
  }

  function handleExportOutput() {
    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "codeit-output.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-80 border-t bg-gray-50 flex flex-col">
      <div className="px-3 py-2 border-b flex items-center justify-between bg-white">
        <div className="text-sm font-medium">Output</div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={handleImportInputFile}
          />

          <button
            className="border px-2 py-1 text-xs disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            Import Input
          </button>

          <button
            className="border px-2 py-1 text-xs"
            onClick={handleExportOutput}
          >
            Export Output
          </button>

          <button
            className="border px-2 py-1 text-xs disabled:opacity-50"
            onClick={onClear}
            disabled={loading}
          >
            Clear
          </button>

          <div className="text-xs text-gray-600 min-w-[110px] text-right">
            {loading
              ? "Running..."
              : result
              ? `Status: ${result.status.description}`
              : error
              ? "Run failed"
              : "No output yet"}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        <div className="border rounded bg-white">
          <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide text-gray-600">
            Standard Input
          </div>
          <textarea
            className="w-full p-3 text-sm outline-none resize-none"
            rows={5}
            placeholder={"Type program input here...\nExample:\n5\n1 2 3 4 5"}
            value={stdin}
            onChange={(e) => onChangeStdin(e.target.value)}
            disabled={loading}
          />
        </div>

        {loading && (
          <div className="text-sm text-gray-600">Executing current file...</div>
        )}

        {!loading && error && (
          <div className="border rounded bg-red-50 border-red-200 p-3 text-sm text-red-700 whitespace-pre-wrap break-words">
            {error}
          </div>
        )}

        {!loading && !error && result && (
          <>
            <div className="border rounded bg-white p-3 text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Status
                </div>
                <div className="font-medium">{result.status.description}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Time
                </div>
                <div className="font-medium">{result.time ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Memory
                </div>
                <div className="font-medium">
                  {result.memory != null ? result.memory : "-"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Exit Code
                </div>
                <div className="font-medium">
                  {result.exitCode != null ? result.exitCode : "-"}
                </div>
              </div>
            </div>

            <OutputBlock title="Standard Output" value={result.stdout} />
            <OutputBlock title="Standard Error" value={result.stderr} />
            <OutputBlock title="Compilation Output" value={result.compileOutput} />
            <OutputBlock title="Message" value={result.message} />

            {!result.stdout &&
              !result.stderr &&
              !result.compileOutput &&
              !result.message && (
                <div className="text-sm text-gray-600">
                  Program finished with no output.
                </div>
              )}
          </>
        )}

        {!loading && !error && !result && (
          <div className="text-sm text-gray-500">
            Enter input if needed, then click <span className="font-medium">Run</span>.
          </div>
        )}
      </div>
    </div>
  );
}