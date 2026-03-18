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

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  indentStyle: "spaces" | "tabs";
  wordWrap: boolean;
  lineNumbers: boolean;
  cursorStyle: "line" | "block" | "underline";
  lineHeight: number;
  renderWhitespace: "none" | "boundary" | "all";
  theme: string;
  minimap: boolean;
  bracketColorization: boolean;
  scrollBeyondLastLine: boolean;
  highlightActiveLine: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  formatOnSave: boolean;
  keybinding: "default" | "vim" | "emacs";
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  fontFamily: "JetBrains Mono",
  tabSize: 2,
  indentStyle: "spaces",
  wordWrap: false,
  lineNumbers: true,
  cursorStyle: "line",
  lineHeight: 1.6,
  renderWhitespace: "none",
  theme: "vsDark",
  minimap: false,
  bracketColorization: true,
  scrollBeyondLastLine: false,
  highlightActiveLine: true,
  autoSave: false,
  autoSaveDelay: 1000,
  formatOnSave: false,
  keybinding: "default",
};

export const EDITOR_THEMES: Record<string, { label: string; bg: string; text: string; gutter: string; border: string; accent: string }> = {
  vsDark:       { label: "VS Dark (Default)",   bg: "#1e1e1e", text: "#d4d4d4", gutter: "#252526", border: "#3e3e42", accent: "#569cd6" },
  monokai:      { label: "Monokai",             bg: "#272822", text: "#f8f8f2", gutter: "#2d2e27", border: "#49483e", accent: "#f92672" },
  dracula:      { label: "Dracula",             bg: "#282a36", text: "#f8f8f2", gutter: "#21222c", border: "#44475a", accent: "#bd93f9" },
  oneDarkPro:   { label: "One Dark Pro",        bg: "#282c34", text: "#abb2bf", gutter: "#21252b", border: "#3e4451", accent: "#61afef" },
  githubDark:   { label: "GitHub Dark",         bg: "#0d1117", text: "#c9d1d9", gutter: "#161b22", border: "#30363d", accent: "#58a6ff" },
  solarizedDark:{ label: "Solarized Dark",      bg: "#002b36", text: "#839496", gutter: "#073642", border: "#144652", accent: "#268bd2" },
  nightOwl:     { label: "Night Owl",           bg: "#011627", text: "#d6deeb", gutter: "#01111d", border: "#1d3b53", accent: "#82aaff" },
  nord:         { label: "Nord",                bg: "#2e3440", text: "#d8dee9", gutter: "#3b4252", border: "#434c5e", accent: "#88c0d0" },
};

export const FONT_FAMILIES = [
  "JetBrains Mono",
  "Fira Code",
  "Source Code Pro",
  "Cascadia Code",
  "Monaco",
  "Consolas",
  "Menlo",
  "monospace",
];

type Section = "editor" | "appearance" | "autosave" | "keybindings" | "about";

const SECTIONS: { id: Section; label: string; icon: ReactNode }[] = [
  { id: "editor",      label: "Editor",       icon: <Type className="w-4 h-4" /> },
  { id: "appearance",  label: "Appearance",   icon: <Palette className="w-4 h-4" /> },
  { id: "autosave",    label: "Auto Save",    icon: <Save className="w-4 h-4" /> },
  { id: "keybindings", label: "Keybindings",  icon: <Keyboard className="w-4 h-4" /> },
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

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
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
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-lg transition-all ${saved ? "bg-green-600" : "bg-indigo-600 hover:bg-indigo-500"}`}
            >
              {saved ? <><Check className="w-3.5 h-3.5" />Saved!</> : <><Save className="w-3.5 h-3.5" />Save settings</>}
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
            {activeSection === "keybindings" && <KeybindingsSection settings={settings} set={set} />}
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
      <SettingRow label="Font Family" description="The font family used in the editor.">
        <Select
          value={settings.fontFamily}
          onChange={(v) => set("fontFamily", v)}
          options={FONT_FAMILIES.map((f) => ({ value: f, label: f }))}
        />
      </SettingRow>
      <SettingRow label="Line Height" description="Controls the line height multiplier.">
        <Select
          value={String(settings.lineHeight)}
          onChange={(v) => set("lineHeight", parseFloat(v))}
          options={[1.2, 1.4, 1.6, 1.8, 2.0].map((v) => ({ value: String(v), label: String(v) }))}
        />
      </SettingRow>

      <SectionTitle>Indentation</SectionTitle>
      <SettingRow label="Tab Size" description="Number of spaces a tab is equal to.">
        <Select
          value={String(settings.tabSize)}
          onChange={(v) => set("tabSize", parseInt(v))}
          options={[2, 4, 8].map((v) => ({ value: String(v), label: `${v} spaces` }))}
        />
      </SettingRow>
      <SettingRow label="Indent Style" description="Use spaces or tabs for indentation.">
        <Select
          value={settings.indentStyle}
          onChange={(v) => set("indentStyle", v)}
          options={[
            { value: "spaces", label: "Spaces" },
            { value: "tabs",   label: "Tabs" },
          ]}
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
      <div className="grid grid-cols-2 gap-2.5 mb-2">
        {Object.entries(EDITOR_THEMES).map(([id, t]) => (
          <button
            key={id}
            onClick={() => set("theme", id)}
            className={`relative text-left rounded-xl p-3 border-2 transition-all ${
              settings.theme === id
                ? "border-indigo-500 ring-1 ring-indigo-500/50"
                : "border-[#3e3e42] hover:border-[#5a5a5e]"
            }`}
            style={{ background: t.bg }}
          >
            <div className="flex gap-2 mb-2">
              <div className="w-8 flex flex-col gap-1" style={{ background: t.gutter, borderRadius: 4, padding: "4px 3px" }}>
                {[1, 2, 3].map((n) => <div key={n} className="h-1.5 rounded-sm opacity-40" style={{ background: t.text }} />)}
              </div>
              <div className="flex-1 flex flex-col gap-1 pt-1">
                <div className="h-1.5 w-3/4 rounded-sm" style={{ background: t.accent }} />
                <div className="h-1.5 w-1/2 rounded-sm opacity-60" style={{ background: t.text }} />
                <div className="h-1.5 w-5/6 rounded-sm opacity-40" style={{ background: t.text }} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: t.text }}>{t.label}</span>
              {settings.theme === id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
            </div>
          </button>
        ))}
      </div>

      <SectionTitle>Editor Panels</SectionTitle>
      <SettingRow label="Minimap" description="Show a miniature overview of the code on the right side.">
        <Toggle checked={settings.minimap} onChange={(v) => set("minimap", v)} />
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

function KeybindingsSection({ settings, set }: { settings: EditorSettings; set: <K extends keyof EditorSettings>(k: K, v: EditorSettings[K]) => void }) {
  const keybindings: { id: EditorSettings["keybinding"]; label: string; desc: string; shortcuts: [string, string][] }[] = [
    {
      id: "default",
      label: "Default (VS Code)",
      desc: "Standard keybindings similar to Visual Studio Code.",
      shortcuts: [["Ctrl+S", "Save"], ["Ctrl+Enter", "Run"], ["Ctrl+B", "Toggle sidebar"], ["Alt+W", "Close tab"]],
    },
    {
      id: "vim",
      label: "Vim",
      desc: "Vim-style modal editing keybindings.",
      shortcuts: [["i", "Insert mode"], ["Esc", "Normal mode"], [":w", "Save"], [":q", "Quit"]],
    },
    {
      id: "emacs",
      label: "Emacs",
      desc: "Emacs-style keybindings using Ctrl/Meta combinations.",
      shortcuts: [["C-x C-s", "Save"], ["C-x C-c", "Quit"], ["C-g", "Cancel"], ["M-x", "Command"]],
    },
  ];

  return (
    <div className="space-y-3">
      <SectionTitle>Keybinding Preset</SectionTitle>
      {keybindings.map((kb) => (
        <button
          key={kb.id}
          onClick={() => set("keybinding", kb.id)}
          className={`w-full text-left rounded-xl p-4 border-2 transition-all ${
            settings.keybinding === kb.id
              ? "border-indigo-500 bg-indigo-600/10"
              : "border-[#3e3e42] bg-[#252526] hover:border-[#5a5a5e]"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-white">{kb.label}</span>
            {settings.keybinding === kb.id && (
              <span className="flex items-center gap-1 text-xs text-indigo-400">
                <Check className="w-3.5 h-3.5" /> Active
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">{kb.desc}</p>
          <div className="flex flex-wrap gap-2">
            {kb.shortcuts.map(([key, label]) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-gray-400">
                <kbd className="px-1.5 py-0.5 bg-[#3c3c3c] border border-[#5a5a5e] rounded text-gray-300 text-[10px] font-mono">{key}</kbd>
                {label}
              </span>
            ))}
          </div>
        </button>
      ))}
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
