"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePlayground } from "@/hooks/usePlayground";
import { PlaygroundHeader } from "@/components/playground/PlaygroundHeader";
import { CreateProjectBar } from "@/components/playground/CreateProjectBar";
import { ProjectSection } from "@/components/playground/ProjectSection";
import { MembersModal } from "@/components/projects/MembersModal";

export default function PlaygroundPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [membersProject, setMembersProject] = useState<{
    id: string;
    isOwner: boolean;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, user, router]);

  const pg = usePlayground(!loading && !!user);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  return (
    <div className="p-6 space-y-8">
      <PlaygroundHeader
        email={user.email}
        onSwitchAccount={() => router.push("/auth/login")}
      />

      <CreateProjectBar
        value={pg.newName}
        onChange={pg.setNewName}
        onCreate={pg.handleCreate}
        disabled={!pg.canCreate}
        creating={pg.creating}
      />

      <ProjectSection
        title="Owned Projects"
        emptyText="You do not own any projects yet."
        projects={pg.ownedProjects}
        onOpen={(id) => router.push(`/project/${id}`)}
        onOpenMembers={(id, isOwner) => setMembersProject({ id, isOwner })}
        onOpenSettings={(id) => router.push(`/project/${id}/settings`)}
      />

      <ProjectSection
        title="Shared With Me"
        emptyText="No one has shared a project with you yet."
        projects={pg.sharedProjects}
        onOpen={(id) => router.push(`/project/${id}`)}
        onOpenMembers={(id, isOwner) => setMembersProject({ id, isOwner })}
        onOpenSettings={() => {}}
      />

      {membersProject && (
        <MembersModal
          projectId={membersProject.id}
          isOwner={membersProject.isOwner}
          onClose={() => setMembersProject(null)}
        />
      )}
    </div>
  );
}