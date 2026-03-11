import { apiFetch } from "@/lib/api";
import type { ExecutionLanguage } from "@/lib/editor/executionLang";

export type ExecutePayload = {
  sourceCode: string;
  language: ExecutionLanguage;
  stdin?: string;
  filePath?: string;
};

export type ExecutionResult = {
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string | null;
  memory: number | null;
  exitCode: number | null;
};

type ExecuteResponse = {
  ok: boolean;
  result: ExecutionResult;
};

export async function executeProjectCode(
  projectId: string,
  payload: ExecutePayload
) {
  const res = await apiFetch<ExecuteResponse>(`/projects/${projectId}/execute`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.result;
}