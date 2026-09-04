import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { apiFetch } from "../../../lib/api";
import { getStoredToken, getStoredUser } from "../../../lib/auth";
import type { CollaboratorPresence, CollabStatus } from "../ideTypes";
import { buildCollabWsUrl, hashToColor, toCollaborators } from "../ideUtils";

const DOC_UPDATE = 0;
const AWARENESS_UPDATE = 1;

type UpdateActiveContent = (value: string) => void;

export function useCollabSession(
  projectId: string | undefined,
  activeFileId: string,
  loading: boolean,
  updateActiveContent: UpdateActiveContent,
) {
  const [collabStatus, setCollabStatus] = useState<CollabStatus>("idle");
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const collabDocRef = useRef<Y.Doc | null>(null);
  const collabTextRef = useRef<Y.Text | null>(null);
  const collabAwarenessRef = useRef<Awareness | null>(null);
  const collabSocketRef = useRef<WebSocket | null>(null);
  const collabReadyRef = useRef(false);
  useEffect(() => {
    const activeFileIdValue = activeFileId;
    let disposed = false;

    if (!projectId || !activeFileIdValue || loading) {
      collabSocketRef.current?.close();
      collabSocketRef.current = null;
      collabDocRef.current?.destroy();
      collabDocRef.current = null;
      collabTextRef.current = null;
      collabAwarenessRef.current?.destroy();
      collabAwarenessRef.current = null;
      collabReadyRef.current = false;
      setCollabStatus("idle");
      setCollaborators([]);
      return;
    }

    const token = getStoredToken();
    const user = getStoredUser();
    if (!token || !user) {
      setCollabStatus("error");
      return;
    }

    setCollabStatus("connecting");
    setCollaborators([]);

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
        collabReadyRef.current = false;

        const refreshCollaborators = () => {
          if (!awareness) return;
          setCollaborators(toCollaborators(awareness));
        };

        const syncActiveFileContent = () => {
          if (!text) return;
          const nextValue = text.toString();
          updateActiveContent(nextValue);
        };

        const localPresence = {
          userId: user.id,
          name: user.name,
          email: user.email,
          color: hashToColor(user.id),
        };

        const sendLocalPresence = () => {
          if (!socket || socket.readyState !== WebSocket.OPEN || !awareness || !doc) return;
          socket.send(JSON.stringify({ type: "hello", clientId: doc.clientID, name: user.name, email: user.email }));
          awareness.setLocalState(localPresence);
          socket.send(new Uint8Array([1, ...Array.from(encodeAwarenessUpdate(awareness, [doc.clientID]))]));
        };

        text.observe(() => {
          syncActiveFileContent();
          refreshCollaborators();
        });

        doc.on("update", (update: Uint8Array, origin: unknown) => {
          if (origin === "remote") return;
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(new Uint8Array([0, ...Array.from(update)]));
          }
        });

        awareness.on("update", () => {
          refreshCollaborators();
        });

        socket.onopen = () => {
          if (disposed) return;
          setCollabStatus("syncing");
          sendLocalPresence();
        };

        socket.onmessage = (event) => {
          if (!doc || !awareness || typeof event.data === "string") return;

          const payload = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : new Uint8Array(event.data);
          if (!payload.length) return;

          const messageType = payload[0];
          const message = payload.slice(1);

          if (messageType === DOC_UPDATE) {
            Y.applyUpdate(doc, message, "remote");
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
          if (disposed) return;
          setCollabStatus("error");
        };

        socket.onclose = () => {
          if (disposed) return;
          setCollabStatus("error");
        };
      } catch {
        if (!disposed) {
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
  }, [activeFileId, loading, projectId]);

  return {
    collabStatus,
    collaborators,
    collabDocRef,
    collabTextRef,
    collabReadyRef,
  };
}
