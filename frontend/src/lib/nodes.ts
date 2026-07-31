import { apiFetch } from "./api";

export type NodeType = "file" | "folder";

export type ProjectNode = {
  id: string;
  parentId: string | null; // null = project root
  type: NodeType;
  name: string;
  content: string;         // "" for folders
  updatedAt: string;
};

export async function listNodes(projectId: string) {
  return apiFetch<ProjectNode[]>(`/projects/${projectId}/nodes`);
}

export async function createNode(
  projectId: string,
  input: { parentId: string | null; type: NodeType; name: string; content?: string }
) {
  return apiFetch<ProjectNode>(`/projects/${projectId}/nodes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function saveNode(projectId: string, nodeId: string, content: string) {
  return apiFetch<{ ok: true; id: string; updatedAt: string }>(
    `/projects/${projectId}/nodes/${nodeId}`,
    {
      method: "PUT",
      body: JSON.stringify({ content }),
    }
  );
}

export async function renameNode(projectId: string, nodeId: string, name: string) {
  return apiFetch<ProjectNode>(`/projects/${projectId}/nodes/${nodeId}/rename`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function deleteNode(projectId: string, nodeId: string) {
  return apiFetch<{ ok: true; deletedCount: number }>(
    `/projects/${projectId}/nodes/${nodeId}`,
    { method: "DELETE" }
  );
}