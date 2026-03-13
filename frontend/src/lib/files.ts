import { apiFetch } from "@/lib/api";

export type FileItem = {
  id: string;
  path: string;
  content: string;
  updatedAt: string;
};

export async function listFiles(projectId: string) {
  return apiFetch<FileItem[]>(`/projects/${projectId}/files`);
}

export async function createFile(projectId: string, path: string, content = "") {
  return apiFetch(`/projects/${projectId}/files`, {
    method: "POST",
    body: JSON.stringify({ path, content }),
  });
}

export async function saveFile(projectId: string, path: string, content: string) {
  const encoded = encodeURIComponent(path);
  return apiFetch(`/projects/${projectId}/files/${encoded}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export async function deleteFile(projectId: string, path: string) {
  const encoded = encodeURIComponent(path);
  return apiFetch(`/projects/${projectId}/files/${encoded}`, {
    method: "DELETE",
  });
}

export async function renameFile(
  projectId: string,
  path: string,
  newPath: string
) {
  const encoded = encodeURIComponent(path);
  return apiFetch(`/projects/${projectId}/files/${encoded}/rename`, {
    method: "PATCH",
    body: JSON.stringify({ newPath }),
  });
}