import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { connectMongo } from "./db/mongo";
import { authRouter } from "./routes/auth.routes";
import { projectRouter } from "./routes/project.routes";
import { nodeRouter } from "./routes/node.routes";
import { shareRouter } from "./routes/share.routes";
import { executionRouter } from "./routes/execution.routes";
import { aiRouter } from "./routes/ai.routes";
import { notificationRouter } from "./routes/notification.routes";
import { authenticateUpgrade } from "./ws/collabAuth";
import { handleCollabConnection } from "./ws/collabHandler";

dotenv.config();
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));

app.use("/auth", authRouter);
app.use("/projects", projectRouter);
app.use(nodeRouter);
app.use(shareRouter);
app.use(executionRouter);
app.use("/ai", aiRouter);
app.use(notificationRouter);

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

  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    error: err instanceof Error ? err.message : "Internal server error",
  });
});

// Plain http.Server (instead of app.listen) so we can hook the 'upgrade'
// event ourselves and run auth BEFORE accepting the WS handshake.
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  if (!req.url?.startsWith("/ws/collab")) {
    socket.destroy();
    return;
  }

  authenticateUpgrade(req)
    .then((ctx) => {
      if (!ctx) {
        // Mirrors HTTP 401/403 semantics for a rejected handshake.
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        handleCollabConnection(ws, ctx);
      });
    })
    .catch((err) => {
      console.error("WS upgrade auth failed:", err);
      socket.destroy();
    });
});

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGO_URI missing in .env");

  await connectMongo(mongoUri);

  const port = Number(process.env.PORT || 4000);
  server.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
    console.log(`Collab WS listening on ws://localhost:${port}/ws/collab`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});