import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "./authJwt";
import { ProjectAccess } from "../db/models/ProjectAccess";
import { Project } from "../db/models/Project";

export function requireProjectReadAccess() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const projectId = req.params.id || req.params.projectId;

    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    // 1. explicit membership wins — gives the real role
    if (userId) {
      const access = await ProjectAccess.findOne({
        userId,
        projectId,
        status: "ACCEPTED",
      });
      if (access) {
        (req as any).projectRole = access.role;
        return next();
      }
    }

    // 2. fall back to visibility
    const project = await Project.findById(projectId).select("visibility");
    if (!project) return res.status(404).json({ error: "Project not found" });

    if (project.visibility === "PRIVATE") {
      return res.status(403).json({ error: "No access" });
    }

    // public / unlisted → read-only
    (req as any).projectRole = "READER";
    return next();
  };
}