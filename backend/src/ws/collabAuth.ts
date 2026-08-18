import type { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { NodeModel } from "../db/models/Node";
import { getProjectRole, roleAtLeast, type Role } from "../middleware/requireProjectRole";

export type CollabContext = {
  userId: string;
  role: Role;
  projectId: string;
  nodeId: string;
};

/**
 * Verifies the upgrade request for /ws/collab and resolves the connecting
 * user's role on the target project.
 *
 * NOTE: the token travels as a query param (?token=...) because the browser
 * WebSocket API cannot set an Authorization header on the handshake. This is
 * a known trade-off (tokens can end up in access logs / proxies). Once this
 * is working end to end, swap this for a short-lived one-time "ws ticket"
 * minted by a POST /auth/ws-ticket endpoint instead of the raw JWT.
 */
export async function authenticateUpgrade(req: IncomingMessage): Promise<CollabContext | null> {
  try {
    const url = new URL(req.url ?? "", "http://internal");
    const token = url.searchParams.get("token");
    const projectId = url.searchParams.get("projectId");
    const nodeId = url.searchParams.get("nodeId");

    if (!token || !projectId || !nodeId) return null;
    if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(nodeId)) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET missing");

    const decoded = jwt.verify(token, secret) as any;
    const userId: string | undefined = decoded?.sub;
    if (!userId) return null;

    const role = await getProjectRole(userId, projectId);
    if (!roleAtLeast(role, "READER")) return null;

    const node = await NodeModel.findOne({ _id: nodeId, projectId, type: "file" }).select("_id").lean();
    if (!node) return null;

    return { userId, role: role as Role, projectId, nodeId };
  } catch {
    return null;
  }
}