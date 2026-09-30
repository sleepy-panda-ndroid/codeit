import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import type WebSocket from "ws";
import type { Role } from "../middleware/requireProjectRole";

export const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;
export const PERSIST_INTERVAL_MS = 5 * 1000;

export const COLLABORATOR_COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#eab308", "#a855f7",
  "#f97316", "#14b8a6", "#ec4899", "#6366f1", "#84cc16",
  "#06b6d4", "#f43f5e",
];

export type RoomClient = {
  ws: WebSocket;
  userId: string;
  role: Role;
  clientId: number | null;
  color: string;
  connectedAt: number;
};

export type Room = {
  key: string;
  projectId: string;
  nodeId: string;
  creatorId: string;
  ydoc: Y.Doc;
  ytext: Y.Text;
  awareness: Awareness;
  clients: Map<WebSocket, RoomClient>;
  createdAt: number;
  lastActivityAt: number;
  inactivityTimer: NodeJS.Timeout | null;
  persistTimer: NodeJS.Timeout | null;
  dirty: boolean;
  listenersAttached: boolean;
  disposed: boolean;
};

const rooms = new Map<string, Room>();
const roomCreationPromises = new Map<string, Promise<Room>>();

export function roomKey(projectId: string, nodeId: string): string {
  return `${projectId}:${nodeId}`;
}

export function getRoom(key: string): Room | undefined {
  return rooms.get(key);
}

export function roomStatus(key: string) {
  const room = rooms.get(key);
  if (!room) return { active: false as const };
  return {
    active: true as const,
    creatorId: room.creatorId,
    participantCount: room.clients.size,
    createdAt: room.createdAt,
  };
}

export function getOrCreateRoom(
  key: string,
  projectId: string,
  nodeId: string,
  creatorId: string,
  loadInitialContent: () => Promise<string>,
  onExpire: (room: Room) => void,
): Promise<Room> {
  const existing = rooms.get(key);
  if (existing) return Promise.resolve(existing);

  const pending = roomCreationPromises.get(key);
  if (pending) return pending;

  const creation = loadInitialContent().then((initialContent) => {
    const raced = rooms.get(key);
    if (raced) return raced;
    return createRoom(key, projectId, nodeId, creatorId, initialContent, onExpire);
  }).finally(() => {
    roomCreationPromises.delete(key);
  });

  roomCreationPromises.set(key, creation);
  return creation;
}

export function createRoom(
  key: string,
  projectId: string,
  nodeId: string,
  creatorId: string,
  initialContent: string,
  onExpire: (room: Room) => void,
): Room {
  const existing = rooms.get(key);
  if (existing) return existing;

  const ydoc = new Y.Doc();
  const ytext = ydoc.getText("content");
  if (initialContent) ytext.insert(0, initialContent);

  const room: Room = {
    key,
    projectId,
    nodeId,
    creatorId,
    ydoc,
    ytext,
    awareness: new Awareness(ydoc),
    clients: new Map(),
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    inactivityTimer: null,
    persistTimer: null,
    dirty: false,
    listenersAttached: false,
    disposed: false,
  };

  rooms.set(key, room);
  armInactivityTimer(room, onExpire);
  return room;
}

export function chooseColor(room: Room): string {
  const used = new Set(Array.from(room.clients.values()).map((client) => client.color));
  const available = COLLABORATOR_COLORS.filter((color) => !used.has(color));
  if (available.length) return available[Math.floor(Math.random() * available.length)];

  let color = "";
  do {
    color = `hsl(${Math.floor(Math.random() * 360)} 72% 58%)`;
  } while (used.has(color));
  return color;
}

export function touchActivity(room: Room, onExpire: (room: Room) => void): void {
  room.lastActivityAt = Date.now();
  armInactivityTimer(room, onExpire);
}

function armInactivityTimer(room: Room, onExpire: (room: Room) => void): void {
  if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
  room.inactivityTimer = setTimeout(() => onExpire(room), INACTIVITY_TIMEOUT_MS);
}

export function removeRoom(key: string): void {
  const room = rooms.get(key);
  if (!room) return;
  if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
  if (room.persistTimer) clearTimeout(room.persistTimer);
  room.awareness.destroy();
  rooms.delete(key);
}

export function removeRoomsForProject(projectId: string): void {
  for (const [key, room] of rooms.entries()) {
    if (room.projectId === projectId) removeRoom(key);
  }
}
