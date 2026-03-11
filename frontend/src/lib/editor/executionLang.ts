export type ExecutionLanguage =
  | "c"
  | "cpp"
  | "java"
  | "javascript"
  | "python";

export function detectExecutionLanguage(path: string): ExecutionLanguage | null {
  const p = path.toLowerCase();

  if (p.endsWith(".cpp") || p.endsWith(".cc") || p.endsWith(".cxx")) return "cpp";
  if (p.endsWith(".c")) return "c";
  if (p.endsWith(".java")) return "java";
  if (p.endsWith(".js") || p.endsWith(".jsx")) return "javascript";
  if (p.endsWith(".py")) return "python";

  return null;
}

export function getExecutionLabel(language: ExecutionLanguage | null) {
  if (!language) return "Unsupported";
  if (language === "cpp") return "C++";
  if (language === "c") return "C";
  if (language === "java") return "Java";
  if (language === "javascript") return "JavaScript";
  if (language === "python") return "Python";
  return language;
}