import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthRequest = Request & { userId?: string };

export function authJwt(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = header.slice("Bearer ".length);
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");

  try {
    const decoded = jwt.verify(token, secret) as any;
    req.userId = decoded.sub;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}