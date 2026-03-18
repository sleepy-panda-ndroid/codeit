import { Link } from "react-router";
import { Clock, MoreVertical, ExternalLink, Users } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import type { Project } from "../../lib/projects";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const lastModified = new Date(project.updatedAt).toLocaleString();

  const roleLabel = project.role === "OWNER" ? "Owner" : project.role === "WRITER" ? "Editor" : "Viewer";
  const visibilityLabel = project.visibility === "UNLISTED" ? "Unlisted" : project.visibility === "PUBLIC" ? "Public" : "Private";

  const roleColor = project.role === "OWNER"
    ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
    : project.role === "WRITER"
      ? "text-blue-400 border-blue-500/30 bg-blue-500/10"
      : "text-gray-300 border-gray-500/30 bg-gray-500/10";

  const visibilityColor = project.visibility === "PUBLIC"
    ? "text-green-400 border-green-500/30 bg-green-500/10"
    : project.visibility === "UNLISTED"
      ? "text-purple-400 border-purple-500/30 bg-purple-500/10"
      : "text-gray-300 border-gray-500/30 bg-gray-500/10";

  const canCollaborate = project.role === "OWNER";

  const stopPropagation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Card className="bg-[#252526] border-[#3e3e42] p-6 hover:border-indigo-500/50 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">Project role and visibility managed via backend access controls.</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-white/10 -mt-2 -mr-2"
          onClick={stopPropagation}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2 py-0.5 text-xs rounded border ${roleColor}`}>{roleLabel}</span>
        <span className={`px-2 py-0.5 text-xs rounded border ${visibilityColor}`}>{visibilityLabel}</span>
        <span className="text-gray-600">·</span>
        <Clock className="w-3 h-3 text-gray-400" />
        <span className="text-sm text-gray-400">{lastModified}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>{canCollaborate ? "Can manage collaborators" : "Collaboration access"}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/app/collaboration/${project._id}`}>
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-300 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={stopPropagation}
            >
              Share
            </Button>
          </Link>
          <Link to={`/app/ide/${project._id}`}>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Open
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
