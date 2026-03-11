import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authJwt } from "../middleware/authJwt";
import { requireProjectRole } from "../middleware/requireProjectRole";
import { executeCode } from "../services/execution.service";

export const executionRouter = Router();

const executeSchema = z.object({
  sourceCode: z.string().min(1, "sourceCode is required"),
  language: z.enum(["c", "cpp", "java", "javascript", "python"]),
  stdin: z.string().optional().default(""),
  filePath: z.string().optional(),
});

executionRouter.post(
  "/projects/:id/execute",
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
      return next(err);
    }
  }
);