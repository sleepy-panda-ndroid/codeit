import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { createNode, deleteNode, moveNode, renameNode, type NodeType, type ProjectNode } from "../../../lib/nodes";
import { collectLocalSubtreeIds } from "../ideUtils";
import type { OpenFilesApi } from "./useOpenFiles";

export function useProjectNodes(
  projectId: string | undefined,
  readOnly: boolean,
  nodes: ProjectNode[],
  setNodes: Dispatch<SetStateAction<ProjectNode[]>>,
  openFilesApi: OpenFilesApi,
  setFileError: (value: string) => void,
) {
  const { openFile, renameFile, closeFile, openFiles } = openFilesApi;
  const [fileBusy, setFileBusy] = useState(false);

  const handleCreateNode = useCallback(async (input: { parentId: string | null; type: NodeType; name: string }) => {
    if (!projectId || readOnly) return;
    setFileBusy(true);
    setFileError("");
    try {
      const created = await createNode(projectId, input);
      setNodes((previous) => [...previous, created]);
      if (created.type === "file") openFile(created);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setFileBusy(false);
    }
  }, [openFile, projectId, readOnly]);

  const handleRenameNode = useCallback(async (nodeId: string, name: string) => {
    if (!projectId || readOnly) return;
    setFileBusy(true);
    setFileError("");
    try {
      const updated = await renameNode(projectId, nodeId, name);
      setNodes((previous) => previous.map((node) => (
        node.id === nodeId ? { ...node, name: updated.name, updatedAt: updated.updatedAt } : node
      )));
      renameFile(nodeId, updated.name);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to rename");
    } finally {
      setFileBusy(false);
    }
  }, [projectId, readOnly, renameFile]);

  const handleMoveNode = useCallback(async (nodeId: string, parentId: string | null) => {
    if (!projectId || readOnly) return;
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    if ((node.parentId ?? null) === (parentId ?? null)) return;
    if (node.type === "folder" && parentId) {
      const subtree = collectLocalSubtreeIds(nodes, nodeId);
      if (subtree.has(parentId)) {
        setFileError("Cannot move a folder into its own subtree");
        return;
      }
    }
    setFileBusy(true);
    setFileError("");
    try {
      const updated = await moveNode(projectId, nodeId, parentId);
      setNodes((previous) => previous.map((item) => (item.id === nodeId ? { ...item, parentId: updated.parentId } : item)));
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to move");
    } finally {
      setFileBusy(false);
    }
  }, [nodes, projectId, readOnly]);

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    if (!projectId || readOnly) return;
    setFileBusy(true);
    setFileError("");
    const removedIds = collectLocalSubtreeIds(nodes, nodeId);
    try {
      await deleteNode(projectId, nodeId);
      setNodes((previous) => previous.filter((node) => !removedIds.has(node.id)));
      removedIds.forEach((id) => {
        if (openFiles.some((file) => file.id === id)) closeFile(id);
      });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setFileBusy(false);
    }
  }, [closeFile, nodes, openFiles, projectId, readOnly]);

  return { fileBusy, handleCreateNode, handleRenameNode, handleMoveNode, handleDeleteNode };
}
