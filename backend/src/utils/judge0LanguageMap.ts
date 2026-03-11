export type ExecutionLanguage =
  | "c"
  | "cpp"
  | "java"
  | "javascript"
  | "python";

export const judge0LanguageMap: Record<ExecutionLanguage, number> = {
  c: 50,
  cpp: 54,
  java: 62,
  javascript: 63,
  python: 71,
};

export function isExecutionLanguage(value: string): value is ExecutionLanguage {
  return ["c", "cpp", "java", "javascript", "python"].includes(value);
}