import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authJwt } from "../middleware/authJwt";
import { requireProjectRole } from "../middleware/requireProjectRole";
import { executeCode } from "../services/execution.service";
import { executeLimiter } from "../middleware/rateLimit";

export const executionRouter = Router();

const executeSchema = z.object({
  sourceCode: z.string().min(1, "sourceCode is required"),
  language: z.enum(["c", "cpp", "java", "javascript", "python"]),
  stdin: z.string().optional().default(""),
  filePath: z.string().optional(),
});

function decodeHtml(value: string) {
  return value.replace(/<br\s*\/?>(\r?\n)?/gi, "\n").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function parseMarkdownSamples(markdown: string) {
  const exampleStart = markdown.search(/\nExample\s+\n/i);
  if (exampleStart < 0) return [];
  const example = markdown.slice(exampleStart);
  const inputMatch = example.match(/\nInput\s+\n+.*?\n([\s\S]*?)\nOutput\s+\n+/i);
  const outputMatch = example.match(/\nOutput\s+\n+.*?\n([\s\S]*?)(?:\nNote\s+\n|$)/i);
  if (!inputMatch || !outputMatch) return [];
  const input = inputMatch[1].replace(/\nCopy\s*\n/gi, "\n").trim();
  const output = outputMatch[1].replace(/\nCopy\s*\n/gi, "\n").trim();
  return [{ input, output }];
}

executionRouter.get("/projects/:id/cph/samples", authJwt, requireProjectRole(["OWNER", "WRITER", "READER"]), async (req: any, res, next) => {
  try {
    const raw = String(req.query.problem ?? "").trim();
    const match = raw.match(/(?:problemset\/problem|contest)\/(\d+)(?:\/problem\/)?([A-Za-z]\d*)?/i) ?? raw.match(/^(\d+)\s*([A-Za-z]\d*)?$/i);
    if (!match) return res.status(400).json({ error: "Enter a Codeforces problem URL or contest number and problem letter" });
    const contestId = match[1];
    const index = match[2] ?? "A";
    const url = `https://codeforces.com/problemset/problem/${contestId}/${index}`;
    const response = await fetch(url);
    const source = response.ok ? await response.text() : await fetch(`https://r.jina.ai/http://codeforces.com/problemset/problem/${contestId}/${index}`).then(async (fallback) => { if (!fallback.ok) throw new Error("Codeforces problem could not be loaded"); return fallback.text(); });
    const blocks = (source.match(/<div class="input">[\s\S]*?<pre>([\s\S]*?)<\/pre>[\s\S]*?<div class="output">[\s\S]*?<pre>([\s\S]*?)<\/pre>/gi) ?? []).map((block) => {
      const input = block.match(/<div class="input">[\s\S]*?<pre>([\s\S]*?)<\/pre>/i)?.[1] ?? "";
      const output = block.match(/<div class="output">[\s\S]*?<pre>([\s\S]*?)<\/pre>/i)?.[1] ?? "";
      return { input: decodeHtml(input), output: decodeHtml(output) };
    });
    const tests = blocks.length ? blocks : parseMarkdownSamples(source);
    if (!tests.length) return res.status(404).json({ error: "No sample tests found" });
    res.json({ problem: `${contestId}${index}`, tests });
  } catch (error) { next(error); }
});

executionRouter.post(
  "/projects/:id/execute", 
  executeLimiter,
  authJwt,
  requireProjectRole(["OWNER", "WRITER", "READER"]),
  async (req: any, res, next) => {
    try {
      const projectId = req.params.id;

      if (!mongoose.isValidObjectId(projectId)) {
        return res.status(400).json({ error: "Invalid project id" });
      }

      const parsed = executeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input" });
      }

      const result = await executeCode({
        sourceCode: parsed.data.sourceCode,
        language: parsed.data.language,
        stdin: parsed.data.stdin,
      });

      return res.json({
        ok: true,
        result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Code execution failed";
      console.error("Execution service error:", message);

      if (/fetch failed|network|timed out|temporarily unavailable|Judge0/i.test(message)) {
        return res.status(503).json({
          error: "Code execution service is temporarily unavailable. Please try again in a moment.",
        });
      }

      return next(err);
    }
  }
);