export function guessLanguage(path: string) {
  const p = path.toLowerCase();
  if (p.endsWith(".ts")) return "typescript";
  if (p.endsWith(".tsx")) return "typescript";
  if (p.endsWith(".js")) return "javascript";
  if (p.endsWith(".jsx")) return "javascript";
  if (p.endsWith(".json")) return "json";
  if (p.endsWith(".py")) return "python";
  if (p.endsWith(".java")) return "java";
  if (p.endsWith(".cpp") || p.endsWith(".cc") || p.endsWith(".cxx")) return "cpp";
  if (p.endsWith(".c")) return "c";
  if (p.endsWith(".html")) return "html";
  if (p.endsWith(".css")) return "css";
  return "plaintext";
}