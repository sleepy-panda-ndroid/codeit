import { ProjectAuditLog } from "../db/models/ProjectAuditLog";

export async function recordProjectAudit(input: {
  projectId: string;
  actorId: string;
  action: string;
  targetType: "PROJECT" | "FILE" | "FOLDER" | "MEMBER";
  targetId: string;
  targetName: string;
  details?: Record<string, unknown>;
}) {
  return ProjectAuditLog.create(input);
}
