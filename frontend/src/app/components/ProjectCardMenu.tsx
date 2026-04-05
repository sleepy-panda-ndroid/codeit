import { useState } from "react";
import { MoreVertical, Globe, Lock, Pencil, Trash2, Loader2 } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import {
  deleteProject,
  updateProject,
  type Project,
  type ProjectVisibility,
} from "../../lib/projects";

interface ProjectCardMenuProps {
  project: Project;
  onProjectUpdated?: () => Promise<void> | void;
  onProjectDeleted?: () => Promise<void> | void;
}

export default function ProjectCardMenu({
  project,
  onProjectUpdated,
  onProjectDeleted,
}: ProjectCardMenuProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [busyAction, setBusyAction] = useState<"rename" | "delete" | "visibility" | null>(null);
  const [localError, setLocalError] = useState("");
  const [localSuccess, setLocalSuccess] = useState("");

  const isOwner = project.role === "OWNER";
  if (!isOwner) return null;

  const refreshAfterChange = async () => {
    if (onProjectUpdated) await onProjectUpdated();
  };

  const refreshAfterDelete = async () => {
    if (onProjectDeleted) await onProjectDeleted();
  };
  const showSuccess = (message: string) => {
    setLocalError("");
    setLocalSuccess(message);

    window.setTimeout(() => {
        setLocalSuccess((current) => (current === message ? "" : current));
    }, 2200);
  };

  const handleToggleVisibility = async () => {
    setBusyAction("visibility");
    setLocalError("");
    setLocalSuccess("");
    const nextVisibility: ProjectVisibility =
      project.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";

    try {
      await updateProject(project._id, { visibility: nextVisibility });
      await refreshAfterChange();
      showSuccess(nextVisibility === "PUBLIC" ? "Project is now public" : "Project is now private");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to update visibility");
    } finally {
      setBusyAction(null);
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) return;

    setBusyAction("rename");
    setLocalError("");
    setLocalSuccess("");
    try {
      await updateProject(project._id, { name: newName.trim() });
      setRenameOpen(false);
      await refreshAfterChange();
      showSuccess("Project renamed successfully");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to rename project");
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async () => {
    setBusyAction("delete");
    setLocalError("");
    setLocalSuccess("");
    try {
      await deleteProject(project._id);
      setDeleteOpen(false);
      await refreshAfterDelete();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/10 -mt-2 -mr-2"
                >
                <MoreVertical className="w-4 h-4" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="bg-[#252526] border-[#3e3e42] text-white"
            >
                <DropdownMenuItem
                onSelect={() => void handleToggleVisibility()}
                className="cursor-pointer"
                disabled={busyAction === "visibility"}
                >
                {busyAction === "visibility" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : project.visibility === "PUBLIC" ? (
                    <Lock className="w-4 h-4" />
                ) : (
                    <Globe className="w-4 h-4" />
                )}
                {project.visibility === "PUBLIC" ? "Make Private" : "Make Public"}
                </DropdownMenuItem>

                <DropdownMenuItem
                onSelect={() => {
                    setNewName(project.name);
                    setRenameOpen(true);
                }}
                className="cursor-pointer"
                >
                <Pencil className="w-4 h-4" />
                Rename Project
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-[#3e3e42]" />

                <DropdownMenuItem
                onSelect={() => setDeleteOpen(true)}
                className="cursor-pointer text-red-400 focus:text-red-300"
                >
                <Trash2 className="w-4 h-4" />
                Delete Project
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>

        {localError && (
            <div className="max-w-[240px] rounded border border-red-800 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                {localError}
            </div>
            )}

            {localSuccess && (
            <div className="max-w-[240px] rounded border border-green-800 bg-green-950/30 px-3 py-2 text-xs text-green-300">
                {localSuccess}
            </div>
        )}
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="bg-[#252526] border-[#3e3e42] text-white">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription className="text-gray-400">
              Change the project name.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-[#1e1e1e] border-[#3e3e42] text-white"
            placeholder="Project name"
          />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRenameOpen(false)}
              className="text-gray-300 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleRename()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={busyAction === "rename" || !newName.trim()}
            >
              {busyAction === "rename" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Renaming...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#252526] border-[#3e3e42] text-white">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription className="text-gray-400">
              This action cannot be undone. The project and its files will be removed.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              className="text-gray-300 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={busyAction === "delete"}
            >
              {busyAction === "delete" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}