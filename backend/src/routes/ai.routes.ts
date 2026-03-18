import { Router } from "express";
import { z } from "zod";
import { authJwt } from "../middleware/authJwt";
import { requestAIChat } from "../services/ai.service";

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
});

aiRouter.post("/chat", authJwt, async (req, res, next) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const reply = await requestAIChat({
      messages: parsed.data.messages,
      temperature: parsed.data.temperature,
      maxTokens: parsed.data.maxTokens,
    });

    return res.json({ ok: true, reply });
  } catch (err) {
    return next(err);
  }
});
