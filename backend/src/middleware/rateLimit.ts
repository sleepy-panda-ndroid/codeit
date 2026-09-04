import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                      // per IP per 15 min
  message: { error: "Too many attempts, try again later" },
});

export const executeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,                      // per IP per minute
  message: { error: "Execution rate limit reached, slow down" },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: "AI rate limit reached, slow down" },
});