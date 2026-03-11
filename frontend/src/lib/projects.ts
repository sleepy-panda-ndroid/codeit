import { apiFetch } from "@/lib/api";

export type Project = {
  _id: string;
  name: string;
  visibility: "PRIVATE" | "PUBLIC" | "UNLISTED";
  ownerId: string;
  role: "OWNER" | "WRITER" | "READER";
  createdAt: string;
  updatedAt: string;
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

export async function deleteProject(id: string) {
  return apiFetch<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" });
}

export async function patchProject(
  id: string,
  patch: Partial<Pick<Project, "name" | "visibility">>
) {
  return apiFetch<Project>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function shareProject(
  id: string,
  email: string,
  role: "READER" | "WRITER"
) {
  return apiFetch(`/projects/${id}/share`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

// export async function listMembers(id: string) {
//   return apiFetch(`/projects/${id}/members`);
// }

export type ProjectMember = {
  role: "OWNER" | "WRITER" | "READER";
  user: {
    id: string;
    name: string;
    email: string;
  };
  addedAt: string;
};

export async function listProjectMembers(projectId: string) {
  return apiFetch<ProjectMember[]>(`/projects/${projectId}/members`);
}

export async function removeProjectMember(projectId: string, userId: string) {
  return apiFetch<{ ok: boolean }>(`/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: "READER" | "WRITER"
) {
  return apiFetch<{ ok: boolean; role: "READER" | "WRITER" }>(
    `/projects/${projectId}/members/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }
  );
}