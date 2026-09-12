import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authJwt } from "../middleware/authJwt";
import { requireProjectRole } from "../middleware/requireProjectRole";
import { executeCode } from "../services/execution.service";
import { executeLimiter, cphLimiter } from "../middleware/rateLimit";
import { parseProblemQuery, getCodeforcesSamples } from "../services/codeforces.service";

export const executionRouter = Router();

const executeSchema = z.object({
  sourceCode: z.string().min(1, "sourceCode is required"),
  language: z.enum(["c", "cpp", "java", "javascript", "python"]),
  stdin: z.string().optional().default(""),
  filePath: z.string().optional(),
});

executionRouter.get("/projects/:id/cph/samples", cphLimiter, authJwt, requireProjectRole(["OWNER", "WRITER", "READER"]), async (req: any, res, next) => {
  try {
    const raw = String(req.query.problem ?? "");
    const parsedQuery = parseProblemQuery(raw);
    if (!parsedQuery) return res.status(400).json({ error: "Enter a Codeforces problem URL or contest number and problem letter" });

    const { contestId, index } = parsedQuery;
    const tests = await getCodeforcesSamples(contestId, index);
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