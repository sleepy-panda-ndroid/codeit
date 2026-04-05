import Editor from "@monaco-editor/react";
import { EditorSettings, DEFAULT_EDITOR_SETTINGS } from "./EditorDashboard";

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  settings?: EditorSettings;
  readOnly?: boolean;
}

const MONACO_THEME_MAP: Record<string, string> = {
  vsDark: "vs-dark",
  monokai: "vs-dark",
  dracula: "vs-dark",
  oneDarkPro: "vs-dark",
  githubDark: "vs-dark",
  solarizedDark: "vs-dark",
  nightOwl: "vs-dark",
  nord: "vs-dark",
};

function mapLanguage(language: string): string {
  switch (language) {
    case "typescript":
      return "typescript";
    case "javascript":
      return "javascript";
    case "python":
      return "python";
    case "java":
      return "java";
    case "cpp":
      return "cpp";
    case "c":
      return "c";
    case "html":
      return "html";
    case "css":
      return "css";
    case "json":
      return "json";
    case "markdown":
      return "markdown";
    default:
      return "plaintext";
  }
}

export default function CodeEditor({
  value,
  language,
  onChange,
  settings = DEFAULT_EDITOR_SETTINGS,
  readOnly = false,
}: CodeEditorProps) {
  const monacoLanguage = mapLanguage(language);
  const monacoTheme = MONACO_THEME_MAP[settings.theme] ?? "vs-dark";

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        width="100%"
        language={monacoLanguage}
        theme={monacoTheme}
        value={value}
        onChange={(next) => {
          if (readOnly) return;
          onChange(next ?? "");
        }}
        options={{
          readOnly,
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily,
          lineHeight: Math.round(settings.fontSize * settings.lineHeight),
          minimap: { enabled: settings.minimap },
          wordWrap: settings.wordWrap ? "on" : "off",
          lineNumbers: settings.lineNumbers ? "on" : "off",
          tabSize: settings.tabSize,
          insertSpaces: settings.indentStyle === "spaces",
          cursorStyle:
            settings.cursorStyle === "line"
              ? "line"
              : settings.cursorStyle === "block"
                ? "block"
                : "underline",
          renderWhitespace: settings.renderWhitespace,
          scrollBeyondLastLine: settings.scrollBeyondLastLine,
          automaticLayout: true,
          folding: true,
          bracketPairColorization: { enabled: settings.bracketColorization },
          guides: {
            bracketPairs: settings.bracketColorization,
            indentation: true,
          },
          glyphMargin: false,
          overviewRulerBorder: false,
          contextmenu: true,
          smoothScrolling: true,
          mouseWheelZoom: true,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}