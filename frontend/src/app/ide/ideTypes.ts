import type { ProjectNode } from "../../lib/nodes";

export interface OpenFile {
  id: string;
  name: string;
  language: string;
  content: string;
  savedContent: string;
}

export interface PersistedIdeState {
  openIds: string[];
  activeId: string;
  drafts: Record<string, string>;
  stdin?: string;
  panelSizes?: {
    sidebar: number;
    editor: number;
    terminal: number;
    aiPanel: number;
  };
  layout: {
    showSidebar: boolean;
    showAIPanel: boolean;
    showTerminal: boolean;
  };
}

export type SaveStatus = "saved" | "saving" | "unsaved";
export type Role = "OWNER" | "WRITER" | "READER";
export type CollabStatus = "idle" | "connecting" | "syncing" | "ready" | "error";

export type CollaboratorPresence = {
  clientId: number;
  userId: string;
  name: string;
  email: string;
  color: string;
};

export type FileMutationInput = {
  parentId: string | null;
  type: ProjectNode["type"];
  name: string;
};