import { useState, type ReactNode } from "react";
import {
  X,
  Type,
  Palette,
  Save,
  Keyboard,
  Info,
  ChevronRight,
  RotateCcw,
  Check,
} from "lucide-react";

export type EditorTheme =
  | "light"
  | "dark"
  | "hcBlack"
  | "hcLight";

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  cursorStyle: "line" | "block" | "underline";
  lineHeight: number;
  renderWhitespace: "none" | "boundary" | "all";
  theme: EditorTheme;
  minimap: boolean;
  minimapScale: 1 | 2 | 3 | 4 | 5;
  bracketColorization: boolean;
  scrollBeyondLastLine: boolean;
  highlightActiveLine: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  formatOnSave: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  lineNumbers: true,
  cursorStyle: "line",
  lineHeight: 1.6,
  renderWhitespace: "none",
  theme: "dark",
  minimap: true,
  minimapScale : 2,
  bracketColorization: true,
  scrollBeyondLastLine: false,
  highlightActiveLine: true,
  autoSave: false,
  autoSaveDelay: 1000,
  formatOnSave: false,
};

export const EDITOR_THEMES: Record< EditorTheme,
  { label: string; monacoTheme: string } > = {

  light: {
    label: "Light",
    monacoTheme: "vs",
  },
  dark: {
    label: "Dark",
    monacoTheme: "vs-dark",
  },
  hcBlack: {
    label: "High Contrast Dark",
    monacoTheme: "hc-black",
  },
  hcLight: {
    label: "High Contrast Light",
    monacoTheme: "hc-light",
  },
};

type Section = "editor" | "appearance" | "autosave" | "about";

const SECTIONS: { id: Section; label: string; icon: ReactNode }[] = [
  { id: "editor",      label: "Editor",       icon: <Type className="w-4 h-4" /> },
  { id: "appearance",  label: "Appearance",   icon: <Palette className="w-4 h-4" /> },
  { id: "autosave",    label: "Auto Save",    icon: <Save className="w-4 h-4" /> },
  { id: "about",       label: "About",        icon: <Info className="w-4 h-4" /> },
];

function SettingRow({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5 border-b border-[#3e3e42] last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-200">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-[#4e4e52]"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="bg-[#3c3c3c] border border-[#5a5a5e] text-gray-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function NumberInput({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-6 h-6 flex items-center justify-center bg-[#3c3c3c] hover:bg-[#4a4a4e] text-gray-300 rounded text-sm transition-colors"
      >−</button>
      <span className="w-10 text-center text-sm text-gray-200 bg-[#3c3c3c] rounded py-0.5">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-6 h-6 flex items-center justify-center bg-[#3c3c3c] hover:bg-[#4a4a4e] text-gray-300 rounded text-sm transition-colors"
      >+</button>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs text-indigo-400 uppercase tracking-widest mb-1 mt-6 first:mt-0">{children}</h3>
  );
}

interface EditorDashboardProps {
  settings: EditorSettings;
  onChange: (settings: EditorSettings) => void;
  onClose: () => void;
}

export default function EditorDashboard({ settings, onChange, onClose }: EditorDashboardProps) {
  const [activeSection, setActiveSection] = useState<Section>("editor");
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const handleReset = () => {
    onChange(DEFAULT_EDITOR_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative ml-auto w-full max-w-3xl h-full bg-[#1e1e1e] border-l border-[#3e3e42] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3e3e42] bg-[#252526] flex-shrink-0">
          <div>
            <h2 className="text-white">Editor Dashboard</h2>
            <p className="text-xs text-gray-500 mt-0.5">Customize your coding environment</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-[#3c3c3c] hover:bg-[#4a4a4e] rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to defaults
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#3c3c3c] rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-48 flex-shrink-0 border-r border-[#3e3e42] bg-[#252526] py-3 flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                  activeSection === s.id
                    ? "text-white bg-indigo-600/20 border-r-2 border-indigo-500"
                    : "text-gray-400 hover:text-white hover:bg-[#2a2d2e]"
                }`}
              >
                {s.icon}
                {s.label}
                {activeSection === s.id && <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-400" />}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            {activeSection === "editor" && <EditorSection settings={settings} set={set} />}
            {activeSection === "appearance" && <AppearanceSection settings={settings} set={set} />}
            {activeSection === "autosave" && <AutoSaveSection settings={settings} set={set} />}
            {activeSection === "about" && <AboutSection />}
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-2.5 bg-[#252526] border-t border-[#3e3e42] text-xs text-gray-500 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Changes apply instantly to the editor
        </div>
      </div>
    </div>
  );
}

function EditorSection({ settings, set }: { settings: EditorSettings; set: <K extends keyof EditorSettings>(k: K, v: EditorSettings[K]) => void }) {
  return (
    <div>
      <SectionTitle>Text</SectionTitle>
      <SettingRow label="Font Size" description="Controls the font size in pixels.">
        <NumberInput value={settings.fontSize} onChange={(v) => set("fontSize", v)} min={10} max={28} />
      </SettingRow>
      <SettingRow label="Line Height" description="Controls the line height multiplier.">
        <Select
          value={String(settings.lineHeight)}
          onChange={(v) => set("lineHeight", parseFloat(v))}
          options={[1.2, 1.4, 1.6, 1.8, 2.0].map((v) => ({ value: String(v), label: String(v) }))}
        />
      </SettingRow>

      <SectionTitle>Display</SectionTitle>
      <SettingRow label="Word Wrap" description="Wraps long lines instead of scrolling horizontally.">
        <Toggle checked={settings.wordWrap} onChange={(v) => set("wordWrap", v)} />
      </SettingRow>
      <SettingRow label="Line Numbers" description="Show line numbers in the gutter.">
        <Toggle checked={settings.lineNumbers} onChange={(v) => set("lineNumbers", v)} />
      </SettingRow>
      <SettingRow label="Cursor Style" description="The shape of the cursor in the editor.">
        <Select
          value={settings.cursorStyle}
          onChange={(v) => set("cursorStyle", v)}
          options={[
            { value: "line",      label: "Line (|)" },
            { value: "block",     label: "Block (█)" },
            { value: "underline", label: "Underline (_)" },
          ]}
        />
      </SettingRow>
      <SettingRow label="Render Whitespace" description="Show whitespace characters in the editor.">
        <Select
          value={settings.renderWhitespace}
          onChange={(v) => set("renderWhitespace", v)}
          options={[
            { value: "none",     label: "None" },
            { value: "boundary", label: "Boundary" },
            { value: "all",      label: "All" },
          ]}
        />
      </SettingRow>
    </div>
  );
}

function AppearanceSection({ settings, set }: { settings: EditorSettings; set: <K extends keyof EditorSettings>(k: K, v: EditorSettings[K]) => void }) {
  return (
    <div>
      <SectionTitle>Color Theme</SectionTitle>

      <SettingRow
        label="Theme"
        description="Choose the Monaco editor theme."
      >
        <Select
          value={settings.theme}
          onChange={(v) => set("theme", v)}
          options={Object.entries(EDITOR_THEMES).map(([id, theme]) => ({
            value: id as EditorTheme,
            label: theme.label,
          }))}
        />
      </SettingRow>

      <SectionTitle>Editor Panels</SectionTitle>

      <SettingRow label="Minimap" description="Show a miniature overview of the code on the right side.">
        <Toggle checked={settings.minimap} onChange={(v) => set("minimap", v)} />
      </SettingRow>

      <SettingRow label="Minimap Scale" description="Adjust the size of the editor minimap.">
        <NumberInput
          value={settings.minimapScale}
          onChange={(value) =>
            set("minimapScale", value as 1 | 2 | 3 | 4 | 5)
          }
          min={1}
          max={5}
        />
      </SettingRow>

      <SettingRow label="Bracket Pair Colorization" description="Colorize matching bracket pairs.">
        <Toggle checked={settings.bracketColorization} onChange={(v) => set("bracketColorization", v)} />
      </SettingRow>

      <SettingRow label="Highlight Active Line" description="Highlight the line the cursor is on.">
        <Toggle checked={settings.highlightActiveLine} onChange={(v) => set("highlightActiveLine", v)} />
      </SettingRow>

      <SettingRow label="Scroll Beyond Last Line" description="Allow scrolling one screen length past the last line.">
        <Toggle checked={settings.scrollBeyondLastLine} onChange={(v) => set("scrollBeyondLastLine", v)} />
      </SettingRow>

    </div>
  );
}

function AutoSaveSection({ settings, set }: { settings: EditorSettings; set: <K extends keyof EditorSettings>(k: K, v: EditorSettings[K]) => void }) {
  return (
    <div>
      <SectionTitle>Auto Save</SectionTitle>
      <SettingRow label="Enable Auto Save" description="Automatically save the active file after a delay.">
        <Toggle checked={settings.autoSave} onChange={(v) => set("autoSave", v)} />
      </SettingRow>
      <SettingRow label="Auto Save Delay" description="Delay in milliseconds before auto-saving.">
        <Select
          value={String(settings.autoSaveDelay)}
          onChange={(v) => set("autoSaveDelay", parseInt(v))}
          options={[
            { value: "500",  label: "500ms" },
            { value: "1000", label: "1s" },
            { value: "2000", label: "2s" },
            { value: "5000", label: "5s" },
          ]}
        />
      </SettingRow>

      <SectionTitle>On Save Actions</SectionTitle>
      <SettingRow label="Format on Save" description="Run code formatter when saving a file.">
        <Toggle checked={settings.formatOnSave} onChange={(v) => set("formatOnSave", v)} />
      </SettingRow>
    </div>
  );
}

function AboutSection() {
  const shortcuts: [string, string][] = [
    ["Ctrl+S", "Save current file"],
    ["Ctrl+Enter", "Run code"],
    ["Ctrl+B", "Toggle file explorer"],
    ["Ctrl+J", "Toggle terminal"],
    ["Alt+W", "Close active tab"],
    ["Alt+Tab", "Switch to next tab"],
    ["Ctrl+,", "Open editor settings"],
  ];

  return (
    <div>
      <SectionTitle>codeIT IDE</SectionTitle>
      <div className="bg-[#252526] rounded-xl p-5 border border-[#3e3e42] mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white text-xs font-mono">{"</>"}</span>
          </div>
          <div>
            <p className="text-sm text-white">codeIT Web IDE</p>
            <p className="text-xs text-gray-500">Version 1.0.0 — Build 2026.03</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          A browser-based coding platform with multi-language execution,
          AI-assisted debugging, real-time collaboration, and cloud project management.
        </p>
      </div>

      <SectionTitle>Keyboard Shortcuts</SectionTitle>
      <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
        {shortcuts.map(([key, label], i) => (
          <div
            key={key}
            className={`flex items-center justify-between px-4 py-2.5 ${i !== shortcuts.length - 1 ? "border-b border-[#3e3e42]" : ""}`}
          >
            <span className="text-xs text-gray-400">{label}</span>
            <kbd className="px-2 py-0.5 bg-[#3c3c3c] border border-[#5a5a5e] rounded text-gray-300 text-[10px] font-mono">{key}</kbd>
          </div>
        ))}
      </div>

      <SectionTitle>Support</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: "Documentation", sub: "Read the full docs" },
          { label: "Changelog",     sub: "See what's new" },
          { label: "Report a bug",  sub: "Help improve codeIT" },
          { label: "Community",     sub: "Join the Discord" },
        ].map((item) => (
          <button
            key={item.label}
            className="text-left p-3.5 bg-[#252526] hover:bg-[#2a2d2e] border border-[#3e3e42] hover:border-[#5a5a5e] rounded-xl transition-colors"
          >
            <p className="text-sm text-gray-200">{item.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
