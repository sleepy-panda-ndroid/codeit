import { useState } from "react";
import { Sparkles, X, Send, Lightbulb, Bug, Zap, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { chatWithAI } from "../../lib/ai";

interface AIChatPanelProps {
  onClose: () => void;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export default function AIChatPanel({ onClose }: AIChatPanelProps) {
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

  const quickPrompts = [
    { icon: Lightbulb, text: "Explain this code", color: "text-yellow-400" },
    { icon: Bug, text: "Debug this error", color: "text-red-400" },
    { icon: Zap, text: "Optimize code", color: "text-blue-400" },
    { icon: MessageSquare, text: "Add comments", color: "text-green-400" },
  ];

  const handleSend = async () => {
    if (!input.trim()) return;
    if (loading) return;

    setError("");

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const reply = await chatWithAI(
        nextMessages.map((message) => ({
          role: message.type === "user" ? "user" as const : "assistant" as const,
          content: message.content,
        })),
        { temperature: 0.3 }
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: reply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get AI response");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
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
        <Button
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-gray-400 hover:text-white hover:bg-[#2a2d2e]"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
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
                onClick={() => handleQuickPrompt(prompt.text)}
                className="flex items-center gap-2 p-2 bg-[#1e1e1e] hover:bg-[#2a2d2e] rounded-lg border border-[#3e3e42] text-left transition-colors"
                disabled={loading}
              >
                <Icon className={`w-4 h-4 ${prompt.color}`} />
                <span className="text-xs text-gray-300">{prompt.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="space-y-4">
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
                  {message.content}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
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
