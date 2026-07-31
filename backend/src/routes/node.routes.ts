import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { authJwt } from "../middleware/authJwt";
import { requireProjectRole } from "../middleware/requireProjectRole";
import { requireProjectReadAccess } from "../middleware/requireProjectReadAccess";
import { NodeModel } from "../db/models/Node";
import { normalizeNodeName } from "../utils/nodeName";

export const nodeRouter = Router({ mergeParams: true });

const toNode = (n: any) => ({
  id: String(n._id),
  parentId: n.parentId ? String(n.parentId) : null,
  type: n.type,
  name: n.name,
  content: n.content ?? "",
  updatedAt: n.updatedAt,
});

// Walk a folder's whole subtree (BFS) and return every node id, root included.
async function collectSubtreeIds(
  projectId: string,
  rootId: mongoose.Types.ObjectId
) {
  const ids: mongoose.Types.ObjectId[] = [rootId];
  let frontier: mongoose.Types.ObjectId[] = [rootId];

  while (frontier.length) {
    const children = await NodeModel.find({
      projectId,
      parentId: { $in: frontier },
    })
      .select("_id")
      .lean();

    if (!children.length) break;
    const childIds = children.map((c: any) => c._id);
    ids.push(...childIds);
    frontier = childIds;
  }
  return ids;
}

// Validate :id (project id)
nodeRouter.use("/projects/:id/nodes", (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project id" });
  }
  return next();
});

// Validate :nodeId where present
nodeRouter.use("/projects/:id/nodes/:nodeId", (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.nodeId)) {
    return res.status(400).json({ error: "Invalid node id" });
  }
  return next();
});

// List every node in the project (READER+ / public read)
nodeRouter.get(
  "/projects/:id/nodes",
  authJwt,
  requireProjectReadAccess(),
  async (req: any, res) => {
    const projectId = req.params.id;
    const nodes = await NodeModel.find({ projectId })
      .select("parentId type name content updatedAt")
      .lean();
    res.json(nodes.map(toNode));
  }
);

// Create a file or folder (WRITER+)
const createSchema = z.object({
  parentId: z.string().nullable().optional(),
  type: z.enum(["file", "folder"]),
  name: z.string().min(1).max(255),
  content: z.string().optional(),
});

nodeRouter.post(
  "/projects/:id/nodes",
  authJwt,
  requireProjectRole(["OWNER", "WRITER"]),
  async (req: any, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const projectId = req.params.id;
    const name = normalizeNodeName(parsed.data.name);
    if (!name) return res.status(400).json({ error: "Invalid name" });

    // Resolve and validate the parent folder (null = root)
    let parentId: mongoose.Types.ObjectId | null = null;
    if (parsed.data.parentId) {
      if (!mongoose.isValidObjectId(parsed.data.parentId)) {
        return res.status(400).json({ error: "Invalid parent id" });
      }
      const parent = await NodeModel.findOne({
        _id: parsed.data.parentId,
        projectId,
        type: "folder",
      });
      if (!parent) {
        return res.status(400).json({ error: "Parent folder not found" });
      }
      parentId = parent._id;
    }

    try {
      const created = await NodeModel.create({
        projectId,
        parentId,
        type: parsed.data.type,
        name,
        content: parsed.data.type === "file" ? parsed.data.content ?? "" : "",
      });
      res.status(201).json(toNode(created));
    } catch (e: any) {
      if (e?.code === 11000) {
        return res
          .status(409)
          .json({ error: "A file or folder with that name already exists here" });
      }
      throw e;
    }
  }
);

// Save file content (WRITER+)
const saveSchema = z.object({ content: z.string() });

nodeRouter.put(
  "/projects/:id/nodes/:nodeId",
  authJwt,
  requireProjectRole(["OWNER", "WRITER"]),
  async (req: any, res) => {
    const parsed = saveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const updated = await NodeModel.findOneAndUpdate(
      { _id: req.params.nodeId, projectId: req.params.id, type: "file" },
      { $set: { content: parsed.data.content } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "File not found" });
    res.json({ ok: true, id: String(updated._id), updatedAt: updated.updatedAt });
  }
);

// Rename a node (WRITER+)
const renameSchema = z.object({ name: z.string().min(1).max(255) });

nodeRouter.patch(
  "/projects/:id/nodes/:nodeId/rename",
  authJwt,
  requireProjectRole(["OWNER", "WRITER"]),
  async (req: any, res) => {
    const parsed = renameSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const name = normalizeNodeName(parsed.data.name);
    if (!name) return res.status(400).json({ error: "Invalid name" });

    try {
      const updated = await NodeModel.findOneAndUpdate(
        { _id: req.params.nodeId, projectId: req.params.id },
        { $set: { name } },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: "Node not found" });
      res.json(toNode(updated));
    } catch (e: any) {
      if (e?.code === 11000) {
        return res
          .status(409)
          .json({ error: "A file or folder with that name already exists here" });
      }
      throw e;
    }
  }
);

// Delete a node; folders take their whole subtree with them (WRITER+)
nodeRouter.delete(
  "/projects/:id/nodes/:nodeId",
  authJwt,
  requireProjectRole(["OWNER", "WRITER"]),
  async (req: any, res) => {
    const projectId = req.params.id;
    const node = await NodeModel.findOne({ _id: req.params.nodeId, projectId });
    if (!node) return res.status(404).json({ error: "Node not found" });

    if (node.type === "folder") {
      const ids = await collectSubtreeIds(projectId, node._id);
      await NodeModel.deleteMany({ _id: { $in: ids } });
      return res.json({ ok: true, deletedCount: ids.length });
    }

    await NodeModel.deleteOne({ _id: node._id });
    res.json({ ok: true, deletedCount: 1 });
  }
);


// Move a node to a different folder (WRITER+)
const moveSchema = z.object({ parentId: z.string().nullable() });
nodeRouter.patch(
  "/projects/:id/nodes/:nodeId/move",
  authJwt,
  requireProjectRole(["OWNER", "WRITER"]),
  async (req: any, res) => {
    const parsed = moveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const projectId = req.params.id;
    const nodeId = req.params.nodeId;

    const node = await NodeModel.findOne({ _id: nodeId, projectId });
    if (!node) return res.status(404).json({ error: "Node not found" });

    // Resolve + validate destination (null = root)
    let newParentId: mongoose.Types.ObjectId | null = null;
    if (parsed.data.parentId) {
      if (!mongoose.isValidObjectId(parsed.data.parentId)) {
        return res.status(400).json({ error: "Invalid parent id" });
      }
      if (parsed.data.parentId === nodeId) {
        return res.status(400).json({ error: "Cannot move a node into itself" });
      }

      const parent = await NodeModel.findOne({
        _id: parsed.data.parentId,
        projectId,
        type: "folder",
      });
      if (!parent) {
        return res.status(400).json({ error: "Destination folder not found" });
      }

      // cycle guard: destination must not sit inside the node's own subtree
      if (node.type === "folder") {
        const subtree = await collectSubtreeIds(projectId, node._id);
        if (subtree.some((id) => String(id) === parsed.data.parentId)) {
          return res
            .status(400)
            .json({ error: "Cannot move a folder into its own subtree" });
        }
      }
      newParentId = parent._id;
    }

    // no-op if it's already there
    if (String(node.parentId ?? "") === String(newParentId ?? "")) {
      return res.json(toNode(node));
    }

    try {
      node.parentId = newParentId;
      await node.save();
      res.json(toNode(node));
    } catch (e: any) {
      if (e?.code === 11000) {
        return res.status(409).json({
          error: "A file or folder with that name already exists in the destination",
        });
      }
      throw e;
    }
  }
);