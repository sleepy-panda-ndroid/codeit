import WebSocket from "ws";
import * as Y from "yjs";
import { applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import type { CollabContext } from "./collabAuth";
import { NodeModel } from "../db/models/Node";
import { createRoom, getRoom, removeRoom, roomKey, touchActivity, type Room } from "./roomRegistry";

const DOC_UPDATE = 0;
const AWARENESS_UPDATE = 1;

type HelloMessage = {
  type: "hello";
  clientId: number;
  name?: string;
  email?: string;
};

function packMessage(type: number, payload: Uint8Array): Buffer {
  return Buffer.concat([Buffer.from([type]), Buffer.from(payload)]);
}

function isHelloMessage(value: unknown): value is HelloMessage {
  return !!value && typeof value === "object" && (value as any).type === "hello" && typeof (value as any).clientId === "number";
}

function snapshotRoom(room: Room): Uint8Array {
  return Y.encodeStateAsUpdate(room.ydoc);
}

function attachRoomListeners(room: Room): void {
  if (room.listenersAttached) return;
  room.listenersAttached = true;

  room.ydoc.on("update", (update: Uint8Array, origin: unknown) => {
    room.dirty = true;

    const originWs = origin instanceof WebSocket ? origin : null;
    for (const [clientWs] of room.clients.entries()) {
      if (clientWs === originWs || clientWs.readyState !== WebSocket.OPEN) continue;
      clientWs.send(packMessage(DOC_UPDATE, update));
    }
  });
}

async function persistRoom(room: Room): Promise<void> {
  await NodeModel.updateOne(
    { _id: room.nodeId, projectId: room.projectId, type: "file" },
    { $set: { content: room.ytext.toString() } }
  );
  room.dirty = false;
}

function schedulePersist(room: Room): void {
  if (room.persistTimer) clearTimeout(room.persistTimer);
  room.persistTimer = setTimeout(() => {
    room.persistTimer = null;
    void persistRoom(room).catch((err) => {
      console.error("Failed to persist collab room:", err);
    });
  }, 800);
}

function sendRoomState(ws: WebSocket, room: Room): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(packMessage(DOC_UPDATE, snapshotRoom(room)));

  const awarenessIds = Array.from(room.awareness.getStates().keys());
  if (awarenessIds.length > 0) {
    ws.send(packMessage(AWARENESS_UPDATE, encodeAwarenessUpdate(room.awareness, awarenessIds)));
  }
}

function onExpired(room: Room): void {
  if (room.disposed) return;
  room.disposed = true;

  if (room.dirty) {
    void persistRoom(room).catch((err) => {
      console.error("Failed to persist expired collab room:", err);
    });
  }

  const clients = Array.from(room.clients.keys());
  removeRoom(room.key);

  for (const clientWs of clients) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(4000, "Collaboration room expired due to inactivity");
    } else {
      clientWs.terminate();
    }
  }

  room.clients.clear();
}

async function joinOrCreateRoom(ctx: CollabContext): Promise<Room> {
  const key = roomKey(ctx.projectId, ctx.nodeId);
  const existing = getRoom(key);
  if (existing) return existing;

  const node = await NodeModel.findOne({ _id: ctx.nodeId, projectId: ctx.projectId, type: "file" })
    .select("content")
    .lean<{ content?: string }>();

  return createRoom(key, ctx.projectId, ctx.nodeId, ctx.userId, node?.content ?? "", onExpired);
}

export function handleCollabConnection(ws: WebSocket, ctx: CollabContext): void {
  let room: Room | null = null;

  void joinOrCreateRoom(ctx)
    .then((joinedRoom) => {
      room = joinedRoom;
      attachRoomListeners(joinedRoom);
      joinedRoom.clients.set(ws, {
        ws,
        userId: ctx.userId,
        role: ctx.role,
        clientId: null,
        connectedAt: Date.now(),
      });
      touchActivity(joinedRoom, onExpired);
      sendRoomState(ws, joinedRoom);
    })
    .catch((err) => {
      console.error("Failed to open collab room:", err);
      ws.close(1011, "Failed to open collaboration room");
    });

  ws.on("message", (data) => {
    if (!room) return;
    if (room.disposed) return;
    touchActivity(room, onExpired);

    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data) as unknown;
        if (isHelloMessage(parsed)) {
          const client = room.clients.get(ws);
          if (client) {
            client.clientId = parsed.clientId;
          }
        }
      } catch {
        ws.close(1003, "Invalid collaboration message");
      }
      return;
    }

    const payload = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
    if (!payload.length) return;

    const messageType = payload[0];
    const message = payload.subarray(1);

    if (messageType === DOC_UPDATE) {
      const client = room.clients.get(ws);
      if (client?.role === "READER") {
        ws.close(1008, "Reader role cannot edit collaborative files");
        return;
      }

      Y.applyUpdate(room.ydoc, message, ws);
      schedulePersist(room);
      return;
    }

    if (messageType === AWARENESS_UPDATE) {
      applyAwarenessUpdate(room.awareness, message, ws);
      for (const [clientWs] of room.clients.entries()) {
        if (clientWs === ws || clientWs.readyState !== WebSocket.OPEN) continue;
        clientWs.send(packMessage(AWARENESS_UPDATE, message));
      }
    }
  });

  ws.on("close", () => {
    if (!room) return;
    if (room.disposed) {
      room.clients.delete(ws);
      return;
    }

    const client = room.clients.get(ws);
    if (client?.clientId != null) {
      removeAwarenessStates(room.awareness, [client.clientId], null);
      for (const [clientWs] of room.clients.entries()) {
        if (clientWs === ws || clientWs.readyState !== WebSocket.OPEN) continue;
        clientWs.send(packMessage(AWARENESS_UPDATE, encodeAwarenessUpdate(room.awareness, [client.clientId])));
      }
    }

    room.clients.delete(ws);
    if (room.clients.size === 0) {
      touchActivity(room, onExpired);
    }
  });

  ws.on("error", (err) => {
    console.error("Collab ws error:", err);
  });
}