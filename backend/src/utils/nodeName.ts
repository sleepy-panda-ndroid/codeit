const RESERVED = new Set([".", ".."]);

export function normalizeNodeName(input: string): string | null {
  if (typeof input !== "string") return null;

  const name = input.trim();

  if (!name || name.length > 255) return null;
  if (name.includes("/") || name.includes("\\")) return null; // single segment only
  if (RESERVED.has(name)) return null;                         // no . or ..
  if (/[\x00-\x1f]/.test(name)) return null;                   // no control chars

  return name;
}