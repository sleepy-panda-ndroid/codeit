import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { authJwt } from "../middleware/authJwt";
import { requireProjectRole } from "../middleware/requireProjectRole";
import { FileModel } from "../db/models/File";
import { requireProjectReadAccess } from "../middleware/requireProjectReadAccess";

export const fileRouter = Router({ mergeParams: true });

// Validate :id project id
fileRouter.use("/projects/:id/files", (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid project id" });
  }
  return next();
});

// List all files (READER+)
fileRouter.get(
  "/projects/:id/files",
  authJwt,
  requireProjectReadAccess(),
  async (req: any, res) => {
    const projectId = req.params.id;
    const files = await FileModel.find({ projectId }).select("path content updatedAt");
    res.json(files.map(f => ({
      id: String(f._id),
      path: f.path,
      content: f.content,
      updatedAt: f.updatedAt
    })));
  }
);

// Create a file (WRITER+)
const createSchema = z.object({
  path: z.string().min(1).max(300),
  content: z.string().optional().default(""),
});

fileRouter.post(
  "/projects/:id/files",
  authJwt,
  requireProjectRole(["OWNER", "WRITER"]),
  async (req: any, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const projectId = req.params.id;
    const { path, content } = parsed.data;

    try {
      const created = await FileModel.create({ projectId, path, content });
      res.status(201).json({ id: String(created._id), path: created.path, content: created.content });
    } catch (e: any) {
      // duplicate path
      if (e?.code === 11000) return res.status(409).json({ error: "File path already exists" });
      throw e;
    }
  }
);

// Update/Save a file (WRITER+)
// Path is URL-encoded. Example: src%2Fmain.cpp
const updateSchema = z.object({
  content: z.string(),
});

fileRouter.put(
  "/projects/:id/files/:path",
  authJwt,
  requireProjectRole(["OWNER", "WRITER"]),
  async (req: any, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const projectId = req.params.id;
    const path = decodeURIComponent(req.params.path);

    const updated = await FileModel.findOneAndUpdate(
      { projectId, path },
      { $set: { content: parsed.data.content } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "File not found" });

    res.json({ ok: true, path: updated.path, updatedAt: updated.updatedAt });
  }
);

// Rename a file (WRITER+)
const renameSchema = z.object({
  newPath: z.string().trim().min(1).max(300),
});

fileRouter.patch(
  "/projects/:id/files/:path/rename",
  authJwt,
  requireProjectRole(["OWNER", "WRITER"]),
  async (req: any, res) => {
    const parsed = renameSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const projectId = req.params.id;
    const path = decodeURIComponent(req.params.path);
    const newPath = parsed.data.newPath;

    if (path === newPath) {
      return res.json({ ok: true, path: newPath });
    }

    try {
      const updated = await FileModel.findOneAndUpdate(
        { projectId, path },
        { $set: { path: newPath } },
        { new: true }
      );

      if (!updated) return res.status(404).json({ error: "File not found" });

      return res.json({ ok: true, path: updated.path, updatedAt: updated.updatedAt });
    } catch (e: any) {
      if (e?.code === 11000) return res.status(409).json({ error: "File path already exists" });
      throw e;
    }
  }
);

// Delete a file (WRITER+)
fileRouter.delete(
  "/projects/:id/files/:path",
  authJwt,
  requireProjectRole(["OWNER", "WRITER"]),
  async (req: any, res) => {
    const projectId = req.params.id;
    const path = decodeURIComponent(req.params.path);

    const deleted = await FileModel.deleteOne({ projectId, path });
    if (deleted.deletedCount === 0) return res.status(404).json({ error: "File not found" });

    res.json({ ok: true });
  }
);