import { useEffect, useState } from "react";
import { Sparkles, X, Send, Lightbulb, Bug, Zap, MessageSquare, Loader2, Copy, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { chatWithAI, type AIChatContext } from "../../lib/ai";

interface AIChatPanelProps {
  onClose: () => void;
  context?: AIChatContext;
  models: string[];
  defaultModel?: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

type CodeSegment = {
  type: "text" | "code";
  content: string;
  language?: string;
};

function parseCodeSegments(content: string): CodeSegment[] {
  const segments: CodeSegment[] = [];
  const regex = /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }

    segments.push({
      type: "code",
      language: (match[1] || "").trim() || undefined,
      content: match[2] || "",
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  if (segments.length === 0) {
    return [{ type: "text", content }];
  }

  return segments;
}

function renderInlineCode(text: string) {
  const tokens = text.split(/(`[^`]+`)/g);
  return tokens.map((token, index) => {
    if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
      return (
        <code key={index} className="px-1 py-0.5 rounded bg-black/35 text-emerald-300 font-mono text-[12px]">
          {token.slice(1, -1)}
        </code>
      );
    }

    return (
      <span key={index} className="whitespace-pre-wrap">
        {token}
      </span>
    );
  });
}

function AIMessageContent({ content, onCopyCode, copiedCode }: { content: string; onCopyCode: (code: string) => void; copiedCode: string | null }) {
  const segments = parseCodeSegments(content);

  return (
    <div className="space-y-2 text-left">
      {segments.map((segment, index) => {
        if (segment.type === "code") {
          return (
            <div key={index} className="rounded-md overflow-hidden border border-[#3e3e42] bg-[#111111]">
              {segment.language && (
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-gray-400 border-b border-[#2c2c2c] bg-[#0e0e0e]">
                  {segment.language}
                </div>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => onCopyCode(segment.content)}
                  className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-white"
                  title="Copy code"
                >
                  {copiedCode === segment.content ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedCode === segment.content ? "Copied" : "Copy code"}
                </button>
                <pre className="p-3 pr-20 text-[12px] leading-relaxed text-gray-100 overflow-x-auto">
                  <code>{segment.content}</code>
                </pre>
              </div>
            </div>
          );
        }

        return (
          <p key={index} className="text-sm leading-relaxed text-gray-200">
            {renderInlineCode(segment.content)}
          </p>
        );
      })}
    </div>
  );
}

export default function AIChatPanel({ onClose, context, models, defaultModel }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm your AI coding assistant. I can help you explain code, debug errors, and suggest improvements. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallbackNotice, setFallbackNotice] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(defaultModel || models[0] || "");

  useEffect(() => {
    if (selectedModel && models.includes(selectedModel)) return;
    setSelectedModel(defaultModel || models[0] || "");
  }, [models, defaultModel, selectedModel]);

  const quickPrompts = [
    { icon: Lightbulb, label: "Explain this code", prompt: "Explain the code of the current file.", color: "text-yellow-400" },
    { icon: Bug, label: "Debug this error", prompt: "Explain the error from the output panel and show how to fix it.", color: "text-red-400" },
    { icon: Zap, label: "Optimize code", prompt: "Optimize the code of the current file and respond with the optimized code.", color: "text-blue-400" },
    { icon: MessageSquare, label: "Add comments", prompt: "Add comments to the current file's code and respond with the commented code.", color: "text-green-400" },
  ];

  const handleSend = async (prompt = input) => {
    if (!prompt.trim()) return;
    if (loading) return;

    setError("");

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: prompt.trim(),
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const trimmedMessages = nextMessages.slice(-12).map((message) => ({
        role: message.type === "user" ? "user" as const : "assistant" as const,
        content: message.content,
      }));

      const response = await chatWithAI(trimmedMessages, {
        temperature: 0.3,
        model: selectedModel || undefined,
        context,
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.reply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setFallbackNotice(response.fallbackFrom && response.fallbackTo
        ? `Switched to ${response.fallbackTo} - ${response.fallbackFrom} was temporarily unavailable`
        : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get AI response");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    void handleSend(prompt);
  };

  const handleCopyResponse = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId((current) => current === message.id ? null : current), 2000);
    } catch {
      setError("Could not copy the response.");
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedMessageId(code);
      window.setTimeout(() => setCopiedMessageId((current) => current === code ? null : current), 2000);
    } catch {
      setError("Could not copy the code.");
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#252526] overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-[#3e3e42] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white">AI Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
            className="h-7 max-w-40 bg-[#1e1e1e] border border-[#3e3e42] rounded text-[11px] text-gray-200 px-2"
            disabled={loading || models.length === 0}
            title="AI model"
          >
            {models.length > 0 ? (
              models.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))
            ) : (
              <option value="">default</option>
            )}
          </select>

          <Button
            size="icon"
            variant="ghost"
            className="w-7 h-7 text-gray-400 hover:text-white hover:bg-[#2a2d2e]"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="p-4 border-b border-[#3e3e42]">
        <p className="text-xs text-gray-400 mb-3">Quick actions:</p>
        <div className="grid grid-cols-2 gap-2">
          {quickPrompts.map((prompt, index) => {
            const Icon = prompt.icon;
            return (
              <button
                key={index}
                onClick={() => handleQuickPrompt(prompt.prompt)}
                className="flex items-center gap-2 p-2 bg-[#1e1e1e] hover:bg-[#2a2d2e] rounded-lg border border-[#3e3e42] text-left transition-colors"
                disabled={loading}
              >
                <Icon className={`w-4 h-4 ${prompt.color}`} />
                <span className="text-xs text-gray-300">{prompt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="space-y-4">
          {fallbackNotice && (
            <p className="text-xs text-yellow-400 border border-yellow-500/20 bg-yellow-500/5 rounded px-2 py-1">
              {fallbackNotice}
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                {message.type === 'ai' ? (
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                    AI
                  </AvatarFallback>
                ) : (
                  <AvatarFallback className="bg-gray-600 text-white text-xs">
                    JD
                  </AvatarFallback>
                )}
              </Avatar>
              <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                <div
                  className={`inline-block max-w-full p-3 rounded-lg text-sm ${
                    message.type === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#1e1e1e] text-gray-200 border border-[#3e3e42]'
                  }`}
                >
                  {message.type === "ai" ? (
                    <AIMessageContent content={message.content} onCopyCode={handleCopyCode} copiedCode={copiedMessageId} />
                  ) : (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {message.type === "ai" && message.id !== "1" && (
                    <button
                      type="button"
                      onClick={() => void handleCopyResponse(message)}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-200"
                      title="Copy response"
                    >
                      {copiedMessageId === message.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedMessageId === message.id ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-[#3e3e42]">
        {error && (
          <p className="text-xs text-red-400 mb-2">{error}</p>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleSend();
              }
            }}
            placeholder="Ask me anything about your code..."
            className="bg-[#1e1e1e] border-[#3e3e42] text-white placeholder:text-gray-500"
            disabled={loading}
          />
          <Button
            onClick={() => void handleSend()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            size="icon"
            disabled={loading || !input.trim()}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
