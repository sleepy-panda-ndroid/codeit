import { Router } from "express";
import { z } from "zod";
import { authJwt } from "../middleware/authJwt";
import { listAIModels, requestAIChat } from "../services/ai.service";
import { aiLimiter } from "../middleware/rateLimit";

export const aiRouter = Router();

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().trim().min(1).max(8000),
      })
    )
    .min(1)
    .max(30),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(32).max(4000).optional(),
  model: z.string().trim().min(1).max(120).optional(),
  context: z
    .object({
      projectName: z.string().trim().max(200).optional(),
      activeFilePath: z.string().trim().max(500).optional(),
      activeFileContent: z.string().max(20000).optional(),
      activeFileOutput: z.string().max(20000).optional(),
      openFiles: z
        .array(
          z.object({
            path: z.string().trim().min(1).max(500),
            content: z.string().max(8000),
          })
        )
        .max(5)
        .optional(),
      fileTree: z.array(z.string().trim().min(1).max(500)).max(300).optional(),
    })
    .optional(),
});

aiRouter.get("/models", aiLimiter, authJwt, async (_req, res, next) => {
  try {
    const result = await listAIModels();
    return res.json({ ok: true, ...result });
  } catch (err) {
    return next(err);
  }
});

aiRouter.post(
  "/chat", 
  aiLimiter, 
  authJwt, 
  async (req, res, next) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const reply = await requestAIChat({
      messages: parsed.data.messages,
      temperature: parsed.data.temperature,
      maxTokens: parsed.data.maxTokens,
      model: parsed.data.model,
      context: parsed.data.context,
    });

    return res.json({ ok: true, ...reply });
  } catch (err) {
    return next(err);
  }
});
