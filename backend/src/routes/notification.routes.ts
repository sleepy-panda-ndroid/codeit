import { Router } from "express";
import mongoose from "mongoose";
import { authJwt } from "../middleware/authJwt";
import { Notification } from "../db/models/Notification";
import { Project } from "../db/models/Project";
import { User } from "../db/models/User";

export const notificationRouter = Router();

// List active notifications for logged-in user
notificationRouter.get("/notifications", authJwt, async (req: any, res) => {
  const rows = await Notification.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .lean();

  const projectIds = Array.from(
    new Set(rows.map((row: any) => String(row.projectId)).filter(Boolean))
  );

  const actorIds = Array.from(
    new Set(rows.map((row: any) => String(row.actorId)).filter(Boolean))
  );

  const [projects, actors] = await Promise.all([
    Project.find({ _id: { $in: projectIds } }).select("_id name").lean(),
    User.find({ _id: { $in: actorIds } }).select("_id name email").lean(),
  ]);

  const projectMap = new Map(projects.map((p: any) => [String(p._id), p]));
  const actorMap = new Map(actors.map((u: any) => [String(u._id), u]));

  const notifications = rows.map((row: any) => {
    const project = projectMap.get(String(row.projectId));
    const actor = actorMap.get(String(row.actorId));

    return {
      id: String(row._id),
      type: row.type,
      title: row.title,
      message: row.message,
      projectId: String(row.projectId),
      projectName: project?.name ?? "",
      accessId: String(row.accessId),
      actor: {
        id: actor?._id ? String(actor._id) : "",
        name: actor?.name ?? "",
        email: actor?.email ?? "",
      },
      createdAt: row.createdAt,
    };
  });

  return res.json(notifications);
});

// Optional small helper for bell badge
notificationRouter.get("/notifications/count", authJwt, async (req: any, res) => {
  const count = await Notification.countDocuments({ userId: req.userId });
  return res.json({ count });
});

// Optional manual delete for stale notification cleanup
notificationRouter.delete("/notifications/:id", authJwt, async (req: any, res) => {
  const notificationId = req.params.id;

  if (!mongoose.isValidObjectId(notificationId)) {
    return res.status(400).json({ error: "Invalid notification id" });
  }

  const deleted = await Notification.findOneAndDelete({
    _id: notificationId,
    userId: req.userId,
  });

  if (!deleted) {
    return res.status(404).json({ error: "Notification not found" });
  }

  return res.json({ ok: true });
});