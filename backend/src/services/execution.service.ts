import {
  createSubmission,
  pollSubmission,
  type Judge0SubmissionResult,
} from "./judge0.service";
import {
  judge0LanguageMap,
  type ExecutionLanguage,
} from "../utils/judge0LanguageMap";

export type ExecuteCodeInput = {
  sourceCode: string;
  language: ExecutionLanguage;
  stdin?: string;
};

export type ExecuteCodeResult = {
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

function normalizeJudge0Result(raw: Judge0SubmissionResult): ExecuteCodeResult {
  const decode = (value: string | null) => value ? Buffer.from(value, "base64").toString("utf8") : value;
  return {
    stdout: decode(raw.stdout),
    stderr: decode(raw.stderr),
    compileOutput: decode(raw.compile_output),
    message: decode(raw.message),
    status: raw.status
      ? {
          id: raw.status.id,
          description: raw.status.description,
        }
      : {
          id: -1,
          description: "Unknown",
        },
    time: raw.time ?? null,
    memory: raw.memory ?? null,
    exitCode: raw.exit_code ?? null,
  };
}

export async function executeCode(
  input: ExecuteCodeInput
): Promise<ExecuteCodeResult> {
  const languageId = judge0LanguageMap[input.language];

  if (!languageId) {
    throw new Error(`Unsupported execution language: ${input.language}`);
  }

  const created = await createSubmission({
    source_code: input.sourceCode,
    language_id: languageId,
    stdin: input.stdin ?? "",
  });

  const finalResult = await pollSubmission(created.token);

  return normalizeJudge0Result(finalResult);
}