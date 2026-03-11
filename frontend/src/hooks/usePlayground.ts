"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createProject,
  listOwnedProjects,
  listSharedProjects,
  Project,
} from "@/lib/projects";

export function usePlayground(enabled: boolean) {
  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const canCreate = useMemo(
    () => !creating && newName.trim().length > 0,
    [creating, newName]
  );

  const refresh = useCallback(async () => {
    const [owned, shared] = await Promise.all([
      listOwnedProjects(),
      listSharedProjects(),
    ]);

    setOwnedProjects(owned);
    setSharedProjects(shared);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    try {
      await createProject(name);
      setNewName("");
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  return {
    ownedProjects,
    sharedProjects,
    newName,
    setNewName,
    creating,
    canCreate,
    refresh,
    handleCreate,
  };
}