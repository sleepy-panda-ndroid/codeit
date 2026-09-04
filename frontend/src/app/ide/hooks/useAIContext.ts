import { useEffect, useMemo, useRef, useState } from "react";
import { getAIModels, type AIChatContext } from "../../../lib/ai";
import type { ProjectNode } from "../../../lib/nodes";
import type { OpenFile } from "../ideTypes";
import type { ExecutionResult } from "../../components/TerminalPanel";
import { buildNodePathMap, truncateForAI } from "../ideUtils";

export function useAIContext(
  projectName: string,
  activeFile: OpenFile | null,
  openFiles: OpenFile[],
  nodes: ProjectNode[],
  executionResult: ExecutionResult | null,
  loading: boolean,
  projectId: string | undefined,
) {
  const nodePathMap = useMemo(() => buildNodePathMap(nodes), [nodes]);
  const aiContext = useMemo<AIChatContext>(() => {
    const activeFilePath = activeFile ? nodePathMap.get(activeFile.id) || activeFile.name : undefined;
    return {
      projectName,
      activeFilePath,
      activeFileContent: activeFile ? truncateForAI(activeFile.content, 6000) : undefined,
      activeFileOutput: executionResult ? [executionResult.output, executionResult.errorMessage].filter(Boolean).join("\n") : undefined,
      openFiles: openFiles
        .filter((file) => file.id !== activeFile?.id)
        .slice(0, 2)
        .map((file) => ({ path: nodePathMap.get(file.id) || file.name, content: truncateForAI(file.content, 2500) })),
      fileTree: nodes
        .filter((node) => node.type === "file")
        .map((node) => nodePathMap.get(node.id) || node.name)
        .sort()
        .slice(0, 120),
    };
  }, [projectName, activeFile, openFiles, nodes, nodePathMap]);

  const [aiModels, setAiModels] = useState<string[]>([]);
  const [aiDefaultModel, setAiDefaultModel] = useState("");
  const loadedModelsForProjectRef = useRef("");

  useEffect(() => {
    if (!projectId || loading) return;
    if (loadedModelsForProjectRef.current === projectId) return;
    loadedModelsForProjectRef.current = projectId;
    void (async () => {
      try {
        const result = await getAIModels();
        setAiModels(result.models || []);
        setAiDefaultModel(result.defaultModel || "");
      } catch {
        setAiModels([]);
        setAiDefaultModel("");
      }
    })();
  }, [projectId, loading]);

  return { nodePathMap, aiContext, aiModels, aiDefaultModel };
}
