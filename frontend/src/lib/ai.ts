import { apiFetch } from "./api";

export type AIMessageRole = "system" | "user" | "assistant";

export type AIMessage = {
  role: AIMessageRole;
  content: string;
};

export type AIContextFile = {
  path: string;
  content: string;
};

export type AIChatContext = {
  projectName?: string;
  activeFilePath?: string;
  activeFileContent?: string;
  activeFileOutput?: string;
  openFiles?: AIContextFile[];
  fileTree?: string[];
};

type AIChatResponse = {
  ok: boolean;
  reply: string;
  fallbackFrom?: string;
  fallbackTo?: string;
};

type AIModelsResponse = {
  ok: boolean;
  models: string[];
  defaultModel: string;
};

function trimMessageHistory(messages: AIMessage[], limit = 12): AIMessage[] {
  return messages.slice(-limit);
}

export async function getAIModels() {
  return apiFetch<AIModelsResponse>("/ai/models");
}

export async function chatWithAI(
  messages: AIMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    context?: AIChatContext;
  }
) {
  const safeMessages = trimMessageHistory(messages);

  const response = await apiFetch<AIChatResponse>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: safeMessages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      model: options?.model,
      context: options?.context,
    }),
  });

  return response;
}
