import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import validator from "validator";
import { authJwt } from "../middleware/authJwt";
import { requireProjectRole } from "../middleware/requireProjectRole";
import { User } from "../db/models/User";
import { Project } from "../db/models/Project";
import { ProjectAccess } from "../db/models/ProjectAccess";
import { Notification } from "../db/models/Notification";

export const shareRouter = Router();

const shareSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["READER", "WRITER"]),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(["READER", "WRITER"]),
});

// OWNER sends invite by email
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
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const email =
      validator.normalizeEmail(parsed.data.email) ??
      parsed.data.email.toLowerCase();
    const role = parsed.data.role;

    const [targetUser, project] = await Promise.all([
      User.findOne({ email }).select("_id name email"),
      Project.findById(projectId).select("_id name"),
    ]);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const existing = await ProjectAccess.findOne({
      projectId,
      userId: targetUser._id,
    });

    if (existing?.role === "OWNER") {
      return res.status(400).json({ error: "Cannot modify owner role" });
    }

    if (existing?.status === "ACCEPTED") {
      return res
        .status(400)
        .json({ error: "User is already a collaborator" });
    }

    const access = await ProjectAccess.findOneAndUpdate(
      { projectId, userId: targetUser._id },
      {
        $set: {
          role,
          status: "PENDING",
          invitedBy: req.userId,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    if (!access) {
      return res.status(500).json({ error: "Failed to create invite" });
    }

    await Notification.findOneAndUpdate(
      { accessId: access._id },
      {
        $set: {
          userId: targetUser._id,
          type: "PROJECT_INVITE",
          projectId,
          accessId: access._id,
          actorId: req.userId,
          title: "Project Invitation",
          message: `You were invited to "${project.name}" as ${role}.`,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );


    // keep only the 50 most recent notifications for this user
    const stale = await Notification.find({ userId: targetUser._id })
      .sort({ createdAt: -1 })
      .skip(50)
      .select("_id")
      .lean();

    if (stale.length) {
      await Notification.deleteMany({ _id: { $in: stale.map((s) => s._id) } });
    }

    return res.json({
      ok: true,
      invitation: "PENDING",
      user: {
        id: String(targetUser._id),
        name: targetUser.name,
        email: targetUser.email,
      },
      role,
    });
  }
);

// List accepted members only
shareRouter.get(
  "/projects/:id/members",
  authJwt,
  requireProjectRole(["OWNER", "READER", "WRITER"]),
  async (req: any, res) => {
    const projectId = req.params.id;

    const rows = await ProjectAccess.find({
      projectId,
      status: "ACCEPTED",
    })
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

// Remove accepted member (OWNER only)
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

    const row = await ProjectAccess.findOne({
      projectId,
      userId,
      status: "ACCEPTED",
    });

    if (!row) return res.status(404).json({ error: "Member not found" });
    if (row.role === "OWNER") return res.status(400).json({ error: "Cannot remove owner" });

    await ProjectAccess.deleteOne({ projectId, userId, status: "ACCEPTED" });
    res.json({ ok: true });
  }
);

// Update accepted member role (OWNER only)
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

    const row = await ProjectAccess.findOne({
      projectId,
      userId,
      status: "ACCEPTED",
    });

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

// Logged-in user accepts own invite
shareRouter.post(
  "/project-invites/:accessId/accept",
  authJwt,
  async (req: any, res) => {
    const accessId = req.params.accessId;

    if (!mongoose.isValidObjectId(accessId)) {
      return res.status(400).json({ error: "Invalid invite id" });
    }

    const access = await ProjectAccess.findOne({
      _id: accessId,
      userId: req.userId,
      status: "PENDING",
    });

    if (!access) {
      return res.status(404).json({ error: "Pending invite not found" });
    }

    access.status = "ACCEPTED";
    await access.save();

    await Notification.updateOne(
      { accessId: access._id, userId: req.userId, type: "PROJECT_INVITE" },
      { $set: { status: "ACCEPTED", resolvedAt: new Date() } }
    );

    return res.json({
      ok: true,
      status: "ACCEPTED",
      projectId: String(access.projectId),
      role: access.role,
    });
  }
);

// Logged-in user declines own invite
shareRouter.post(
  "/project-invites/:accessId/decline",
  authJwt,
  async (req: any, res) => {
    const accessId = req.params.accessId;

    if (!mongoose.isValidObjectId(accessId)) {
      return res.status(400).json({ error: "Invalid invite id" });
    }

    const access = await ProjectAccess.findOne({
      _id: accessId,
      userId: req.userId,
      status: "PENDING",
    });

    if (!access) {
      return res.status(404).json({ error: "Pending invite not found" });
    }

    await Notification.updateOne(
      { accessId: access._id, userId: req.userId, type: "PROJECT_INVITE" },
      { $set: { status: "DECLINED", resolvedAt: new Date() } }
    );

    await ProjectAccess.deleteOne({
      _id: access._id,
      userId: req.userId,
      status: "PENDING",
    });

    return res.json({ ok: true, status: "DECLINED" });
  }
);

// List pending invitations (OWNER only)
shareRouter.get(
  "/projects/:id/invitations",
  authJwt,
  requireProjectRole(["OWNER"]),
  async (req: any, res) => {
    const projectId = req.params.id;

    const rows = await ProjectAccess.find({
      projectId,
      status: "PENDING",
      role: { $in: ["READER", "WRITER"] },
    })
      .populate("userId", "_id name email")
      .populate("invitedBy", "_id name email")
      .select("role userId invitedBy createdAt");

    const invitations = rows.map((r: any) => ({
      id: String(r._id),
      role: r.role,
      user: {
        id: String(r.userId?._id ?? ""),
        name: r.userId?.name ?? "",
        email: r.userId?.email ?? "",
      },
      invitedBy: {
        id: String(r.invitedBy?._id ?? ""),
        name: r.invitedBy?.name ?? "",
        email: r.invitedBy?.email ?? "",
      },
      invitedAt: r.createdAt,
    }));

    res.json(invitations);
  }
);