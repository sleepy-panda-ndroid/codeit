import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "./authJwt";
import { ProjectAccess } from "../db/models/ProjectAccess";

export type Role = "OWNER" | "WRITER" | "READER";

const ROLE_RANK: Record<Role, number> = { READER: 0, WRITER: 1, OWNER: 2 };

/**
 * Plain lookup, no req/res. Shared by the HTTP middleware below and by the
 * WS upgrade handler (collabAuth.ts), so the two auth paths can't drift.
 * Returns null if the user has no ACCEPTED access to the project.
 */
export async function getProjectRole(
  userId: string,
  projectId: string
): Promise<Role | null> {
  if (!mongoose.isValidObjectId(projectId)) return null;

  const access = await ProjectAccess.findOne({
    userId,
    projectId,
    status: "ACCEPTED",
  });

  return (access?.role as Role) ?? null;
}

/** True if `role` grants at least as much access as `minimum` (READER < WRITER < OWNER). */
export function roleAtLeast(role: Role | null, minimum: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function requireProjectRole(allowed: Role[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const projectId = String(req.params.id || req.params.projectId || "");

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!projectId) return res.status(400).json({ error: "Missing project id" });
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const role = await getProjectRole(userId, projectId);

    if (!role) return res.status(403).json({ error: "No access" });

    if (!allowed.includes(role)) {
      return res.status(403).json({ error: "Insufficient role", role });
    }

    (req as any).projectRole = role;

    return next();
  };
}