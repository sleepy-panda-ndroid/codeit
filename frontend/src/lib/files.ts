import { apiFetch } from "./api";

export type ProjectFile = {
  id: string;
  path: string;
  content: string;
  updatedAt: string;
};

export async function listFiles(projectId: string) {
  return apiFetch<ProjectFile[]>(`/projects/${projectId}/files`);
}

export async function createFile(projectId: string, path: string, content = "") {
  return apiFetch<{ id: string; path: string; content: string }>(`/projects/${projectId}/files`, {
    method: "POST",
    body: JSON.stringify({ path, content }),
  });
}

export async function saveFile(projectId: string, path: string, content: string) {
  const encoded = encodeURIComponent(path);
  return apiFetch<{ ok: true; path: string; updatedAt: string }>(`/projects/${projectId}/files/${encoded}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export async function renameFile(projectId: string, path: string, newPath: string) {
  const encoded = encodeURIComponent(path);
  return apiFetch<{ ok: true; path: string; updatedAt?: string }>(`/projects/${projectId}/files/${encoded}/rename`, {
    method: "PATCH",
    body: JSON.stringify({ newPath }),
  });
}

export async function deleteFile(projectId: string, path: string) {
  const encoded = encodeURIComponent(path);
  return apiFetch<{ ok: true }>(`/projects/${projectId}/files/${encoded}`, {
    method: "DELETE",
  });
}
