import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { apiFetch } from "../../../lib/api";
import { getStoredToken, getStoredUser } from "../../../lib/auth";
import type { CollaboratorPresence, CollabStatus } from "../ideTypes";
import { buildCollabWsUrl, toCollaborators } from "../ideUtils";

const DOC_UPDATE = 0;
const AWARENESS_UPDATE = 1;

type UpdateActiveContent = (value: string) => void;

type HelloAck = { type: "hello-ack"; color: string; onlineCount?: number };
type PresenceMessage = { type: "presence"; onlineCount: number };

export function useCollabSession(
  projectId: string | undefined,
  activeFileId: string,
  loading: boolean,
  updateActiveContent: UpdateActiveContent,
) {
  const [collabStatus, setCollabStatus] = useState<CollabStatus>("idle");
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [collabText, setCollabText] = useState<Y.Text | null>(null);
  const [collabAwareness, setCollabAwareness] = useState<Awareness | null>(null);
  const collabDocRef = useRef<Y.Doc | null>(null);
  const collabTextRef = useRef<Y.Text | null>(null);
  const collabAwarenessRef = useRef<Awareness | null>(null);
  const collabSocketRef = useRef<WebSocket | null>(null);
  const collabReadyRef = useRef(false);

  useEffect(() => {
    const activeFileIdValue = activeFileId;
    let disposed = false;

    const cleanupCurrent = () => {
      collabSocketRef.current?.close();
      collabSocketRef.current = null;
      collabAwarenessRef.current?.destroy();
      collabAwarenessRef.current = null;
      collabDocRef.current?.destroy();
      collabDocRef.current = null;
      collabTextRef.current = null;
      collabReadyRef.current = false;
      setCollabText(null);
      setCollabAwareness(null);
      setCollaborators([]);
      setOnlineCount(0);
    };

    if (!projectId || !activeFileIdValue || loading) {
      cleanupCurrent();
      setCollabStatus("idle");
      return;
    }

    const token = getStoredToken();
    const user = getStoredUser();
    if (!token || !user) {
      cleanupCurrent();
      setCollabStatus("error");
      return;
    }

    cleanupCurrent();
    setCollabStatus("connecting");

    let doc: Y.Doc | null = null;
    let text: Y.Text | null = null;
    let awareness: Awareness | null = null;
    let socket: WebSocket | null = null;

    const initializeCollab = async () => {
      try {
        const wsTicket = await apiFetch<{ ticket: string }>("/auth/ws-ticket", { method: "POST" });
        if (disposed) return;

        doc = new Y.Doc();
        text = doc.getText("content");
        awareness = new Awareness(doc);
        socket = new WebSocket(buildCollabWsUrl(projectId, activeFileIdValue, wsTicket.ticket));
        socket.binaryType = "arraybuffer";

        collabDocRef.current = doc;
        collabTextRef.current = text;
        collabAwarenessRef.current = awareness;
        collabSocketRef.current = socket;
        setCollabText(text);
        setCollabAwareness(awareness);
        collabReadyRef.current = false;

        const refreshCollaborators = () => {
          if (awareness) setCollaborators(toCollaborators(awareness));
        };

        const sendAwareness = () => {
          if (!socket || socket.readyState !== WebSocket.OPEN || !awareness || !doc) return;
          const update = encodeAwarenessUpdate(awareness, [doc.clientID]);
          socket.send(new Uint8Array([AWARENESS_UPDATE, ...Array.from(update)]));
        };

        doc.on("update", (update: Uint8Array, origin: unknown) => {
          if (origin === "remote") return;
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(new Uint8Array([DOC_UPDATE, ...Array.from(update)]));
          }
        });

        awareness.on("update", (_changes, origin) => {
          refreshCollaborators();
          if (origin !== "remote") sendAwareness();
        });

        socket.onopen = () => {
          if (disposed || !doc || !socket) return;
          setCollabStatus("syncing");
          socket.send(JSON.stringify({ type: "hello", clientId: doc.clientID, name: user.name, email: user.email }));
        };

        socket.onmessage = (event) => {
          if (!doc || !awareness) return;

          if (typeof event.data === "string") {
            try {
              const message = JSON.parse(event.data) as Partial<HelloAck> & Partial<PresenceMessage>;
              if (message.type === "hello-ack" && typeof message.color === "string") {
                if (typeof message.onlineCount === "number") setOnlineCount(message.onlineCount);
                const previousCursor = awareness.getLocalState()?.cursor ?? null;
                awareness.setLocalState({
                  user: { userId: user.id, name: user.name, email: user.email, color: message.color },
                  cursor: previousCursor,
                });
                refreshCollaborators();
              }
              if (message.type === "presence" && typeof message.onlineCount === "number") {
                setOnlineCount(message.onlineCount);
              }
            } catch {
              // Ignore unrelated text frames.
            }
            return;
          }

          const payload = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : new Uint8Array(event.data);
          if (!payload.length) return;

          const messageType = payload[0];
          const message = payload.slice(1);

          if (messageType === DOC_UPDATE) {
            Y.applyUpdate(doc, message, "remote");
            updateActiveContent(text.toString());
            collabReadyRef.current = true;
            setCollabStatus("ready");
            return;
          }

          if (messageType === AWARENESS_UPDATE) {
            applyAwarenessUpdate(awareness, message, "remote");
            refreshCollaborators();
          }
        };

        socket.onerror = () => {
          if (!disposed) setCollabStatus("error");
        };

        socket.onclose = () => {
          if (disposed) return;
          collabReadyRef.current = false;
          setCollabStatus("error");
        };
      } catch {
        if (!disposed) {
          collabReadyRef.current = false;
          setCollabStatus("error");
        }
      }
    };

    void initializeCollab();

    return () => {
      disposed = true;
      socket?.close();
      awareness?.destroy();
      doc?.destroy();
      if (collabSocketRef.current === socket) collabSocketRef.current = null;
      if (collabDocRef.current === doc) collabDocRef.current = null;
      if (collabTextRef.current === text) collabTextRef.current = null;
      if (collabAwarenessRef.current === awareness) collabAwarenessRef.current = null;
      collabReadyRef.current = false;
    };
  }, [activeFileId, loading, projectId, updateActiveContent]);

  return {
    collabStatus,
    collaborators,
    onlineCount,
    collabText,
    collabAwareness,
    collabDocRef,
    collabTextRef,
    collabAwarenessRef,
    collabReadyRef,
  };
}
