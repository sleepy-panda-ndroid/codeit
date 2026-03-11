import { apiFetch } from "@/lib/api";

export type ProjectDetail = {
  project: {
    _id: string;
    name: string;
    visibility: "PRIVATE" | "PUBLIC" | "UNLISTED";
    ownerId: string;
    createdAt: string;
    updatedAt: string;
  };
  role: "OWNER" | "WRITER" | "READER";
};

export async function getProjectDetail(projectId: string) {
  return apiFetch<ProjectDetail>(`/projects/${projectId}`);
}