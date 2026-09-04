import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import type WebSocket from "ws";
import type { Role } from "../middleware/requireProjectRole";

export const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
export const PERSIST_INTERVAL_MS = 5 * 1000;

export type RoomClient = {
  ws: WebSocket;
  userId: string;
  role: Role;
  clientId: number | null;
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
  /** Set true whenever ytext changes since the last persist, cleared after a successful save. */
  dirty: boolean;
  listenersAttached: boolean;
  disposed: boolean;
};

const rooms = new Map<string, Room>();

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

/**
 * Creates a new room seeded with initialContent. Caller (collabHandler) is
 * responsible for checking getRoom(key) first — creation must only happen
 * when no room already exists for this file, per the "one room per file"
 * rule.
 */
export function createRoom(
  key: string,
  projectId: string,
  nodeId: string,
  creatorId: string,
  initialContent: string,
  onExpire: (room: Room) => void
): Room {
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

/** Resets the 3-minute inactivity clock. Call on every edit/awareness update/join. */
export function touchActivity(room: Room, onExpire: (room: Room) => void): void {
  room.lastActivityAt = Date.now();
  armInactivityTimer(room, onExpire);
}

function armInactivityTimer(room: Room, onExpire: (room: Room) => void): void {
  if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
  room.inactivityTimer = setTimeout(() => onExpire(room), INACTIVITY_TIMEOUT_MS);
}

/** Removes the room from the registry and clears its timers. Does NOT close sockets or persist — caller does that first. */
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
    if (room.projectId === projectId) {
      removeRoom(key);
    }
  }
}