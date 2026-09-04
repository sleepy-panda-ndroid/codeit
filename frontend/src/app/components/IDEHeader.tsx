import { Bot, CheckCheck, Loader2, PanelLeft, PanelLeftClose, Play, Save, Settings, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";

type SaveStatus = "saved" | "saving" | "unsaved";
type CollabStatus = "idle" | "connecting" | "syncing" | "ready" | "error";

interface IDEHeaderProps {
  projectName: string;
  language: string;
  collabStatus: CollabStatus;
  collaboratorCount: number;
  saveStatus: SaveStatus;
  hasActiveFile: boolean;
  readOnly: boolean;
  isRunning: boolean;
  showSidebar: boolean;
  showAIPanel: boolean;
  showEditorSettings: boolean;
  initials: string;
  onToggleSidebar: () => void;
  onSave: () => void;
  onRun: () => void;
  onToggleAIPanel: () => void;
  onOpenEditorSettings: () => void;
}

export default function IDEHeader({
  projectName,
  language,
  collabStatus,
  collaboratorCount,
  saveStatus,
  hasActiveFile,
  readOnly,
  isRunning,
  showSidebar,
  showAIPanel,
  showEditorSettings,
  initials,
  onToggleSidebar,
  onSave,
  onRun,
  onToggleAIPanel,
  onOpenEditorSettings,
}: IDEHeaderProps) {
  const collabLabel = collabStatus === "ready"
    ? `${collaboratorCount} online`
    : collabStatus === "syncing" || collabStatus === "connecting"
      ? "Syncing..."
      : collabStatus === "error" ? "Offline" : "Local";

  return (
    <div className="h-11 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between px-3 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" className="w-7 h-7 text-gray-400 hover:text-white hover:bg-[#2a2d2e]" onClick={onToggleSidebar} title="Toggle sidebar (Ctrl+B)">
          {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </Button>
        <span className="text-sm text-gray-200">{projectName}</span>
        <span className="text-xs text-gray-600">·</span>
        <span className="text-xs text-gray-500">{language}</span>
        <span className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${collabStatus === "ready" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : collabStatus === "error" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-slate-500/30 bg-slate-500/10 text-slate-300"}`}>
          <Users className="w-3 h-3" />{collabLabel}
        </span>
        {hasActiveFile && (
          <>
            <span className="text-xs text-gray-600">·</span>
            {saveStatus === "saving" && <span className="flex items-center gap-1 text-xs text-yellow-400"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
            {saveStatus === "saved" && <span className="flex items-center gap-1 text-xs text-green-400"><CheckCheck className="w-3 h-3" /> Saved</span>}
            {saveStatus === "unsaved" && <span className="flex items-center gap-1 text-xs text-orange-400"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Unsaved</span>}
          </>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs text-gray-300 hover:text-white hover:bg-[#2a2d2e] disabled:opacity-40" onClick={onSave} disabled={readOnly || saveStatus === "saved" || saveStatus === "saving"} title="Save (Ctrl+S)">
          <Save className="w-3.5 h-3.5 mr-1.5" />Save
        </Button>
        <Button size="sm" className={`h-7 px-3 text-xs text-white transition-all ${isRunning ? "bg-green-700 cursor-not-allowed" : "bg-green-600 hover:bg-green-500"}`} onClick={onRun} disabled={isRunning} title="Run (Ctrl+Enter)">
          {isRunning ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running...</> : <><Play className="w-3.5 h-3.5 mr-1.5" />Run</>}
        </Button>
        <Button size="icon" variant="ghost" className={`w-7 h-7 hover:bg-[#2a2d2e] ${showAIPanel ? "text-indigo-400" : "text-gray-400 hover:text-white"}`} onClick={onToggleAIPanel} title="Toggle AI assistant"><Bot className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" className={`w-7 h-7 hover:bg-[#2a2d2e] ${showEditorSettings ? "text-indigo-400" : "text-gray-400 hover:text-white"}`} onClick={onOpenEditorSettings} title="Editor settings (Ctrl+,)"><Settings className="w-4 h-4" /></Button>
        <Avatar className="w-7 h-7 ml-1"><AvatarFallback className="bg-indigo-600 text-white text-xs">{initials}</AvatarFallback></Avatar>
      </div>
    </div>
  );
}