"use client";

import { Project } from "@/lib/projects";

export function ProjectCard({
  project,
  onOpen,
  onOpenMembers,
  onOpenSettings,
}: {
  project: Project;
  onOpen: () => void;
  onOpenMembers: () => void;
  onOpenSettings: () => void;
}) {
  const isOwner = project.role === "OWNER";

  return (
    <div className="border p-4 h-44 flex flex-col justify-between rounded-sm">
      <div className="space-y-3">
        <button
          className="text-left font-semibold underline text-green-700 hover:text-green-800 truncate"
          onClick={onOpen}
          title={project.name}
        >
          {project.name}
        </button>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="border px-2 py-0.5">
            Visibility: {project.visibility}
          </span>
          <span className="border px-2 py-0.5">Role: {project.role}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button className="border px-2 py-1 text-sm" onClick={onOpenMembers}>
          Members
        </button>

        {isOwner ? (
          <button className="border px-2 py-1 text-sm" onClick={onOpenSettings}>
            Settings
          </button>
        ) : (
          <span className="text-xs opacity-60">Owner only</span>
        )}
      </div>
    </div>
  );
}