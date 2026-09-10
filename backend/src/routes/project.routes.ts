import { Router } from "express";
import { z } from "zod";
import { authJwt } from "../middleware/authJwt";
import { requireProjectRole } from "../middleware/requireProjectRole";
import { Project } from "../db/models/Project";
import { ProjectAccess } from "../db/models/ProjectAccess";
import { NodeModel } from "../db/models/Node";
import { Notification } from "../db/models/Notification";
import { requireProjectReadAccess } from "../middleware/requireProjectReadAccess";
import mongoose from "mongoose";
import { removeRoomsForProject } from "../ws/roomRegistry";
import archiver = require("archiver");
import { ProjectAuditLog } from "../db/models/ProjectAuditLog";
import { recordProjectAudit } from "../services/projectAudit.service";
import { assertProjectStorageAvailable } from "../services/projectQuota.service";

export const projectRouter = Router();
const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC", "UNLISTED"]).optional(),
});
const projectImportSchema = z.object({
  format: z.literal("codeit-project"), version: z.literal(1),
  project: z.object({ name: z.string().min(1).max(100), description: z.string().max(2000).optional() }),
  nodes: z.array(z.object({ id: z.string(), parentId: z.string().nullable(), type: z.enum(["file", "folder"]), name: z.string().min(1).max(255), content: z.string().optional() })).max(10000),
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
      await recordProjectAudit({ projectId: String(created._id), actorId: req.userId, action: "PROJECT_CREATED", targetType: "PROJECT", targetId: String(created._id), targetName: created.name });
      project = created;
    });
    res.status(201).json(project);
  } catch {
    res.status(500).json({ error: "Failed to create project" });
  } finally {
    session.endSession();
  }
});

projectRouter.post("/import", authJwt, async (req: any, res) => {
  const parsed = projectImportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid project package" });
  const importedBytes = parsed.data.nodes.reduce((total, node) => total + Buffer.byteLength(node.type === "file" ? node.content ?? "" : "", "utf8"), 0);
  try { await assertProjectStorageAvailable(req.userId, importedBytes); }
  catch (error: any) { if (error?.code === "PROJECT_STORAGE_LIMIT") return res.status(413).json({ error: error.message }); throw error; }
  const [project] = await Project.create([{ name: parsed.data.project.name, description: parsed.data.project.description ?? "", visibility: "PRIVATE" }]);
  await ProjectAccess.create({ projectId: project._id, userId: req.userId, role: "OWNER", status: "ACCEPTED" });
  const idMap = new Map<string, mongoose.Types.ObjectId>();
  for (const node of parsed.data.nodes) idMap.set(node.id, new mongoose.Types.ObjectId());
  await NodeModel.insertMany(parsed.data.nodes.map((node) => ({ _id: idMap.get(node.id), projectId: project._id, parentId: node.parentId ? idMap.get(node.parentId) ?? null : null, type: node.type, name: node.name, content: node.type === "file" ? node.content ?? "" : "" })));
  await recordProjectAudit({ projectId: String(project._id), actorId: req.userId, action: "PROJECT_CREATED", targetType: "PROJECT", targetId: String(project._id), targetName: project.name, details: { imported: true, nodeCount: parsed.data.nodes.length } });
  res.status(201).json(project);
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

// Search owned + shared + public projects by name
projectRouter.get("/search", authJwt, async (req: any, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json([]);

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameFilter = { name: { $regex: escaped, $options: "i" } };

  // the roles this user holds, per project
  const accessRows = await ProjectAccess.find({
    userId: req.userId,
    status: "ACCEPTED",
  })
    .select("projectId role")
    .lean();

  const roleByProject = new Map(accessRows.map((r: any) => [String(r.projectId), r.role]));
  const accessibleIds = accessRows.map((r: any) => r.projectId);

  // name match, limited to what they can access OR anything public
  const projects = await Project.find({
    ...nameFilter,
    $or: [{ _id: { $in: accessibleIds } }, { visibility: "PUBLIC" }],
  })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  res.json(
    projects.map((p: any) => ({
      ...p,
      // members get their real role; public non-members are read-only
      role: roleByProject.get(String(p._id)) ?? "READER",
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

    await recordProjectAudit({ projectId: req.params.id, actorId: req.userId, action: "PROJECT_UPDATED", targetType: "PROJECT", targetId: req.params.id, targetName: updated.name, details: parsed.data });
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

    removeRoomsForProject(projectId);
    await Project.deleteOne({ _id: projectId });
    await Promise.all([
      ProjectAccess.deleteMany({ projectId }),
      NodeModel.deleteMany({ projectId }),
      Notification.deleteMany({ projectId }),
      ProjectAuditLog.deleteMany({ projectId }),
    ]);

    res.json({ ok: true });
  }
);

// Get single project detail + current user's role
projectRouter.get("/:id", authJwt, requireProjectReadAccess(), async (req: any, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json({ project, role: req.projectRole });
});

projectRouter.get("/:id/audit", authJwt, requireProjectReadAccess(), async (req: any, res) => {
  const entries = await ProjectAuditLog.find({ projectId: req.params.id }).populate("actorId", "name email").sort({ createdAt: -1 }).limit(1000).lean();
  res.json(entries.map((entry: any) => ({ id: String(entry._id), action: entry.action, targetType: entry.targetType, targetId: entry.targetId, targetName: entry.targetName, details: entry.details, createdAt: entry.createdAt, actor: entry.actorId ? { id: String(entry.actorId._id), name: entry.actorId.name, email: entry.actorId.email } : null })));
});

projectRouter.get("/:id/download", authJwt, requireProjectReadAccess(), async (req: any, res) => {
  const project = await Project.findById(req.params.id).lean();
  if (!project) return res.status(404).json({ error: "Project not found" });
  const nodes = await NodeModel.find({ projectId: req.params.id }).select("_id parentId type name content").lean();
  const byParent = new Map<string, any[]>();
  nodes.forEach((node: any) => { const key = node.parentId ? String(node.parentId) : "root"; byParent.set(key, [...(byParent.get(key) ?? []), node]); });
  const archive = new archiver.ZipArchive({ zlib: { level: 9 } });
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${String(project.name).replace(/[^a-z0-9_-]+/gi, "-") || "project"}.zip"`);
  archive.on("error", (error: Error) => res.destroy(error));
  const addNodes = (parentId: string, prefix: string) => {
    for (const node of byParent.get(parentId) ?? []) {
      const path = `${prefix}${node.name}`;
      if (node.type === "folder") { archive.append("", { name: `${path}/.keep` }); addNodes(String(node._id), `${path}/`); }
      else archive.append(node.content ?? "", { name: path });
    }
  };
  archive.pipe(res);
  addNodes("root", "");
  await archive.finalize();
});

projectRouter.post("/:id/upload", authJwt, requireProjectRole(["OWNER", "WRITER"]), async (req: any, res) => {
  const parsed = projectImportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid project package" });
  const projectId = req.params.id;
  const importedBytes = parsed.data.nodes.reduce((total, node) => total + Buffer.byteLength(node.type === "file" ? node.content ?? "" : "", "utf8"), 0);
  const existingNodes = await NodeModel.find({ projectId, type: "file" }).select("content").lean();
  const existingBytes = existingNodes.reduce((total, node: any) => total + Buffer.byteLength(node.content ?? "", "utf8"), 0);
  try { await assertProjectStorageAvailable(req.userId, Math.max(0, importedBytes - existingBytes)); }
  catch (error: any) { if (error?.code === "PROJECT_STORAGE_LIMIT") return res.status(413).json({ error: error.message }); throw error; }
  await NodeModel.deleteMany({ projectId });
  const idMap = new Map<string, mongoose.Types.ObjectId>();
  for (const node of parsed.data.nodes) idMap.set(node.id, new mongoose.Types.ObjectId());
  await NodeModel.insertMany(parsed.data.nodes.map((node) => ({ _id: idMap.get(node.id), projectId, parentId: node.parentId ? idMap.get(node.parentId) ?? null : null, type: node.type, name: node.name, content: node.type === "file" ? node.content ?? "" : "" })));
  const project = await Project.findByIdAndUpdate(projectId, { $set: { name: parsed.data.project.name, description: parsed.data.project.description ?? "" } }, { new: true });
  await recordProjectAudit({ projectId, actorId: req.userId, action: "PROJECT_IMPORTED", targetType: "PROJECT", targetId: projectId, targetName: project?.name ?? parsed.data.project.name, details: { nodeCount: parsed.data.nodes.length } });
  res.json({ ok: true, nodeCount: parsed.data.nodes.length });
});