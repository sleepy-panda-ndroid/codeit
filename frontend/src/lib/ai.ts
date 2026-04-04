import { apiFetch } from "./api";

export type AIMessageRole = "system" | "user" | "assistant";

export type AIMessage = {
  role: AIMessageRole;
  content: string;
};

type AIChatResponse = {
  ok: boolean;
  reply: string;
};

export async function chatWithAI(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }) {
  const response = await apiFetch<AIChatResponse>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    }),
  });

  return response.reply;
}
