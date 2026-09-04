import { apiFetch } from "./api";

export type NotificationItem = {
  id: string;
  type: "PROJECT_INVITE";
  title: string;
  message: string;
  projectId: string;
  projectName: string;
  accessId: string;
  actor: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  resolvedAt: string | null;
};

export async function listNotifications() {
  return apiFetch<NotificationItem[]>("/notifications");
}

export async function getNotificationCount() {
  return apiFetch<{ count: number }>("/notifications/count");
}

export async function acceptProjectInvite(accessId: string) {
  return apiFetch<{
    ok: true;
    status: "ACCEPTED";
    projectId: string;
    role: "READER" | "WRITER";
  }>(`/project-invites/${accessId}/accept`, {
    method: "POST",
  });
}

export async function declineProjectInvite(accessId: string) {
  return apiFetch<{ ok: true; status: "DECLINED" }>(
    `/project-invites/${accessId}/decline`,
    {
      method: "POST",
    }
  );
}