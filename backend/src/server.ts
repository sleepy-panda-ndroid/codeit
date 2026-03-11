import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectMongo } from "./db/mongo";
import { authRouter } from "./routes/auth.routes";
import { projectRouter } from "./routes/project.routes";
import { fileRouter } from "./routes/file.routes";
import { shareRouter } from "./routes/share.routes";

dotenv.config();
console.log("SERVER.TS LOADED v1");
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/auth", authRouter);
app.use("/projects", projectRouter);
app.use(fileRouter);
app.use(shareRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Error handler MUST be after routes, before listen
app.use((err: any, _req: any, res: any, next: any) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  if (err?.type === "request.aborted") {
    return res.status(400).json({ error: "Request aborted" });
  }
  return next(err);
});

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGO_URI missing in .env");

  await connectMongo(mongoUri);

  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});