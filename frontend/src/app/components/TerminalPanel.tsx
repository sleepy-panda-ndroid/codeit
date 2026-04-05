import { useState, useEffect, useRef } from "react";
import { Terminal, X, Trash2, Copy, Check, Loader2, Clock, Hash, AlertTriangle, CheckCircle2, XCircle, AlertCircle, Wifi, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

export interface ExecutionResult {
  output: string;
  exitCode: number;
  executionTime: number; // ms
  status: "accepted" | "runtime_error" | "compilation_error" | "api_error" | "unsupported_language" | "empty_file" | "backend_failure";
  errorMessage?: string;
}

interface TerminalPanelProps {
  onClose: () => void;
  isRunning?: boolean;
  executionResult?: ExecutionResult | null;
  stdin?: string;
  onStdinChange?: (value: string) => void;
}

const STATUS_CONFIG: Record<
  ExecutionResult["status"],
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  accepted:           { label: "Accepted",           color: "text-green-400",  bg: "bg-green-400/10 border-green-400/30",  icon: CheckCircle2 },
  runtime_error:      { label: "Runtime Error",      color: "text-red-400",    bg: "bg-red-400/10 border-red-400/30",      icon: XCircle },
  compilation_error:  { label: "Compilation Error",  color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30", icon: AlertTriangle },
  api_error:          { label: "API Error",           color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30", icon: AlertCircle },
  unsupported_language:{ label: "Unsupported Language", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30", icon: AlertCircle },
  empty_file:         { label: "Empty File",          color: "text-gray-400",  bg: "bg-gray-400/10 border-gray-400/30",    icon: AlertCircle },
  backend_failure:    { label: "Backend Failure",     color: "text-red-400",   bg: "bg-red-400/10 border-red-400/30",      icon: Wifi },
};

export default function TerminalPanel({ onClose, isRunning, executionResult, stdin = "", onStdinChange }: TerminalPanelProps) {
  const [activeTab, setActiveTab] = useState("terminal");
  const [copied, setCopied] = useState(false);
  const [terminalLines] = useState([
    { type: "info",    text: "> npm start" },
    { type: "success", text: "Compiled successfully!" },
    { type: "info",    text: "" },
    { type: "info",    text: "Local:           http://localhost:3000" },
    { type: "info",    text: "On Your Network: http://192.168.1.100:3000" },
    { type: "info",    text: "" },
    { type: "success", text: "webpack compiled successfully" },
  ]);
  const outputScrollRef = useRef<HTMLDivElement>(null);

  // Auto-switch to output tab when execution starts or result arrives
  useEffect(() => {
    if (isRunning || executionResult) {
      setActiveTab("output");
    }
  }, [isRunning, executionResult]);

  // Scroll to bottom of output when result changes
  useEffect(() => {
    outputScrollRef.current?.scrollTo({ top: outputScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [executionResult]);

  const handleCopy = () => {
    if (!executionResult) return;
    const text = executionResult.output || executionResult.errorMessage || "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case "error":   return "text-red-400";
      case "success": return "text-green-400";
      case "warning": return "text-yellow-400";
      case "output":  return "text-blue-300";
      default:        return "text-gray-300";
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const renderOutputContent = () => {
    if (isRunning) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm">Executing code...</p>
          <p className="text-xs text-gray-600">Powered by Judge0</p>
        </div>
      );
    }

    if (!executionResult) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
          <Terminal className="w-10 h-10 opacity-30" />
          <p className="text-sm">Run your code to see output here</p>
          <p className="text-xs">Ctrl+Enter to run</p>
        </div>
      );
    }

    const cfg = STATUS_CONFIG[executionResult.status];
    const Icon = cfg.icon;

    return (
      <div className="h-full flex flex-col" ref={outputScrollRef}>
        {/* Result header bar */}
        <div className={`flex items-center justify-between px-4 py-2 border-b border-[#3e3e42] ${cfg.bg} border`}>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 ${cfg.color}`}>
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{cfg.label}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500 text-xs">
              <Hash className="w-3 h-3" />
              <span>Exit: {executionResult.exitCode}</span>
            </div>
            {executionResult.executionTime > 0 && (
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                <Clock className="w-3 h-3" />
                <span>{formatTime(executionResult.executionTime)}</span>
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-[#2a2d2e]"
            onClick={handleCopy}
            disabled={!executionResult.output && !executionResult.errorMessage}
          >
            {copied ? (
              <><Check className="w-3 h-3 mr-1 text-green-400" />Copied</>
            ) : (
              <><Copy className="w-3 h-3 mr-1" />Copy</>
            )}
          </Button>
        </div>

        {/* Output / Error content */}
        <div className="flex-1 overflow-auto p-4 font-mono text-sm">
          {executionResult.output && (
            <pre className="text-gray-200 whitespace-pre-wrap break-words">{executionResult.output}</pre>
          )}
          {executionResult.errorMessage && (
            <pre className={`${cfg.color} whitespace-pre-wrap break-words ${executionResult.output ? "mt-3 pt-3 border-t border-[#3e3e42]" : ""}`}>
              {executionResult.errorMessage}
            </pre>
          )}
          {!executionResult.output && !executionResult.errorMessage && (
            <span className="text-gray-600 italic">No output produced.</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex items-center justify-between border-b border-[#3e3e42] px-2">
          <TabsList className="bg-transparent h-9">
            <TabsTrigger
              value="terminal"
              className="data-[state=active]:bg-[#2a2d2e] text-gray-400 data-[state=active]:text-white text-xs h-7"
            >
              <Terminal className="w-3 h-3 mr-1.5" />
              Terminal
            </TabsTrigger>
            <TabsTrigger
              value="input"
              className="data-[state=active]:bg-[#2a2d2e] text-gray-400 data-[state=active]:text-white text-xs h-7"
            >
              <ChevronRight className="w-3 h-3 mr-1.5" />
              Input
              {stdin.trim() && (
                <span className="ml-1.5 w-2 h-2 rounded-full bg-indigo-400" />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="output"
              className="data-[state=active]:bg-[#2a2d2e] text-gray-400 data-[state=active]:text-white text-xs h-7 relative"
            >
              {isRunning && <Loader2 className="w-3 h-3 mr-1.5 animate-spin text-indigo-400" />}
              Output
              {executionResult && !isRunning && (
                <span
                  className={`ml-1.5 w-2 h-2 rounded-full ${
                    executionResult.status === "accepted" ? "bg-green-400" : "bg-red-400"
                  }`}
                />
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7 text-gray-400 hover:text-white hover:bg-[#2a2d2e]"
              title="Clear output"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7 text-gray-400 hover:text-white hover:bg-[#2a2d2e]"
              onClick={onClose}
              title="Close terminal (Ctrl+J)"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <TabsContent
          value="terminal"
          className="flex-1 m-0 flex items-center justify-center"
        >
          <div className="text-gray-500 text-sm">
            Terminal will be implemented later
          </div>
        </TabsContent>

        <TabsContent value="input" className="flex-1 overflow-hidden m-0 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#3e3e42] bg-[#252526]">
            <span className="text-xs text-gray-400">Stdin — provide input for your program</span>
            {stdin.trim() && (
              <button
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                onClick={() => onStdinChange?.("")}
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            className="flex-1 w-full bg-[#1e1e1e] text-gray-200 font-mono text-sm p-4 resize-none outline-none placeholder-gray-600 border-0"
            placeholder={"Enter program input here...\nEach line will be passed as a separate line of stdin when you run your code."}
            value={stdin}
            onChange={(e) => onStdinChange?.(e.target.value)}
            spellCheck={false}
          />
        </TabsContent>

        <TabsContent value="output" className="flex-1 overflow-hidden m-0">
          {renderOutputContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}