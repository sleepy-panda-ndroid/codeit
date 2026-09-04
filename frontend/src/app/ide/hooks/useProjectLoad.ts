import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { getProject } from "../../../lib/projects";
import { listNodes, type ProjectNode } from "../../../lib/nodes";
import type { OpenFilesApi } from "./useOpenFiles";
import type { PersistedIdeState, Role } from "../ideTypes";
import { loadPersistedIdeState, mapNodeToOpenFile } from "../ideUtils";

export function useProjectLoad(
  projectId: string | undefined,
  openFilesApi: OpenFilesApi,
  setShowSidebar: (value: boolean) => void,
  setShowAIPanel: (value: boolean) => void,
  setShowTerminal: (value: boolean) => void,
  setStdin: (value: string) => void,
) {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("Project");
  const [role, setRole] = useState<Role>("READER");
  const [nodes, setNodes] = useState<ProjectNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileError, setFileError] = useState("");
  const [panelSizes, setPanelSizes] = useState<NonNullable<PersistedIdeState["panelSizes"]>>({
    sidebar: 20,
    editor: 60,
    terminal: 25,
    aiPanel: 20,
  });
  const hasHydratedProjectStateRef = useRef(false);

  const loadProject = useCallback(async () => {
    if (!projectId) {
      navigate("/app", { replace: true });
      return;
    }

    setLoading(true);
    setFileError("");
    hasHydratedProjectStateRef.current = false;

    try {
      const [projectDetail, allNodes] = await Promise.all([getProject(projectId), listNodes(projectId)]);
      const persisted = loadPersistedIdeState(projectId);

      setProjectName(projectDetail.project.name);
      setRole(projectDetail.role);
      setNodes(allNodes);

      if (persisted) {
        setShowSidebar(persisted.layout.showSidebar);
        setShowAIPanel(persisted.layout.showAIPanel);
        setShowTerminal(persisted.layout.showTerminal);
        setStdin(persisted.stdin ?? "");
        if (persisted.panelSizes) setPanelSizes(persisted.panelSizes);
      }

      const fileNodes = allNodes.filter((node) => node.type === "file");
      const filesById = new Map(fileNodes.map((node) => [node.id, node] as const));
      const preferredIds = persisted?.openIds.filter((id) => filesById.has(id)) ?? [];
      const initialIds = preferredIds.length > 0 ? preferredIds : fileNodes[0] ? [fileNodes[0].id] : [];
      const restoredOpenFiles = initialIds
        .map((id) => filesById.get(id))
        .filter((item): item is ProjectNode => !!item)
        .map((node) => {
          const base = mapNodeToOpenFile(node);
          const draft = persisted?.drafts?.[node.id];
          return { ...base, content: typeof draft === "string" ? draft : base.content };
        });
      const preferredActive = persisted?.activeId;
      const hasPreferredActive = !!preferredActive && restoredOpenFiles.some((file) => file.id === preferredActive);

      openFilesApi.initializeFiles(restoredOpenFiles, hasPreferredActive ? preferredActive! : restoredOpenFiles[0]?.id ?? "");
      hasHydratedProjectStateRef.current = true;
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [navigate, projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  return {
    projectName,
    role,
    nodes,
    setNodes,
    loading,
    setLoading,
    fileError,
    setFileError,
    hasHydratedProjectStateRef,
    panelSizes,
    setPanelSizes,
  };
}
