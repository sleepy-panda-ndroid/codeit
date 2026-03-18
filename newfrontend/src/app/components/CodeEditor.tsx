import { useRef, useEffect, useState } from "react";
import { Textarea } from "./ui/textarea";
import { EditorSettings, DEFAULT_EDITOR_SETTINGS, EDITOR_THEMES } from "./EditorDashboard";

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  settings?: EditorSettings;
}

export default function CodeEditor({
  value,
  language,
  onChange,
  settings = DEFAULT_EDITOR_SETTINGS,
}: CodeEditorProps) {
  const lines = value.split("\n");
  const lineCount = lines.length;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeLine, setActiveLine] = useState(0);

  const theme = EDITOR_THEMES[settings.theme] ?? EDITOR_THEMES.vsDark;

  const handleSelect = () => {
    const el = textareaRef.current;
    if (!el) return;
    const textBefore = el.value.slice(0, el.selectionStart);
    const line = textBefore.split("\n").length - 1;
    setActiveLine(line);
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const indent =
          settings.indentStyle === "tabs"
            ? "\t"
            : " ".repeat(settings.tabSize);
        const newValue = value.slice(0, start) + indent + value.slice(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          el.selectionStart = start + indent.length;
          el.selectionEnd = start + indent.length;
        });
      }
    };

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [value, onChange, settings.indentStyle, settings.tabSize]);

  const cursorStyleMap: Record<string, string> = {
    line: "text",
    block: "cell",
    underline: "text",
  };

  return (
    <div
      className="h-full flex overflow-hidden font-mono"
      style={{ background: theme.bg }}
    >
      {settings.lineNumbers && (
        <div
          className="py-4 px-3 select-none text-right flex-shrink-0 overflow-hidden"
          style={{
            background: theme.gutter,
            borderRight: `1px solid ${theme.border}`,
            minWidth: 50,
            color: "#858585",
            fontSize: settings.fontSize - 1,
            lineHeight: `${settings.lineHeight * settings.fontSize}px`,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i + 1}
              style={{
                height: `${settings.lineHeight * settings.fontSize}px`,
                color:
                  settings.highlightActiveLine && i === activeLine
                    ? "#c6c6c6"
                    : "#5a5a5e",
                background:
                  settings.highlightActiveLine && i === activeLine
                    ? `${theme.accent}18`
                    : "transparent",
                paddingRight: 8,
                borderRadius: 2,
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 relative overflow-auto">
        {settings.highlightActiveLine && (
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: activeLine * settings.lineHeight * settings.fontSize + 16,
              height: settings.lineHeight * settings.fontSize,
              background: `${theme.accent}10`,
              zIndex: 0,
            }}
          />
        )}

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={handleSelect}
          onClick={handleSelect}
          onKeyUp={handleSelect}
          className="w-full h-full border-0 resize-none focus:outline-none focus:ring-0 p-4 relative z-10"
          style={{
            background: "transparent",
            color: theme.text,
            caretColor: theme.accent,
            fontSize: settings.fontSize,
            fontFamily: `"${settings.fontFamily}", monospace`,
            lineHeight: `${settings.lineHeight * settings.fontSize}px`,
            tabSize: settings.tabSize,
            whiteSpace: settings.wordWrap ? "pre-wrap" : "pre",
            overflowWrap: settings.wordWrap ? "break-word" : "normal",
            cursor: cursorStyleMap[settings.cursorStyle] ?? "text",
            minHeight: "100%",
            paddingBottom: settings.scrollBeyondLastLine ? "50vh" : "1rem",
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
        />

        <div
          className="absolute inset-0 pointer-events-none p-4 overflow-hidden"
          style={{
            fontSize: settings.fontSize,
            fontFamily: `"${settings.fontFamily}", monospace`,
            lineHeight: `${settings.lineHeight * settings.fontSize}px`,
            whiteSpace: settings.wordWrap ? "pre-wrap" : "pre",
            zIndex: 0,
          }}
        >
          {lines.map((line, index) => (
            <div
              key={index}
              style={{
                height: `${settings.lineHeight * settings.fontSize}px`,
                color: "transparent",
              }}
            >
              {highlightSyntax(line, language, settings.renderWhitespace)}
            </div>
          ))}
        </div>

        {settings.minimap && (
          <div
            className="absolute top-0 right-0 bottom-0 w-20 opacity-40 pointer-events-none overflow-hidden"
            style={{ background: theme.gutter, borderLeft: `1px solid ${theme.border}` }}
          >
            {lines.slice(0, 80).map((line, i) => (
              <div
                key={i}
                className="mx-1 my-px rounded-sm"
                style={{
                  height: 2,
                  width: `${Math.min(100, line.length * 1.5)}%`,
                  background: line.trim() ? theme.text : "transparent",
                  opacity: 0.3 + (line.trim() ? 0.3 : 0),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function highlightSyntax(
  line: string,
  language: string,
  renderWhitespace: "none" | "boundary" | "all"
): React.ReactNode {
  const keywords: Record<string, string[]> = {
    javascript: ["import", "export", "default", "function", "const", "let", "var", "return", "if", "else", "from", "class", "interface", "type", "async", "await", "new", "this", "try", "catch", "throw"],
    typescript: ["import", "export", "default", "function", "const", "let", "var", "return", "if", "else", "from", "class", "interface", "type", "async", "await", "new", "this", "try", "catch", "throw", "extends", "implements", "readonly"],
    python: ["import", "from", "def", "class", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "True", "False", "None", "try", "except", "raise", "with", "as", "lambda", "print"],
    java: ["public", "private", "protected", "class", "interface", "extends", "implements", "return", "if", "else", "for", "while", "new", "static", "void", "import", "package", "try", "catch", "throw", "final"],
    go: ["func", "var", "const", "type", "struct", "interface", "return", "if", "else", "for", "range", "import", "package", "go", "chan", "select", "case", "defer", "map"],
    rust: ["fn", "let", "mut", "const", "struct", "enum", "impl", "trait", "return", "if", "else", "for", "while", "loop", "match", "use", "mod", "pub", "self", "type", "where"],
  };

  const langKeywords = keywords[language] ?? keywords.javascript;

  type Segment = { text: string; type: "keyword" | "string" | "comment" | "number" | "whitespace" | "plain" };
  const segments: Segment[] = [];

  let remaining = line;

  while (remaining.length > 0) {
    if (remaining.startsWith("//") || remaining.startsWith("#")) {
      segments.push({ text: remaining, type: "comment" });
      break;
    }

    if (remaining[0] === '"' || remaining[0] === "'" || remaining[0] === "`") {
      const q = remaining[0];
      let end = 1;
      while (end < remaining.length && remaining[end] !== q) {
        if (remaining[end] === "\\") end++;
        end++;
      }
      end = Math.min(end + 1, remaining.length);
      segments.push({ text: remaining.slice(0, end), type: "string" });
      remaining = remaining.slice(end);
      continue;
    }

    const numMatch = remaining.match(/^(\d+\.?\d*)/);
    if (numMatch) {
      segments.push({ text: numMatch[1], type: "number" });
      remaining = remaining.slice(numMatch[1].length);
      continue;
    }

    const wordMatch = remaining.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (wordMatch) {
      const word = wordMatch[1];
      const isKeyword = langKeywords.includes(word);
      segments.push({ text: word, type: isKeyword ? "keyword" : "plain" });
      remaining = remaining.slice(word.length);
      continue;
    }

    const wsMatch = remaining.match(/^(\s+)/);
    if (wsMatch) {
      segments.push({ text: wsMatch[1], type: "whitespace" });
      remaining = remaining.slice(wsMatch[1].length);
      continue;
    }

    segments.push({ text: remaining[0], type: "plain" });
    remaining = remaining.slice(1);
  }

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === "keyword") return <span key={i} style={{ color: "#C586C0" }}>{seg.text}</span>;
        if (seg.type === "string") return <span key={i} style={{ color: "#ce9178" }}>{seg.text}</span>;
        if (seg.type === "comment") return <span key={i} style={{ color: "#6a9955", fontStyle: "italic" }}>{seg.text}</span>;
        if (seg.type === "number") return <span key={i} style={{ color: "#b5cea8" }}>{seg.text}</span>;
        if (seg.type === "whitespace") {
          if (renderWhitespace === "all") {
            return <span key={i} style={{ color: "#3e3e42" }}>{seg.text.replace(/ /g, "·").replace(/\t/g, "→")}</span>;
          }
          return <span key={i}>{seg.text}</span>;
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </span>
  );
}
