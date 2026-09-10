import { useState, useEffect, useCallback, useMemo, useRef, type ChangeEvent } from "react";
import { useParams } from "react-router";
import {
  File,
  Loader2,
  Clock,
  AlertCircle,
} from "lucide-react";

import { Button } from "../components/ui/button";
import FileExplorer from "../components/FileExplorer";
import CodeEditor from "../components/CodeEditor";
import TerminalPanel from "../components/TerminalPanel";
import AIChatPanel from "../components/AIChatPanel";
import CPHPanel from "../components/CPHPanel";

import EditorDashboard, { DEFAULT_EDITOR_SETTINGS, type EditorSettings } from "../components/EditorDashboard";
import EditorTabs from "../components/EditorTabs";
import IDEHeader from "../components/IDEHeader";
import type { CollaboratorPresence, PersistedIdeState, Role, SaveStatus, CollabStatus } from "../ide/ideTypes";
import {
  EDITOR_SETTINGS_STORAGE_KEY,
  LANGUAGE_DISPLAY,
  buildCollabWsUrl,
  buildNodePathMap,
  collectLocalSubtreeIds,
  executionLanguageFromName,
  formatContentOnSave,
  getExecutionErrorStatus,
  getIdeStorageKey,
  hashToColor,
  languageFromName,
  loadPersistedIdeState,
  mapExecutionResultToTerminal,
  mapNodeToOpenFile,
  replaceTextContent,
  toCollaborators,
  truncateForAI,
} from "../ide/ideUtils";
import { useOpenFiles } from "../ide/hooks/useOpenFiles";

import {
  createNode,
  deleteNode,
  listNodes,
  moveNode,
  renameNode,
  saveNode,
  type ProjectNode,
  type NodeType,
} from "../../lib/nodes";
import type { AIChatContext } from "../../lib/ai";
import { downloadProject, listProjectAudit, type ProjectAuditEntry } from "../../lib/projects";
import { useCollabSession } from "../ide/hooks/useCollabSession";
import { useProjectLoad } from "../ide/hooks/useProjectLoad";
import { useFileSave } from "../ide/hooks/useFileSave";
import { useProjectNodes } from "../ide/hooks/useProjectNodes";
import { useCodeExecution } from "../ide/hooks/useCodeExecution";
import { useAIContext } from "../ide/hooks/useAIContext";
import { useIdeShortcuts } from "../ide/hooks/useIdeShortcuts";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../components/ui/resizable";
import { unzipSync } from "fflate";

function loadEditorDashboardSettings(): EditorSettings {
  if (typeof window === "undefined") {
    return DEFAULT_EDITOR_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_EDITOR_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<EditorSettings> & {
      autoSaveEnabled?: boolean;
      renderWhitespace?: EditorSettings["renderWhitespace"] | boolean;
    };

    const migrated: Partial<EditorSettings> = {
      ...parsed,
      autoSave:
        typeof parsed.autoSave === "boolean"
          ? parsed.autoSave
          : typeof parsed.autoSaveEnabled === "boolean"
          ? parsed.autoSaveEnabled
          : DEFAULT_EDITOR_SETTINGS.autoSave,
    };

    if (typeof parsed.renderWhitespace === "boolean") {
      migrated.renderWhitespace = parsed.renderWhitespace ? "all" : "none";
    }

    return {
      ...DEFAULT_EDITOR_SETTINGS,
      ...migrated,
    };
  } catch {
    return DEFAULT_EDITOR_SETTINGS;
  }
}

export default function IDEPage() {
  const { projectId } = useParams();

  const {
    openFiles,
    activeFileId,
    activeFile,
    tabFiles,
    setActiveFileId,
    openFile,
    closeFile,
    updateActiveContent,
    markSaved,
    initializeFiles,
    renameFile,
    requestCloseFile,
    clearCloseConfirm,
    closeConfirm,
  } = useOpenFiles();
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showCPHPanel, setShowCPHPanel] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [stdin, setStdin] = useState("");
  const [showEditorSettings, setShowEditorSettings] = useState(false);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => loadEditorDashboardSettings());
  const [auditEntries, setAuditEntries] = useState<ProjectAuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [transferError, setTransferError] = useState("");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const {
    projectName,
    role,
    nodes,
    setNodes,
    loading,
    fileError,
    setFileError,
    hasHydratedProjectStateRef,
    panelSizes,
    setPanelSizes,
  } = useProjectLoad(
    projectId,
    { openFiles, activeFileId, activeFile, tabFiles, setActiveFileId, openFile, closeFile, updateActiveContent, markSaved, initializeFiles, renameFile, requestCloseFile, clearCloseConfirm, closeConfirm },
    setShowSidebar,
    setShowAIPanel,
    setShowTerminal,
    setStdin,
  );

  const readOnly = role === "READER";

  const { isRunning, executionResult, setExecutionResult, handleRun } = useCodeExecution(
    projectId,
    activeFile,
    stdin,
    setShowTerminal,
  );

  const { fileBusy, handleCreateNode, handleRenameNode, handleMoveNode, handleDeleteNode } = useProjectNodes(
    projectId,
    readOnly,
    nodes,
    setNodes,
    { openFiles, activeFileId, activeFile, tabFiles, setActiveFileId, openFile, closeFile, updateActiveContent, markSaved, initializeFiles, renameFile, requestCloseFile, clearCloseConfirm, closeConfirm },
    setFileError,
  );

  const { saveStatus, handleSave } = useFileSave(
    projectId,
    readOnly,
    editorSettings.formatOnSave,
    editorSettings.autoSave,
    editorSettings.autoSaveDelay,
    { openFiles, activeFileId, activeFile, tabFiles, setActiveFileId, openFile, closeFile, updateActiveContent, markSaved, initializeFiles, renameFile, requestCloseFile, clearCloseConfirm, closeConfirm },
    setNodes,
    setFileError,
  );

  const { aiContext, aiModels, aiDefaultModel } = useAIContext(
    projectName,
    activeFile,
    openFiles,
    nodes,
    executionResult,
    loading,
    projectId,
  );
  const onSaveShortcut = useCallback(() => {
    void handleSave();
  }, [handleSave]);
  const onRunShortcut = useCallback(() => {
    void handleRun();
  }, [handleRun]);
  const onToggleSidebarShortcut = useCallback(() => setShowSidebar((v) => !v), []);
  const onToggleTerminalShortcut = useCallback(() => setShowTerminal((v) => !v), []);
  const onOpenSettingsShortcut = useCallback(() => setShowEditorSettings(true), []);
  const handleHorizontalLayout = useCallback((sizes: number[]) => {
    let index = 0;
    setPanelSizes((current) => {
      const next = { ...current };
      if (showSidebar) next.sidebar = sizes[index++];
      next.editorWidth = sizes[index++];
      if (showAIPanel || showCPHPanel) next.aiPanel = sizes[index];
      return next;
    });
  }, [showAIPanel, showCPHPanel, showSidebar]);
  const handleVerticalLayout = useCallback((sizes: number[]) => {
    if (!showTerminal || sizes.length < 2) return;
    setPanelSizes((current) => ({ ...current, editor: sizes[0], terminal: sizes[1] }));
  }, [showTerminal]);
  const {
    collabStatus,
    collaborators,
    collabTextRef,
    collabReadyRef,
  } = useCollabSession(projectId, activeFileId, loading, updateActiveContent);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EDITOR_SETTINGS_STORAGE_KEY, JSON.stringify(editorSettings));
  }, [editorSettings]);

  useEffect(() => {
    if (!projectId || !hasHydratedProjectStateRef.current || typeof window === "undefined") return;

    const drafts = openFiles.reduce<Record<string, string>>((accumulator, file) => {
      if (file.content !== file.savedContent) {
        accumulator[file.id] = file.content;
      }
      return accumulator;
    }, {});

    const state: PersistedIdeState = {
      openIds: openFiles.map((file) => file.id),
      activeId: activeFileId,
      drafts,
      stdin,
      layout: {
        showSidebar,
        showAIPanel,
        showTerminal,
      },
      panelSizes,
    };

    window.localStorage.setItem(getIdeStorageKey(projectId), JSON.stringify(state));
  }, [activeFileId, openFiles, panelSizes, projectId, showAIPanel, showSidebar, showTerminal, stdin]);

  const handleCodeChange = useCallback((value: string) => {
    const text = collabTextRef.current;
    if (!text || !collabReadyRef.current) {
      updateActiveContent(value);
      return;
    }

    replaceTextContent(text, value);
  }, [updateActiveContent]);

  useIdeShortcuts({
    activeFileId,
    openFiles,
    isRunning,
    onSave: onSaveShortcut,
    onRun: onRunShortcut,
    onToggleSidebar: onToggleSidebarShortcut,
    onToggleTerminal: onToggleTerminalShortcut,
    onOpenSettings: onOpenSettingsShortcut,
    onCloseFile: requestCloseFile,
    onSetActiveFile: setActiveFileId,
  });

  const langLabel = activeFile ? (LANGUAGE_DISPLAY[activeFile.language] ?? activeFile.language) : "";
  const initials = useMemo(() => (role === "OWNER" ? "OW" : role === "WRITER" ? "ED" : "RD"), [role]);
  const updateEditorSettings = useCallback((next: EditorSettings) => {
    setEditorSettings(next);
  }, []);
  const handleDownload = useCallback(async () => {
    if (!projectId) return;
    const result = await downloadProject(projectId);
    const picker = (window as Window & { showDirectoryPicker?: () => Promise<any> }).showDirectoryPicker;
    if (picker) {
      const directory = await picker();
      for (const [path, data] of Object.entries(unzipSync(new Uint8Array(await result.blob.arrayBuffer())))) {
        if (path.endsWith("/.keep")) continue;
        const parts = path.split("/");
        const fileName = parts.pop()!;
        let target = directory;
        for (const part of parts) target = await target.getDirectoryHandle(part, { create: true });
        const writable = await (await target.getFileHandle(fileName, { create: true })).createWritable();
        await writable.write(data);
        await writable.close();
      }
      return;
    }
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement("a");
    link.href = url; link.download = result.filename; link.click(); URL.revokeObjectURL(url);
  }, [projectId]);
  const handleUpload = useCallback(() => uploadInputRef.current?.click(), []);
  const handleUploadFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";
    if (!files.length || !projectId) return;
    try {
      setTransferError("");
      await Promise.all(files.map(async (file) => createNode(projectId, { parentId: null, type: "file", name: file.name, content: await file.text() })));
      window.location.reload();
    }
    catch (error) { setTransferError(error instanceof Error ? error.message : "Project upload failed"); }
  }, [projectId]);
  const handleAudit = useCallback(async () => {
    if (!projectId) return;
    try { setAuditEntries(await listProjectAudit(projectId)); setShowAudit(true); } catch (error) { setTransferError(error instanceof Error ? error.message : "Could not load activity"); }
  }, [projectId]);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
      <input ref={uploadInputRef} type="file" multiple accept=".cpp,.py,.c,.h,.hpp,.java,.js,.ts,.tsx,.jsx,.go,.rs,.rb,.php,.html,.css,.json,.md,.txt" className="hidden" onChange={handleUploadFile} />
      {showAudit && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-lg border border-[#3e3e42] bg-[#252526] p-5"><div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Project activity</h2><Button size="sm" variant="ghost" onClick={() => setShowAudit(false)}>Close</Button></div>{auditEntries.map((entry) => <div key={entry.id} className="border-b border-[#3e3e42] py-3 text-sm"><p><span className="text-indigo-300">{entry.actor?.name || "Unknown"}</span> {entry.action.toLowerCase().replace(/_/g, " ")} <span className="text-white">{entry.targetName}</span></p><p className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()}</p></div>)}</div></div>}
      {transferError && <div className="px-3 py-2 bg-red-950/30 border-b border-red-800/50 text-red-300 text-xs">{transferError}</div>}
      {closeConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#252526] border border-[#4e4e52] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white mb-1">Unsaved Changes</h3>
                <p className="text-gray-400 text-sm">
                  <span className="text-white font-medium">{closeConfirm.name}</span> has unsaved changes.
                  Do you want to save before closing?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white"
                onClick={clearCloseConfirm}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-[#2a2d2e]"
                onClick={async () => {
                  const targetId = closeConfirm.fileId;
                  const saved = await handleSave(targetId);
                  if (saved) {
                    closeFile(targetId);
                  }
                }}
              >
                Save & Close
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => closeFile(closeConfirm.fileId)}
              >
                Discard & Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEditorSettings && (
        <EditorDashboard
          settings={editorSettings}
          onChange={updateEditorSettings}
          onClose={() => setShowEditorSettings(false)}
        />
      )}

      <IDEHeader
        projectName={projectName}
        language={langLabel}
        collabStatus={collabStatus}
        collaboratorCount={collaborators.length}
        saveStatus={saveStatus}
        hasActiveFile={!!activeFile}
        readOnly={readOnly}
        isRunning={isRunning}
        showSidebar={showSidebar}
        showAIPanel={showAIPanel}
        showCPHPanel={showCPHPanel}
        showEditorSettings={showEditorSettings}
        onToggleSidebar={() => setShowSidebar((value) => !value)}
        onSave={() => void handleSave()}
        onRun={() => void handleRun()}
        onToggleAIPanel={() => { setShowCPHPanel(false); setShowAIPanel((value) => !value); }}
        onToggleCPHPanel={() => { setShowAIPanel(false); setShowCPHPanel((value) => !value); }}
        onOpenEditorSettings={() => setShowEditorSettings(true)}
        onDownload={() => void handleDownload()}
        onUpload={handleUpload}
        onAudit={() => void handleAudit()}
      />

      {fileError && (
        <div className="px-3 py-2 bg-red-950/20 border-b border-red-800/50 text-red-300 text-xs">
          {fileError}
        </div>
      )}

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden" onLayout={handleHorizontalLayout}>
        {showSidebar && (
          <ResizablePanel
            defaultSize={panelSizes.sidebar}
            minSize={15}
            maxSize={40}
            className="bg-[#252526] border-r border-[#3e3e42]"
          >
            <FileExplorer
              nodes={nodes}
              activeNodeId={activeFile?.id}
              readOnly={readOnly}
              busy={fileBusy || loading}
              onFileOpen={openFile}
              onCreateNode={handleCreateNode}
              onRenameNode={handleRenameNode}
              onDeleteNode={handleDeleteNode}
              onMoveNode={handleMoveNode}
            />
          </ResizablePanel>
        )}
        {showSidebar && <ResizableHandle className="bg-[#3e3e42] hover:bg-indigo-500/70" />}

        <ResizablePanel
                    defaultSize={panelSizes.editorWidth}
          minSize={30}
          className="min-w-0"
        >
          <ResizablePanelGroup direction="vertical" onLayout={handleVerticalLayout}>
          <EditorTabs
            files={tabFiles}
            activeFileId={activeFileId}
            onTabClick={setActiveFileId}
            onTabClose={requestCloseFile}
          />

          <ResizablePanel defaultSize={100 - panelSizes.terminal} minSize={40}>
          <div className="h-full overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading project...
              </div>
            ) : activeFile ? (
              <CodeEditor
                value={activeFile.content}
                language={activeFile.language}
                onChange={handleCodeChange}
                settings={editorSettings}
                readOnly={readOnly || collabStatus === "connecting" || collabStatus === "syncing"}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600">
                <div className="text-center space-y-3">
                  <File className="w-14 h-14 mx-auto opacity-15" />
                  <p className="text-sm">No file open</p>
                  <p className="text-xs opacity-70">Create or select a file from the explorer to start coding</p>
                  <div className="text-xs opacity-50 space-y-1 mt-4">
                    <p>Ctrl+S · Save &nbsp;&nbsp; Ctrl+Enter · Run</p>
                    <p>Ctrl+B · Sidebar &nbsp;&nbsp; Ctrl+J · Terminal</p>
                    <p>Ctrl+, · Settings</p>
                    <p>Alt+W · Close tab &nbsp;&nbsp; Alt+Tab · Next tab</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          </ResizablePanel>

          {showTerminal && (
            <>
            <ResizableHandle className="bg-[#3e3e42] hover:bg-indigo-500/70" />
            <ResizablePanel defaultSize={panelSizes.terminal} minSize={15} maxSize={75}>
              <TerminalPanel
                onClose={() => setShowTerminal(false)}
                isRunning={isRunning}
                executionResult={executionResult}
                onClearOutput={() => setExecutionResult(null)}
                stdin={stdin}
                onStdinChange={setStdin}
              />
            </ResizablePanel>
            </>
          )}

          {!showTerminal && (
            <div className="h-7 border-t border-[#3e3e42] bg-[#252526] flex items-center px-3 gap-3 flex-shrink-0">
              <button
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
                onClick={() => setShowTerminal(true)}
                title="Show terminal (Ctrl+J)"
              >
                <Clock className="w-3 h-3" />
                {executionResult ? (
                  <span className={executionResult.status === "accepted" ? "text-green-400" : "text-red-400"}>
                    {executionResult.status === "accepted" ? "✓ Accepted" : "✗ Error"} — {executionResult.executionTime}ms
                  </span>
                ) : (
                  <span>Terminal</span>
                )}
              </button>
            </div>
          )}
          </ResizablePanelGroup>
        </ResizablePanel>
        {(showAIPanel || showCPHPanel) && <ResizableHandle className="bg-[#3e3e42] hover:bg-indigo-500/70" />}

        {showAIPanel && (
          <ResizablePanel defaultSize={panelSizes.aiPanel} minSize={15} maxSize={80} className="bg-[#252526] border-l border-[#3e3e42]">
            <AIChatPanel
              onClose={() => setShowAIPanel(false)}
              context={aiContext}
              models={aiModels}
              defaultModel={aiDefaultModel}
            />
          </ResizablePanel>
        )}
        {showCPHPanel && (
          <ResizablePanel defaultSize={panelSizes.aiPanel} minSize={20} maxSize={80} className="bg-[#252526] border-l border-[#3e3e42]">
            <CPHPanel projectId={projectId ?? ""} sourceCode={activeFile?.content ?? ""} language={activeFile ? executionLanguageFromName(activeFile.name) : null} filePath={activeFile?.name ?? ""} />
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
