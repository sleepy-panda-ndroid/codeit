import { Router } from "express";
import validator from "validator";
import { z } from "zod";
import { User } from "../db/models/User";
import { hashPassword, verifyPassword, signJwt } from "../services/auth.service";
import { authJwt } from "../middleware/authJwt";

export const authRouter = Router();
const signupSchema = z.object({
  name: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

// sign up
authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const { name, email, password } = parsed.data;
  const normalizedEmail = validator.normalizeEmail(email) ?? email.toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email: normalizedEmail, passwordHash });

  const token = signJwt({ sub: String(user._id) });

  return res.status(201).json({
    token,
    user: { id: String(user._id), name: user.name, email: user.email },
  });
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
});



// login 
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const normalizedEmail = validator.normalizeEmail(email) ?? email.toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const token = signJwt({ sub: String(user._id) });

  return res.json({
    token,
    user: { id: String(user._id), name: user.name, email: user.email },
  });
});

// get current user
authRouter.get("/me", authJwt, async (req: any, res) => {
  const user = await User.findById(req.userId).select("_id name email");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: String(user._id), name: user.name, email: user.email });
});