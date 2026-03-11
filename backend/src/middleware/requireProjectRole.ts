import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "./authJwt";
import { ProjectAccess } from "../db/models/ProjectAccess";

export type Role = "OWNER" | "WRITER" | "READER";

export function requireProjectRole(allowed: Role[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const projectId = req.params.id || req.params.projectId;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!projectId) return res.status(400).json({ error: "Missing project id" });
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const access = await ProjectAccess.findOne({ userId, projectId });
    if (!access) return res.status(403).json({ error: "No access" });

    if (!allowed.includes(access.role as Role)) {
      return res.status(403).json({ error: "Insufficient role", role: access.role });
    }

    // optional: attach role for later use
    (req as any).projectRole = access.role;

    return next();
  };
}