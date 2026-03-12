"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProjectEditor } from "@/hooks/useProjectEditor";
import { FileSidebar } from "@/components/editor/FileSidebar";
import { EditorPane } from "@/components/editor/EditorPane";
import { TerminalPanel } from "@/components/editor/TerminalPanel";

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 500;

const MIN_TERMINAL_HEIGHT = 140;
const MAX_TERMINAL_HEIGHT = 500;

type LayoutState = {
  sidebarCollapsed: boolean;
  terminalCollapsed: boolean;
  sidebarWidth: number;
  terminalHeight: number;
};

function loadLayout(): LayoutState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("codeit:layout");
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    return {
      sidebarCollapsed: Boolean(parsed?.sidebarCollapsed),
      terminalCollapsed: Boolean(parsed?.terminalCollapsed),
      sidebarWidth:
        typeof parsed?.sidebarWidth === "number" ? parsed.sidebarWidth : 300,
      terminalHeight:
        typeof parsed?.terminalHeight === "number" ? parsed.terminalHeight : 220,
    };
  } catch {
    return null;
  }
}

function saveLayout(layout: LayoutState) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("codeit:layout", JSON.stringify(layout));
  } catch {
    // ignore storage errors
  }
}

export default function ProjectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = String(id);

  const router = useRouter();
  const { user, loading } = useAuth();
  const ed = useProjectEditor(projectId);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [terminalHeight, setTerminalHeight] = useState(220);

  const [layoutHydrated, setLayoutHydrated] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [loading, user, router]);

  useEffect(() => {
    const layout = loadLayout();
    if (layout) {
      setSidebarCollapsed(layout.sidebarCollapsed);
      setTerminalCollapsed(layout.terminalCollapsed);
      setSidebarWidth(
        Math.max(
          MIN_SIDEBAR_WIDTH,
          Math.min(MAX_SIDEBAR_WIDTH, layout.sidebarWidth)
        )
      );
      setTerminalHeight(
        Math.max(
          MIN_TERMINAL_HEIGHT,
          Math.min(MAX_TERMINAL_HEIGHT, layout.terminalHeight)
        )
      );
    }
    setLayoutHydrated(true);
  }, []);

  useEffect(() => {
    if (!layoutHydrated) return;

    saveLayout({
      sidebarCollapsed,
      terminalCollapsed,
      sidebarWidth,
      terminalHeight,
    });
  }, [
    layoutHydrated,
    sidebarCollapsed,
    terminalCollapsed,
    sidebarWidth,
    terminalHeight,
  ]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === "b") {
        e.preventDefault();
        setSidebarCollapsed((v) => !v);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === "j") {
        e.preventDefault();
        setTerminalCollapsed((v) => !v);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function startSidebarResize(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();

    function onMove(ev: MouseEvent) {
      if (!contentRef.current) return;

      const rect = contentRef.current.getBoundingClientRect();
      const next = ev.clientX - rect.left;

      setSidebarWidth(
        Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, next))
      );
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startTerminalResize(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();

    function onMove(ev: MouseEvent) {
      if (!mainRef.current) return;

      const rect = mainRef.current.getBoundingClientRect();
      const next = rect.bottom - ev.clientY;

      setTerminalHeight(
        Math.max(MIN_TERMINAL_HEIGHT, Math.min(MAX_TERMINAL_HEIGHT, next))
      );
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  if (loading || !layoutHydrated) return <div className="p-4">Loading...</div>;
  if (!user) return null;

  const contentGridColumns = sidebarCollapsed
    ? "1fr"
    : `${sidebarWidth}px 6px minmax(0, 1fr)`;

  const mainGridRows = terminalCollapsed
    ? "minmax(0, 1fr)"
    : `minmax(0, 1fr) 6px ${terminalHeight}px`;

  return (
    <div className="h-screen grid grid-rows-[auto_minmax(0,1fr)] bg-white overflow-hidden">
      <div className="border-b px-3 py-2 flex items-center justify-between gap-3">
        <div className="text-sm min-w-0 truncate">
          <span className="font-semibold">{ed.projectName || "Project"}</span>
          <span className="opacity-70"> · {ed.visibility || "PRIVATE"}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            className="border px-2 py-1 text-xs"
            onClick={() => setSidebarCollapsed((v) => !v)}
            type="button"
            title="Toggle files (Ctrl+B)"
          >
            {sidebarCollapsed ? "Show Files" : "Hide Files"}
          </button>

          <button
            className="border px-2 py-1 text-xs"
            onClick={() => setTerminalCollapsed((v) => !v)}
            type="button"
            title="Toggle terminal (Ctrl+J)"
          >
            {terminalCollapsed ? "Show Terminal" : "Hide Terminal"}
          </button>

          <div className="text-sm border px-2 py-1">{ed.role || "..."}</div>
        </div>
      </div>

      <div
        ref={contentRef}
        className="min-h-0 min-w-0 grid overflow-hidden"
        style={{ gridTemplateColumns: contentGridColumns }}
      >
        {!sidebarCollapsed && (
          <>
            <div className="min-h-0 min-w-0 overflow-hidden border-r bg-white">
              <FileSidebar
                files={ed.files}
                activePath={ed.activePath}
                onSelect={ed.setActivePath}
                onCreate={ed.handleCreateFile}
                onDelete={ed.handleDeleteFile}
                onBack={() => router.push("/playground")}
                readOnly={ed.readOnly}
              />
            </div>

            <div
              className="cursor-col-resize bg-gray-200 hover:bg-gray-400 transition-colors"
              onMouseDown={startSidebarResize}
              title="Resize files panel"
            />
          </>
        )}

        <div
          ref={mainRef}
          className="min-h-0 min-w-0 grid overflow-hidden"
          style={{ gridTemplateRows: mainGridRows }}
        >
          <div className="min-h-0 min-w-0 overflow-hidden">
            <EditorPane
              activePath={ed.activePath}
              content={ed.content}
              onChange={ed.setContent}
              onSave={ed.handleSave}
              saving={ed.saving}
              dirty={ed.dirty}
              readOnly={ed.readOnly}
              onRun={ed.handleRun}
              running={ed.running}
              executionLanguage={ed.executionLanguage}
            />
          </div>

          {!terminalCollapsed && (
            <>
              <div
                className="cursor-row-resize bg-gray-200 hover:bg-gray-400 transition-colors"
                onMouseDown={startTerminalResize}
                title="Resize terminal"
              />

              <div className="min-h-0 min-w-0 overflow-hidden border-t bg-white">
                <TerminalPanel
                  loading={ed.running}
                  result={ed.executionResult}
                  error={ed.executionError}
                  stdin={ed.stdin}
                  onChangeStdin={ed.setStdin}
                  onClear={ed.clearOutput}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}