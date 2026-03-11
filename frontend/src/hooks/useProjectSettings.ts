"use client";

import { useEffect, useState } from "react";
import {
  deleteProject,
  patchProject,
  shareProject,
} from "@/lib/projects";
import { getProjectDetail } from "@/lib/projectDetail";

type Visibility = "PRIVATE" | "PUBLIC" | "UNLISTED";
type Role = "READER" | "WRITER";

export function useProjectSettings(projectId: string, enabled: boolean) {
  const [projectName, setProjectName] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PRIVATE");
  const [role, setRole] = useState<"OWNER" | "WRITER" | "READER" | "">("");

  const [nameInput, setNameInput] = useState("");
  const [visibilityInput, setVisibilityInput] =
    useState<Visibility>("PRIVATE");

  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<Role>("READER");

  const [savingName, setSavingName] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    const detail = await getProjectDetail(projectId);

    setProjectName(detail.project.name);
    setVisibility(detail.project.visibility);
    setRole(detail.role);

    setNameInput(detail.project.name);
    setVisibilityInput(detail.project.visibility);
  }

  useEffect(() => {
    if (!enabled) return;
    refresh().catch((e: any) => {
      setError(e?.message || "Failed to load project settings");
    });
  }, [enabled, projectId]);

  async function handleRename() {
    const next = nameInput.trim();
    if (!next || next === projectName) return;

    setSavingName(true);
    setError(null);
    try {
      const updated: any = await patchProject(projectId, { name: next });
      setProjectName(updated.name);
      setNameInput(updated.name);
    } catch (e: any) {
      setError(e?.message || "Failed to rename project");
    } finally {
      setSavingName(false);
    }
  }

  async function handleVisibility() {
    if (visibilityInput === visibility) return;

    setSavingVisibility(true);
    setError(null);
    try {
      const updated: any = await patchProject(projectId, {
        visibility: visibilityInput,
      });
      setVisibility(updated.visibility);
      setVisibilityInput(updated.visibility);
    } catch (e: any) {
      setError(e?.message || "Failed to update visibility");
    } finally {
      setSavingVisibility(false);
    }
  }

  async function handleShare() {
    const email = shareEmail.trim();
    if (!email) return;

    setSharing(true);
    setError(null);
    try {
      await shareProject(projectId, email, shareRole);
      setShareEmail("");
      setShareRole("READER");
    } catch (e: any) {
      setError(e?.message || "Failed to share project");
      throw e;
    } finally {
      setSharing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteProject(projectId);
    } catch (e: any) {
      setError(e?.message || "Failed to delete project");
      setDeleting(false);
      throw e;
    }
  }

  return {
    projectName,
    visibility,
    role,

    nameInput,
    setNameInput,
    visibilityInput,
    setVisibilityInput,
    shareEmail,
    setShareEmail,
    shareRole,
    setShareRole,

    savingName,
    savingVisibility,
    sharing,
    deleting,
    error,

    handleRename,
    handleVisibility,
    handleShare,
    handleDelete,
  };
}