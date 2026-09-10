import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { apiFetch } from "../../lib/api";
import { executeProjectCode, type ExecutionLanguage } from "../../lib/execution";

type Sample = { input: string; output: string };

function normalizeText(value: string) {
  const lines = value.replace(/\r/g, "").split("\n").map((line) => line.replace(/[ \t]+$/, "")).filter((line) => line.trim() !== "");
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

function firstDifference(required: string, obtained: string) {
  const expectedLines = normalizeText(required).split("\n");
  const actualLines = normalizeText(obtained).split("\n");
  const length = Math.max(expectedLines.length, actualLines.length);
  for (let index = 0; index < length; index += 1) {
    if ((expectedLines[index] ?? "") !== (actualLines[index] ?? "")) return index;
  }
  return -1;
}

// Shared editable textarea with a line-numbered overlay that highlights the
// first mismatching line. `tone` controls the highlight color so the same
// component can mark "this is what it should say" (green, Required side)
// and "this is what you got, and it's wrong from here" (red, Obtained side).
function HighlightedTextarea({
  value,
  onChange,
  difference,
  tone,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  difference: number;
  tone: "red" | "green";
  ariaLabel: string;
}) {
  const lines = value.replace(/\r/g, "").split("\n");
  const highlightClass = tone === "red"
    ? "bg-red-500/20 text-red-200 border-l-2 border-red-400"
    : "bg-green-500/20 text-green-200 border-l-2 border-green-400";

  return (
    <div className="min-h-0 flex-1 rounded border border-[#3e3e42] bg-[#252526] overflow-hidden">
      <div className="relative h-full max-h-56 overflow-auto p-3 font-mono text-xs">
        <div className="pointer-events-none absolute inset-3" aria-hidden="true">
          {lines.map((line, index) => (
            <div
              key={index}
              className={`whitespace-pre-wrap pl-8 ${difference === index ? highlightClass : "text-transparent"}`}
            >
              <span className="absolute left-3 text-gray-600">{index + 1}</span>
              {line || " "}
            </div>
          ))}
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="relative min-h-24 h-full w-full resize-y bg-transparent pl-8 text-gray-300 outline-none"
          spellCheck={false}
          aria-label={ariaLabel}
        />
      </div>
    </div>
  );
}

export default function CPHPanel({ projectId, sourceCode, language, filePath }: { projectId: string; sourceCode: string; language: ExecutionLanguage | null; filePath: string }) {
  const [problem, setProblem] = useState("");
  const [tests, setTests] = useState<Sample[]>([]);
  const [inputText, setInputText] = useState("");
  const [requiredText, setRequiredText] = useState("");
  const [obtained, setObtained] = useState("");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const storageKey = `codeit:cph:${projectId}:${filePath}`;
  const difference = firstDifference(requiredText, obtained);
  const hasResult = obtained.length > 0;
  const valid = hasResult && difference === -1;
  const highlightIndex = hasResult ? difference : -1;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as { problem?: string; tests?: Sample[]; input?: string; required?: string } | null;
      if (saved?.tests?.length) { setProblem(saved.problem ?? ""); setTests(saved.tests); setInputText(saved.input ?? normalizeText(saved.tests.map((test) => test.input).join("\n"))); setRequiredText(saved.required ?? normalizeText(saved.tests.map((test) => test.output).join("\n"))); }
    } catch { /* Ignore malformed local CPH state. */ }
  }, [storageKey]);
  useEffect(() => {
    if (tests.length) localStorage.setItem(storageKey, JSON.stringify({ problem, tests, input: inputText, required: requiredText }));
  }, [inputText, problem, requiredText, storageKey, tests]);

  const loadTests = async () => {
    setLoading(true); setError("");
    try { const result = await apiFetch<{ tests: Sample[] }>(`/projects/${projectId}/cph/samples?problem=${encodeURIComponent(problem)}`); const nextTests = result.tests.map((test) => ({ input: normalizeText(test.input), output: normalizeText(test.output) })); setTests(nextTests); setInputText(normalizeText(nextTests.map((test) => test.input).join("\n"))); setRequiredText(normalizeText(nextTests.map((test) => test.output).join("\n"))); setObtained(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load samples"); }
    finally { setLoading(false); }
  };
  const run = async () => {
    if (!language || !tests.length) return;
    setRunning(true); setError(""); setObtained("");
    try {
      const result = await executeProjectCode(projectId, { sourceCode, language, filePath, stdin: inputText });
      setObtained(result.stdout ?? result.stderr ?? result.compileOutput ?? result.message ?? "");
    } catch (err) { setError(err instanceof Error ? err.message : "CPH run failed"); }
    finally { setRunning(false); }
  };

  return <div className="h-full flex flex-col gap-2 bg-[#1e1e1e] text-gray-200 p-2">
    <div className="flex gap-2 shrink-0"><input value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="Codeforces URL or 1234 A" className="min-w-0 flex-1 bg-[#252526] border border-[#3e3e42] rounded px-2 text-xs outline-none" /><Button size="sm" onClick={() => void loadTests()} disabled={loading || !problem.trim()}>{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Load"}</Button><Button size="sm" onClick={() => void run()} disabled={running || !tests.length || !language}><Play className="w-3 h-3 mr-1" />{running ? "Running" : "Run"}</Button></div>
    {error && <p className="shrink-0 text-xs text-red-300">{error}</p>}
    <section className="min-h-0 flex flex-col gap-2 flex-1"><h3 className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">Input</h3><textarea value={inputText} onChange={(event) => setInputText(event.target.value)} placeholder="Load a Codeforces problem to see all testcases." className="min-h-20 flex-1 resize-none overflow-auto rounded border border-[#3e3e42] bg-[#252526] p-3 font-mono text-xs text-gray-300 outline-none" spellCheck={false} /></section>
    <section className="min-h-0 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Output</h3>
            {hasResult && (valid ? 
            <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="w-3 h-3" />Valid
            </span> : 
            <span className="flex items-center gap-1 text-xs text-red-400">
                <XCircle className="w-3 h-3" />Invalid at line {difference + 1}</span>)}
        </div>
        <div className="min-h-0 flex gap-2 flex-1">
            <div className="min-h-0 flex-1 flex flex-col gap-1">
                <span className="text-xs text-gray-500">Required</span>
                <HighlightedTextarea
                  value={requiredText}
                  onChange={setRequiredText}
                  difference={highlightIndex}
                  tone="green"
                  ariaLabel="Required output"
                />
            </div>
            <div className="min-h-0 flex-1 flex flex-col gap-1">
                <span className="text-xs text-gray-500">Obtained</span>
                <HighlightedTextarea
                  value={obtained}
                  onChange={setObtained}
                  difference={highlightIndex}
                  tone="red"
                  ariaLabel="Obtained output"
                />
            </div>
        </div>
    </section>
  </div>;
}