import { useCallback, useState } from "react";
import { executeProjectCode } from "../../../lib/execution";
import type { OpenFile } from "../ideTypes";
import type { ExecutionResult } from "../../components/TerminalPanel";
import { executionLanguageFromName, getExecutionErrorStatus, mapExecutionResultToTerminal } from "../ideUtils";

export function useCodeExecution(
  projectId: string | undefined,
  activeFile: OpenFile | null,
  stdin: string,
  setShowTerminal: (value: boolean) => void,
) {
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  const handleRun = useCallback(async () => {
    if (!projectId || !activeFile || isRunning) return;

    if (!activeFile.content.trim()) {
      setExecutionResult({ output: "", exitCode: 1, executionTime: 0, status: "empty_file", errorMessage: "Cannot execute an empty file.\nPlease write some code first." });
      setShowTerminal(true);
      return;
    }

    const executionLanguage = executionLanguageFromName(activeFile.name);
    if (!executionLanguage) {
      setExecutionResult({ output: "", exitCode: 1, executionTime: 0, status: "unsupported_language", errorMessage: "This file type is not supported for execution. Use .js, .py, .java, .c, or .cpp files." });
      setShowTerminal(true);
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    setShowTerminal(true);

    try {
      const result = await executeProjectCode(projectId, {
        sourceCode: activeFile.content,
        language: executionLanguage,
        filePath: activeFile.name,
        stdin: stdin || undefined,
      });
      setExecutionResult(mapExecutionResultToTerminal(result));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Execution failed";
      const normalizedMessage = /temporarily unavailable|fetch failed|network|timeout|Judge0/i.test(message)
        ? "Code execution service is temporarily unavailable. Please try again in a moment."
        : /compile|syntax|error/i.test(message)
          ? `Your code could not be compiled. ${message}`
          : "Your code could not be executed. Please check for syntax or runtime issues and try again.";
      const status = getExecutionErrorStatus(message);
      setExecutionResult({ output: "", exitCode: -1, executionTime: 0, status, errorMessage: normalizedMessage });
    } finally {
      setIsRunning(false);
    }
  }, [activeFile, isRunning, projectId, stdin]);

  return { isRunning, executionResult, setExecutionResult, handleRun };
}
