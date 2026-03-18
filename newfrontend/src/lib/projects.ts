import { apiFetch } from "./api";

export type ProjectRole = "OWNER" | "WRITER" | "READER";
export type ProjectVisibility = "PRIVATE" | "PUBLIC" | "UNLISTED";

export type Project = {
  _id: string;
  name: string;
  visibility: ProjectVisibility;
  ownerId: string;
  role: ProjectRole;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMember = {
  role: ProjectRole;
  user: {
    id: string;
    name: string;
    email: string;
  };
  addedAt: string;
};

export async function listProjects() {
  return apiFetch<Project[]>("/projects");
}

export async function listOwnedProjects() {
  return apiFetch<Project[]>("/projects/owned");
}

export async function listSharedProjects() {
  return apiFetch<Project[]>("/projects/shared");
}

export async function createProject(name: string) {
  return apiFetch<Project>("/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function getProject(projectId: string) {
  return apiFetch<{ project: Omit<Project, "role">; role: ProjectRole }>(`/projects/${projectId}`);
}

export async function listProjectMembers(projectId: string) {
  return apiFetch<ProjectMember[]>(`/projects/${projectId}/members`);
}

export async function shareProject(projectId: string, email: string, role: "READER" | "WRITER") {
  return apiFetch<{ ok: true }>(`/projects/${projectId}/share`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: "READER" | "WRITER"
) {
  return apiFetch<{ ok: true; role: "READER" | "WRITER" }>(`/projects/${projectId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeProjectMember(projectId: string, userId: string) {
  return apiFetch<{ ok: true }>(`/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}
