import { Router } from "express";
import validator from "validator";
import { z } from "zod";
import { User } from "../db/models/User";
import { hashPassword, verifyPassword, signJwt } from "../services/auth.service";
import { authJwt } from "../middleware/authJwt";
import { authLimiter } from "../middleware/rateLimit";

export const authRouter = Router();

const DEFAULT_USER_PREFERENCES = {
  theme: "dark",
  fontSize: "14",
  tabSize: "2",
  autoSave: true,
  formatOnSave: false,
  minimap: true,
  notifications: true,
  emailNotifications: false,
  collaborationUpdates: true,
  errorAlerts: true,
} as const;

function normalizeUserPreferences(preferences: any) {
  return {
    ...DEFAULT_USER_PREFERENCES,
    ...(preferences && typeof preferences === "object" ? preferences : {}),
  };
}

function toAuthUser(user: any) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    bio: user.bio ?? "",
    avatarDataUrl: user.avatarDataUrl ?? "",
    preferences: normalizeUserPreferences(user.preferences),
  };
}

const signupSchema = z.object({
  name: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

// sign up
authRouter.post("/signup", authLimiter, async (req, res) => {
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
    user: toAuthUser(user),
  });
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
});



// login 
authRouter.post("/login", authLimiter, async (req, res) => {
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
    user: toAuthUser(user),
  });
});

// get current user
authRouter.get("/me", authJwt, async (req: any, res) => {
  const user = await User.findById(req.userId).select("_id name email bio avatarDataUrl  preferences");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(toAuthUser(user));
});

const updateProfileSchema = z.object({
  name: z.string().trim().max(80),
  email: z.string().trim().email(),
  bio: z.string().trim().max(500).optional().default(""),
  avatarDataUrl: z.string().max(3_000_000).optional(),
});

authRouter.put("/profile", authJwt, async (req: any, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const { name, email, bio, avatarDataUrl } = parsed.data;
  const normalizedEmail = validator.normalizeEmail(email) ?? email.toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: req.userId } }).select("_id");
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const updates: Record<string, any> = {
    name,
    email: normalizedEmail,
    bio,
  };

  if (typeof avatarDataUrl === "string") {
    updates.avatarDataUrl = avatarDataUrl;
  }

  const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true })
    .select("_id name email bio avatarDataUrl preferences");

  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json(toAuthUser(user));
});

const updateAvatarSchema = z.object({
  avatarDataUrl: z.string().max(3_000_000),
});

authRouter.put("/avatar", authJwt, async (req: any, res) => {
  const parsed = updateAvatarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const user = await User.findByIdAndUpdate(
    req.userId,
    { avatarDataUrl: parsed.data.avatarDataUrl },
    { new: true, runValidators: true }
  ).select("_id name email bio avatarDataUrl preferences");

  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json(toAuthUser(user));
});

const updatePreferencesSchema = z.object({
  theme: z.enum(["dark", "light", "auto"]),
  fontSize: z.string(),
  tabSize: z.string(),
  autoSave: z.boolean(),
  formatOnSave: z.boolean(),
  minimap: z.boolean(),
  notifications: z.boolean(),
  emailNotifications: z.boolean(),
  collaborationUpdates: z.boolean(),
  errorAlerts: z.boolean(),
});

authRouter.put("/preferences", authJwt, async (req: any, res) => {
  const parsed = updatePreferencesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const user = await User.findByIdAndUpdate(
    req.userId,
    { preferences: parsed.data },
    { new: true, runValidators: true }
  ).select("_id preferences");

  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({ preferences: normalizeUserPreferences(user.preferences) });
});


const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

authRouter.put("/password", authJwt, async (req: any, res) => {
  const parsed = updatePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: "New password must be different" });
  }

  const user = await User.findById(req.userId).select("_id passwordHash");
  if (!user) return res.status(404).json({ error: "User not found" });

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  return res.json({ ok: true });
});