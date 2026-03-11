"use client";

import { Project } from "@/lib/projects";
import { ProjectCard } from "./ProjectCard";

export function ProjectSection({
  title,
  emptyText,
  projects,
  onOpen,
  onOpenMembers,
  onOpenSettings,
}: {
  title: string;
  emptyText: string;
  projects: Project[];
  onOpen: (id: string) => void;
  onOpenMembers: (id: string, isOwner: boolean) => void;
  onOpenSettings: (id: string) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>

      {projects.length === 0 ? (
        <div className="text-sm opacity-70">{emptyText}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onOpen={() => onOpen(project._id)}
              onOpenMembers={() =>
                onOpenMembers(project._id, project.role === "OWNER")
              }
              onOpenSettings={() => onOpenSettings(project._id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}