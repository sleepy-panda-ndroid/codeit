export type AIChatRole = "system" | "user" | "assistant";

export type AIChatMessage = {
  role: AIChatRole;
  content: string;
};

export type AIChatInput = {
  messages: AIChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function requestAIChat(input: AIChatInput): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_API_KEY is missing in backend environment");
  }

  const baseUrl = (process.env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "llama-3.1-8b-instant";
  const systemPrompt = process.env.AI_SYSTEM_PROMPT?.trim();

  const messages = systemPrompt
    ? [{ role: "system" as const, content: systemPrompt }, ...input.messages]
    : input.messages;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens,
    }),
  });

  const rawText = await response.text();
  let data: OpenAIChatResponse | null = null;

  try {
    data = rawText ? (JSON.parse(rawText) as OpenAIChatResponse) : null;
  } catch {
    if (!response.ok) {
      throw new Error(`AI provider request failed (${response.status})`);
    }
  }

  if (!response.ok) {
    const providerError = data?.error?.message;
    throw new Error(providerError || `AI provider request failed (${response.status})`);
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("AI provider returned an empty response");
  }

  return reply;
}
