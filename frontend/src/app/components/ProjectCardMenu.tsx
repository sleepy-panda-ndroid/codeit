import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { deleteProject, type Project } from "../../lib/projects";

interface ProjectCardMenuProps {
  project: Project;
  onProjectDeleted?: () => Promise<void> | void;
}

export default function ProjectCardMenu({ project, onProjectDeleted }: ProjectCardMenuProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (project.role !== "OWNER") return null;

  const handleDelete = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteProject(project._id);
      setDeleteOpen(false);
      await onProjectDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        <Button size="icon" variant="ghost" className="w-8 h-8 text-gray-400 hover:text-red-300 hover:bg-red-950/30" onClick={() => setDeleteOpen(true)} title="Delete project">
          <Trash2 className="w-4 h-4" />
        </Button>
        {error && <div className="max-w-[240px] rounded border border-red-800 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}
      </div>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#252526] border-[#3e3e42] text-white">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription className="text-gray-400">This action cannot be undone. The project and its files will be removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} className="text-gray-300 hover:text-white hover:bg-white/10">Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={busy}>
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
