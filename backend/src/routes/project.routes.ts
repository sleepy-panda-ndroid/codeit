import { Router } from "express";
import { boolean, z } from "zod";
import { authJwt } from "../middleware/authJwt";
import { requireProjectRole } from "../middleware/requireProjectRole";
import { Project } from "../db/models/Project";
import { ProjectAccess } from "../db/models/ProjectAccess";
import { FileModel } from "../db/models/File";

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
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const project = await Project.create({
    name: parsed.data.name,
    description: parsed.data.description,
    ownerId: req.userId,
  });

  await ProjectAccess.create({
    projectId: project._id,
    userId: req.userId,
    role: "OWNER",
  });

  res.status(201).json(project);
});

// List all accessible projects
projectRouter.get("/", authJwt, async (req: any, res) => {
  const accessRows = await ProjectAccess.find({ userId: req.userId })
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
  const projects = await Project.find({ ownerId: req.userId }).lean();

  res.json(
    projects.map((p: any) => ({
      ...p,
      role: "OWNER",
    }))
  );
});

// List shared projects
projectRouter.get("/shared", authJwt, async (req: any, res) => {
  const accessRows = await ProjectAccess.find({
    userId: req.userId,
    role: { $in: ["READER", "WRITER"] },
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
    await ProjectAccess.deleteMany({ projectId });
    await FileModel.deleteMany({ projectId });

    // later:
    // await InviteModel.deleteMany({ projectId });

    res.json({ ok: true });
  }
);

// Get single project detail + current user's role
projectRouter.get(
  "/:id",
  authJwt,
  requireProjectRole(["OWNER", "WRITER", "READER"]),
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