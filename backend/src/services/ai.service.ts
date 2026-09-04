export type AIChatRole = "system" | "user" | "assistant";

export type AIChatMessage = {
  role: AIChatRole;
  content: string;
};

export type AIChatInput = {
  messages: AIChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  context?: AIChatContext;
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

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

type OpenAIModelsResponse = {
  data?: Array<{
    id?: string;
    active?: boolean;
    input_modalities?: string[];
    output_modalities?: string[];
  }>;
};

type AIProviderConfig = {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
};

function getProviderConfig(): AIProviderConfig {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_API_KEY is missing in backend environment");
  }

  const baseUrl = (process.env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const defaultModel = process.env.AI_MODEL || "llama-3.1-8b-instant";

  return { apiKey, baseUrl, defaultModel };
}

function trimText(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input;
  return `${input.slice(0, maxChars)}\n...[truncated]`;
}

function buildContextBlock(context?: AIChatContext): string {
  if (!context) return "";

  const lines: string[] = [];

  if (context.projectName?.trim()) {
    lines.push(`project:${context.projectName.trim()}`);
  }

  const fileTree = (context.fileTree || [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 120);

  if (fileTree.length > 0) {
    lines.push("files:");
    lines.push(...fileTree.map((item) => `- ${item}`));
  }

  if (context.activeFilePath?.trim()) {
    lines.push(`active_file:${context.activeFilePath.trim()}`);
  }

  if (context.activeFileContent?.trim()) {
    lines.push("active_code:");
    lines.push(trimText(context.activeFileContent, 6000));
  }

  if (context.activeFileOutput?.trim()) {
    lines.push("output_panel:");
    lines.push(trimText(context.activeFileOutput, 6000));
  }

  const openFiles = (context.openFiles || []).slice(0, 2);
  for (const file of openFiles) {
    if (!file?.path?.trim() || !file.content?.trim()) continue;
    lines.push(`open_file:${file.path.trim()}`);
    lines.push(trimText(file.content, 2500));
  }

  if (lines.length === 0) return "";

  return [
    "Use only this project context when relevant. If unsure, say what is missing.",
    ...lines,
  ].join("\n");
}

function isModelDownError(
  status: number,
  message: string,
  errorType?: string,
  errorCode?: string
): boolean {
  const value = message.toLowerCase();
  const type = (errorType || "").toLowerCase();
  const code = (errorCode || "").toLowerCase();

  if (code.includes("model_decommissioned") || code.includes("model_not_found")) {
    return true;
  }

  if (type.includes("model") && (value.includes("unavailable") || value.includes("not found"))) {
    return true;
  }

  if (status === 404 || status === 410) {
    return /model|does not exist|not found/.test(value);
  }

  return /model.*(down|unavailable|not found|not available|decommissioned)|does not exist/.test(value);
}

export async function listAIModels(): Promise<{ models: string[]; defaultModel: string }> {
  const { apiKey, baseUrl, defaultModel } = getProviderConfig();

  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return { models: [defaultModel], defaultModel };
    }

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as OpenAIModelsResponse) : null;
    const models = (payload?.data || [])
      .filter((item) => item.active !== false)
      .filter((item) => {
        const input = item.input_modalities;
        const output = item.output_modalities;
        const acceptsText = !Array.isArray(input) || input.includes("text");
        const outputsText = !Array.isArray(output) || output.includes("text");
        return acceptsText && outputsText;
      })
      .map((item) => (typeof item?.id === "string" ? item.id.trim() : ""))
      .filter(Boolean);

    const uniqueModels = Array.from(new Set(models));
    if (uniqueModels.length === 0) {
      return { models: [defaultModel], defaultModel };
    }

    const resolvedDefault = uniqueModels.includes(defaultModel)
      ? defaultModel
      : uniqueModels[0];

    return { models: uniqueModels, defaultModel: resolvedDefault };
  } catch {
    return { models: [defaultModel], defaultModel };
  }
}

export type AIChatResult = {
  reply: string;
  fallbackFrom?: string;
  fallbackTo?: string;
};

class ModelUnavailableError extends Error {
  constructor() {
    super("the model is down please try another");
    this.name = "ModelUnavailableError";
  }
}

export async function requestAIChat(input: AIChatInput): Promise<AIChatResult> {
  const { apiKey, baseUrl, defaultModel } = getProviderConfig();
  const model = input.model?.trim() || defaultModel;
  const systemPrompt = process.env.AI_SYSTEM_PROMPT?.trim();
  const contextBlock = buildContextBlock(input.context);

  const messages: AIChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  if (contextBlock) {
    messages.push({ role: "system", content: contextBlock });
  }

  messages.push({ role: "system", content: "Answer with minimal tokens while remaining correct." });
  messages.push(...input.messages.slice(-12));

  const requestModel = async (requestModelId: string): Promise<string> => {
    const requestBody = {
      model: requestModelId,
      messages,
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens,
    };

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const rawText = await response.text();
    let data: OpenAIChatResponse | null = null;
    try {
      data = rawText ? (JSON.parse(rawText) as OpenAIChatResponse) : null;
    } catch {
      if (!response.ok) throw new Error(`AI provider request failed (${response.status})`);
    }

    if (!response.ok) {
      const providerError = data?.error?.message;
      const providerErrorType = data?.error?.type;
      const providerErrorCode = data?.error?.code;
      const message = providerError || `AI provider request failed (${response.status})`;
      if (isModelDownError(response.status, message, providerErrorType, providerErrorCode)) {
        throw new ModelUnavailableError();
      }
      throw new Error(message);
    }

    const reply = data?.choices?.[0]?.message?.content
      ?.replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();
    if (!reply) throw new Error("AI provider returned an empty response");
    return reply;
  };

  const available = await listAIModels();
  const candidates = Array.from(new Set([model, defaultModel, ...available.models].filter(Boolean)));
  let lastUnavailableError: ModelUnavailableError | null = null;

  for (const candidate of candidates) {
    try {
      const reply = await requestModel(candidate);
      return candidate === model
        ? { reply }
        : { reply, fallbackFrom: model, fallbackTo: candidate };
    } catch (err) {
      if (!(err instanceof ModelUnavailableError)) throw err;
      lastUnavailableError = err;
    }
  }

  if (lastUnavailableError) {
    throw new Error("all models are down. please try again later.");
  }

  throw new Error("AI provider did not provide an available model");
}
