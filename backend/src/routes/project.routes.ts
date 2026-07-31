import { Router } from "express";
import { z } from "zod";
import { authJwt } from "../middleware/authJwt";
import { requireProjectRole } from "../middleware/requireProjectRole";
import { Project } from "../db/models/Project";
import { ProjectAccess } from "../db/models/ProjectAccess";
import { FileModel } from "../db/models/File";
import { Notification } from "../db/models/Notification";
import { requireProjectReadAccess } from "../middleware/requireProjectReadAccess";
import mongoose from "mongoose";

export const projectRouter = Router();
const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC", "UNLISTED"]).optional(),
});

// Create project

projectRouter.post("/", authJwt, async (req: any, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const session = await mongoose.startSession();
  try {
    let project;
    await session.withTransaction(async () => {
      const [created] = await Project.create(
        [{ name: parsed.data.name, description: parsed.data.description }],
        { session }
      );
      await ProjectAccess.create(
        [{ projectId: created._id, userId: req.userId, role: "OWNER", status: "ACCEPTED" }],
        { session }
      );
      project = created;
    });
    res.status(201).json(project);
  } catch {
    res.status(500).json({ error: "Failed to create project" });
  } finally {
    session.endSession();
  }
});

// List all accessible projects
projectRouter.get("/", authJwt, async (req: any, res) => {
  const accessRows = await ProjectAccess.find({
    userId: req.userId,
    status: "ACCEPTED",
  })
    .select("projectId role")
    .lean();

  const projectIds = accessRows.map((a) => a.projectId);

  const projects = await Project.find({ _id: { $in: projectIds } }).lean();

  const roleMap = new Map(
    accessRows.map((a) => [String(a.projectId), a.role] as const)
  );

  res.json(
    projects.map((p: any) => ({
      ...p,
      role: roleMap.get(String(p._id)) ?? "READER",
    }))
  );
});

// List owned projects
projectRouter.get("/owned", authJwt, async (req: any, res) => {
  const rows = await ProjectAccess.find({
    userId: req.userId,
    role: "OWNER",
    status: "ACCEPTED",
  }).select("projectId").lean();

  const projectIds = rows.map((r) => r.projectId);
  const projects = await Project.find({ _id: { $in: projectIds } }).lean();

  res.json(projects.map((p: any) => ({ ...p, role: "OWNER" })));
});

// List shared projects
projectRouter.get("/shared", authJwt, async (req: any, res) => {
  const accessRows = await ProjectAccess.find({
    userId: req.userId,
    role: { $in: ["READER", "WRITER"] },
    status: "ACCEPTED",
  })
    .select("projectId role")
    .lean();

  const projectIds = accessRows.map((row) => row.projectId);

  const projects = await Project.find({
    _id: { $in: projectIds },
  }).lean();

  const roleMap = new Map(
    accessRows.map((row) => [String(row.projectId), row.role] as const)
  );

  res.json(
    projects.map((p: any) => ({
      ...p,
      role: roleMap.get(String(p._id)) ?? "READER",
    }))
  );
});

// Browse public projects (discovery)
projectRouter.get("/public", authJwt, async (req: any, res) => {
  const projects = await Project.find({ visibility: "PUBLIC" })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  const projectIds = projects.map((p) => p._id);

  // owner comes from the OWNER access row (ownerId no longer exists)
  const ownerRows = await ProjectAccess.find({
    projectId: { $in: projectIds },
    role: "OWNER",
  })
    .populate("userId", "_id name")   // name only — no email on a public list
    .lean();

  const ownerMap = new Map(
    ownerRows.map((r: any) => [String(r.projectId), r.userId])
  );

  // does the caller already have access? lets the UI show "Open" vs "View"
  const myAccess = await ProjectAccess.find({
    userId: req.userId,
    projectId: { $in: projectIds },
    status: "ACCEPTED",
  })
    .select("projectId role")
    .lean();

  const myRoleMap = new Map(
    myAccess.map((r: any) => [String(r.projectId), r.role])
  );

  res.json(
    projects.map((p: any) => {
      const owner = ownerMap.get(String(p._id));
      return {
        _id: String(p._id),
        name: p.name,
        description: p.description ?? "",
        visibility: p.visibility,
        updatedAt: p.updatedAt,
        owner: owner ? { id: String(owner._id), name: owner.name } : null,
        myRole: myRoleMap.get(String(p._id)) ?? null,
      };
    })
  );
});

// Update project (owner only)
projectRouter.patch(
  "/:id",
  authJwt,
  requireProjectRole(["OWNER"]),
  async (req: any, res) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: parsed.data },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(updated);
  }
);

// Delete project (owner only)
projectRouter.delete(
  "/:id",
  authJwt,
  requireProjectRole(["OWNER"]),
  async (req: any, res) => {
    const projectId = req.params.id;

    await Project.deleteOne({ _id: projectId });
    await Promise.all([
      ProjectAccess.deleteMany({ projectId }),
      FileModel.deleteMany({ projectId }),
      Notification.deleteMany({ projectId }),
    ]);

    res.json({ ok: true });
  }
);

// Get single project detail + current user's role
projectRouter.get(
  "/:id",
  authJwt,
  requireProjectReadAccess(),
  async (req: any, res) => {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({
      project,
      role: req.projectRole,
    });
  }
);