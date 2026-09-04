export function normalizeFilePath(input: string): string | null {
  // collapse backslashes, strip leading slashes, collapse repeats, trim
  let p = input.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/{2,}/g, "/").trim();

  if (!p || p.length > 300) return null;
  if (p.endsWith("/")) return null;                 // no directory-only paths
  const segments = p.split("/");
  for (const seg of segments) {
    if (seg === "" || seg === "." || seg === "..") return null; // no traversal/empties
    if (/[\x00-\x1f]/.test(seg)) return null;        // no control chars
  }
  return p;
}