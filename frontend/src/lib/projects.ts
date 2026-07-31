import { apiFetch } from "./api";

export type ProjectRole = "OWNER" | "WRITER" | "READER";
export type ProjectVisibility = "PRIVATE" | "PUBLIC" | "UNLISTED";

export type Project = {
  _id: string;
  name: string;
  visibility: ProjectVisibility;
  ownerId: string;
  description: string;
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

export type ProjectInvitation = {
  id: string;
  role: "READER" | "WRITER";
  user: {
    id: string;
    name: string;
    email: string;
  };
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  invitedAt: string;
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

export async function createProject(name: string, description: string) {
  return apiFetch<Project>("/projects", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export async function getProject(projectId: string) {
  return apiFetch<{ project: Omit<Project, "role">; role: ProjectRole }>(`/projects/${projectId}`);
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, "name" | "visibility">>,
) {
  return apiFetch<Project>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteProject(projectId: string) {
  return apiFetch<{ ok: true }>(`/projects/${projectId}`, {
    method: "DELETE",
  });
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

export async function listProjectInvitations(projectId: string) {
  return apiFetch<ProjectInvitation[]>(`/projects/${projectId}/invitations`);
}

export type PublicProject = {
  _id: string;
  name: string;
  description: string;
  visibility: ProjectVisibility;
  updatedAt: string;
  owner: { id: string; name: string } | null;
  myRole: ProjectRole | null;
};

export async function listPublicProjects() {
  return apiFetch<PublicProject[]>("/projects/public");
}