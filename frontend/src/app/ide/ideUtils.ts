import type { Awareness } from "y-protocols/awareness";
import type { ProjectNode } from "../../lib/nodes";
import type { ExecutionLanguage } from "../../lib/execution";
import type { ExecutionResult } from "../components/TerminalPanel";
import type { AIChatContext } from "../../lib/ai";
import type { CollaboratorPresence, OpenFile, PersistedIdeState } from "./ideTypes";

export const EDITOR_SETTINGS_STORAGE_KEY = "codeit:editor-dashboard-settings";

export const LANGUAGE_DISPLAY: Record<string, string> = {
  javascript: "JavaScript", typescript: "TypeScript", python: "Python", java: "Java",
  c: "C", cpp: "C++", html: "HTML", css: "CSS", json: "JSON", markdown: "Markdown", plaintext: "Plain Text",
};

export function languageFromName(name: string): string {
  const path = name.toLowerCase();
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx") || path.endsWith(".js")) return "javascript";
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".java")) return "java";
  if (path.endsWith(".cpp") || path.endsWith(".cc") || path.endsWith(".cxx")) return "cpp";
  if (path.endsWith(".c")) return "c";
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

export function executionLanguageFromName(name: string): ExecutionLanguage | null {
  const path = name.toLowerCase();
  if (path.endsWith(".cpp") || path.endsWith(".cc") || path.endsWith(".cxx")) return "cpp";
  if (path.endsWith(".c")) return "c";
  if (path.endsWith(".java")) return "java";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".py")) return "python";
  return null;
}

export function mapNodeToOpenFile(node: ProjectNode): OpenFile {
  return { id: node.id, name: node.name, language: languageFromName(node.name), content: node.content, savedContent: node.content };
}

export function buildNodePathMap(nodes: ProjectNode[]): Map<string, string> {
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  const cache = new Map<string, string>();
  const resolvePath = (id: string): string => {
    const cached = cache.get(id);
    if (cached) return cached;
    const node = byId.get(id);
    if (!node) return "";
    const parentPath = node.parentId ? resolvePath(node.parentId) : "";
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;
    cache.set(id, path);
    return path;
  };
  nodes.forEach((node) => resolvePath(node.id));
  return cache;
}

export function truncateForAI(content: string, maxChars: number): string {
  return content.length <= maxChars ? content : `${content.slice(0, maxChars)}\n...[truncated]`;
}

export function collectLocalSubtreeIds(nodes: ProjectNode[], rootId: string): Set<string> {
  const childrenByParent = new Map<string | null, string[]>();
  nodes.forEach((node) => {
    const parent = node.parentId ?? null;
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
    childrenByParent.get(parent)!.push(node.id);
  });
  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    for (const childId of childrenByParent.get(id) ?? []) stack.push(childId);
  }
  return result;
}

export function mapExecutionResultToTerminal(result: Awaited<ReturnType<typeof import("../../lib/execution").executeProjectCode>>): ExecutionResult {
  const statusText = result.status.description.toLowerCase();
  const output = [result.stdout].filter(Boolean).join("\n");
  const errorMessage = [result.compileOutput, result.stderr, result.message].filter(Boolean).join("\n");
  const status: ExecutionResult["status"] = statusText.includes("accepted") ? "accepted" : statusText.includes("compile") ? "compilation_error" : "runtime_error";
  return { output, errorMessage, status, executionTime: result.time ? Math.max(0, Math.round(Number(result.time) * 1000)) : 0, exitCode: typeof result.exitCode === "number" ? result.exitCode : status === "accepted" ? 0 : 1 };
}

export function getIdeStorageKey(projectId: string): string { return `codeit:ide:${projectId}`; }

export function loadPersistedIdeState(projectId: string): PersistedIdeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getIdeStorageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedIdeState>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      openIds: Array.isArray(parsed.openIds) ? parsed.openIds.filter((item): item is string => typeof item === "string") : [],
      activeId: typeof parsed.activeId === "string" ? parsed.activeId : "",
      drafts: parsed.drafts && typeof parsed.drafts === "object" ? parsed.drafts as Record<string, string> : {},
      stdin: typeof parsed.stdin === "string" ? parsed.stdin : "",
      layout: { showSidebar: parsed.layout?.showSidebar ?? true, showAIPanel: parsed.layout?.showAIPanel ?? true, showTerminal: parsed.layout?.showTerminal ?? true },
    };
  } catch { return null; }
}

export function formatContentOnSave(content: string): string { return content.replace(/\r\n/g, "\n").split("\n").map((line) => line.replace(/[\t ]+$/g, "")).join("\n"); }
export function hashToColor(input: string): string { let hash = 0; for (let index = 0; index < input.length; index += 1) hash = (hash * 31 + input.charCodeAt(index)) | 0; return `hsl(${Math.abs(hash) % 360} 72% 58%)`; }
export function replaceTextContent(text: import("yjs").Text, nextValue: string): void {
  const currentValue = text.toString(); if (currentValue === nextValue) return;
  let prefix = 0; while (prefix < currentValue.length && prefix < nextValue.length && currentValue[prefix] === nextValue[prefix]) prefix += 1;
  let currentSuffix = currentValue.length - 1; let nextSuffix = nextValue.length - 1;
  while (currentSuffix >= prefix && nextSuffix >= prefix && currentValue[currentSuffix] === nextValue[nextSuffix]) { currentSuffix -= 1; nextSuffix -= 1; }
  const deleteCount = currentSuffix - prefix + 1; if (deleteCount > 0) text.delete(prefix, deleteCount);
  const insertValue = nextValue.slice(prefix, nextSuffix + 1); if (insertValue) text.insert(prefix, insertValue);
}
export function buildCollabWsUrl(projectId: string, nodeId: string, ticket: string): string { const url = new URL(`${(import.meta.env.VITE_API_BASE || "http://localhost:4000").replace(/^http/, "ws")}/ws/collab`); url.searchParams.set("ticket", ticket); url.searchParams.set("projectId", projectId); url.searchParams.set("nodeId", nodeId); return url.toString(); }
export function toCollaborators(awareness: Awareness): CollaboratorPresence[] { const byUserId = new Map<string, CollaboratorPresence>(); for (const [clientId, state] of awareness.getStates().entries()) { const user = state as Partial<CollaboratorPresence> | undefined; if (!user || typeof user.userId !== "string" || typeof user.name !== "string") continue; const entry = { clientId, userId: user.userId, name: user.name, email: typeof user.email === "string" ? user.email : "", color: typeof user.color === "string" ? user.color : hashToColor(user.userId) }; const existing = byUserId.get(user.userId); if (!existing || clientId > existing.clientId) byUserId.set(user.userId, entry); } return Array.from(byUserId.values()); }

export function getExecutionErrorStatus(message: string): ExecutionResult["status"] { return /judge0|rapidapi|submission|quota|sandbox|compile service/i.test(message) ? "api_error" : "backend_failure"; }