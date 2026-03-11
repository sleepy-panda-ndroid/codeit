import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import validator from "validator";
import { authJwt } from "../middleware/authJwt";
import { requireProjectRole } from "../middleware/requireProjectRole";
import { User } from "../db/models/User";
import { ProjectAccess } from "../db/models/ProjectAccess";

export const shareRouter = Router();

const shareSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["READER", "WRITER"]),
});

// OWNER grants READER/WRITER by user email
shareRouter.post(
  "/projects/:id/share",
  authJwt,
  requireProjectRole(["OWNER"]),
  async (req: any, res) => {
    const projectId = req.params.id;
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const parsed = shareSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const email = validator.normalizeEmail(parsed.data.email) ?? parsed.data.email.toLowerCase();
    const role = parsed.data.role;

    const targetUser = await User.findOne({ email }).select("_id name email");
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    // Upsert access row (do not allow changing OWNER via this endpoint)
    const existing = await ProjectAccess.findOne({ projectId, userId: targetUser._id });
    if (existing?.role === "OWNER") {
      return res.status(400).json({ error: "Cannot modify owner role" });
    }

    await ProjectAccess.updateOne(
      { projectId, userId: targetUser._id },
      { $set: { role } },
      { upsert: true }
    );

    return res.json({
      ok: true,
      user: { id: String(targetUser._id), name: targetUser.name, email: targetUser.email },
      role,
    });
  }
);

// List members (Members only)
shareRouter.get(
  "/projects/:id/members",
  authJwt,
  requireProjectRole(["OWNER", "READER", "WRITER"]),
  async (req: any, res) => {
    const projectId = req.params.id;

    const rows = await ProjectAccess.find({ projectId })
      .populate("userId", "_id name email")
      .select("role userId createdAt");

    const members = rows.map((r: any) => ({
      role: r.role,
      user: {
        id: String(r.userId?._id),
        name: r.userId?.name ?? "",
        email: r.userId?.email ?? "",
      },
      addedAt: r.createdAt,
    }));

    res.json(members);
  }
);

// Remove member (OWNER only)
// Note: cannot remove owner membership here
shareRouter.delete(
  "/projects/:id/members/:userId",
  authJwt,
  requireProjectRole(["OWNER"]),
  async (req: any, res) => {
    const projectId = req.params.id;
    const userId = req.params.userId;

    if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const row = await ProjectAccess.findOne({ projectId, userId });
    if (!row) return res.status(404).json({ error: "Member not found" });
    if (row.role === "OWNER") return res.status(400).json({ error: "Cannot remove owner" });

    await ProjectAccess.deleteOne({ projectId, userId });
    res.json({ ok: true });
  }
);

const updateMemberRoleSchema = z.object({
  role: z.enum(["READER", "WRITER"]),
});

shareRouter.patch(
  "/projects/:id/members/:userId",
  authJwt,
  requireProjectRole(["OWNER"]),
  async (req: any, res) => {
    const projectId = req.params.id;
    const userId = req.params.userId;

    if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const parsed = updateMemberRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const row = await ProjectAccess.findOne({ projectId, userId });
    if (!row) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (row.role === "OWNER") {
      return res.status(400).json({ error: "Cannot change owner role" });
    }

    row.role = parsed.data.role;
    await row.save();

    return res.json({ ok: true, role: row.role });
  }
);