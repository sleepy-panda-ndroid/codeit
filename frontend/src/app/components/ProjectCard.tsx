import { useState } from "react";
import { Link } from "react-router";
import { Clock, ExternalLink, Globe, Loader2, Lock, Pencil } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import ProjectCardMenu from "./ProjectCardMenu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { updateProject, type Project, type ProjectVisibility } from "../../lib/projects";

interface ProjectCardProps {
  project: Project;
  onProjectUpdated?: () => Promise<void> | void;
  onProjectDeleted?: () => Promise<void> | void;
}

export default function ProjectCard({ project, onProjectUpdated, onProjectDeleted }: ProjectCardProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [busy, setBusy] = useState<"rename" | "visibility" | null>(null);
  const [error, setError] = useState("");
  const isOwner = project.role === "OWNER";
  const lastModified = new Date(project.updatedAt).toLocaleString();
  const roleLabel = project.role === "OWNER" ? "Owner" : project.role === "WRITER" ? "Editor" : "Viewer";
  const visibilityLabel = project.visibility === "UNLISTED" ? "Unlisted" : project.visibility === "PUBLIC" ? "Public" : "Private";
  const roleColor = project.role === "OWNER" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" : project.role === "WRITER" ? "text-blue-400 border-blue-500/30 bg-blue-500/10" : "text-gray-300 border-gray-500/30 bg-gray-500/10";
  const visibilityColor = project.visibility === "PUBLIC" ? "text-green-400 border-green-500/30 bg-green-500/10" : project.visibility === "UNLISTED" ? "text-purple-400 border-purple-500/30 bg-purple-500/10" : "text-gray-300 border-gray-500/30 bg-gray-500/10";

  const handleRename = async () => {
    if (!newName.trim()) return;
    setBusy("rename"); setError("");
    try { await updateProject(project._id, { name: newName.trim() }); setRenameOpen(false); await onProjectUpdated?.(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to rename project"); }
    finally { setBusy(null); }
  };

  const handleToggleVisibility = async () => {
    setBusy("visibility"); setError("");
    const visibility: ProjectVisibility = project.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    try { await updateProject(project._id, { visibility }); await onProjectUpdated?.(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to update visibility"); }
    finally { setBusy(null); }
  };

  return (
    <Card className="bg-[#252526] border-[#3e3e42] p-6 hover:border-indigo-500/50 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">{project.name}</h3>
            {isOwner && <Button size="icon" variant="ghost" className="w-7 h-7 text-gray-400 hover:text-white" onClick={() => { setNewName(project.name); setRenameOpen(true); }} title="Rename project"><Pencil className="w-3.5 h-3.5" /></Button>}
          </div>
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">{project.description || "No description"}</p>
        </div>
        <ProjectCardMenu project={project} onProjectDeleted={onProjectDeleted} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className={`px-2 py-0.5 text-xs rounded border ${roleColor}`}>{roleLabel}</span>
        <span className={`px-2 py-0.5 text-xs rounded border ${visibilityColor}`}>{visibilityLabel}</span>
        {isOwner && <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-gray-400 hover:text-white" onClick={() => void handleToggleVisibility()} disabled={busy !== null} title="Toggle project visibility">
          {busy === "visibility" ? <Loader2 className="w-3 h-3 animate-spin" /> : project.visibility === "PUBLIC" ? <Lock className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
          {project.visibility === "PUBLIC" ? "Make private" : "Make public"}
        </Button>}
        <span className="text-gray-600">·</span><Clock className="w-3 h-3 text-gray-400" /><span className="text-sm text-gray-400">{lastModified}</span>
      </div>
      {error && <p className="mb-3 text-xs text-red-300">{error}</p>}

      <div className="flex items-center justify-between gap-4 flex-wrap"><div className="flex items-center gap-2">
        <Link to={`/app/collaboration/${project._id}`}><Button size="sm" variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">Manage Members</Button></Link>
        <Link to={`/app/ide/${project._id}`}><Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">Open<ExternalLink className="w-3 h-3 ml-2" /></Button></Link>
      </div></div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}><DialogContent className="bg-[#252526] border-[#3e3e42] text-white">
        <DialogHeader><DialogTitle>Rename Project</DialogTitle><DialogDescription className="text-gray-400">Change the project name.</DialogDescription></DialogHeader>
        <Input value={newName} onChange={(event) => setNewName(event.target.value)} className="bg-[#1e1e1e] border-[#3e3e42] text-white" placeholder="Project name" />
        <DialogFooter><Button type="button" variant="ghost" onClick={() => setRenameOpen(false)} className="text-gray-300 hover:text-white hover:bg-white/10">Cancel</Button><Button type="button" onClick={() => void handleRename()} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={busy === "rename" || !newName.trim()}>{busy === "rename" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </Card>
  );
}
