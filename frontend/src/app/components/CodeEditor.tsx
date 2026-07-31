import Editor from "@monaco-editor/react";
import { EditorSettings, DEFAULT_EDITOR_SETTINGS, EDITOR_THEMES } from "./EditorDashboard";


interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  settings?: EditorSettings;
  readOnly?: boolean;
}

export default function CodeEditor({
  value,
  language,
  onChange,
  settings = DEFAULT_EDITOR_SETTINGS,
  readOnly = false,
}
: CodeEditorProps) {
  const monacoTheme =
  EDITOR_THEMES[settings.theme]?.monacoTheme ?? "vs-dark";
  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme={monacoTheme}
        value={value}
        onChange={(next) => {
          if (readOnly) return;
          onChange(next ?? "");
        }}
        options={{
          readOnly,
          fontSize: settings.fontSize,
          lineHeight: Math.round(settings.fontSize * settings.lineHeight),
          minimap: {
            enabled: settings.minimap,
            scale: settings.minimapScale,
          },
          wordWrap: settings.wordWrap ? "on" : "off",
          lineNumbers: settings.lineNumbers ? "on" : "off",
          tabSize: settings.tabSize,
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
          bracketPairColorization: {
            enabled: settings.bracketColorization,
          },
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