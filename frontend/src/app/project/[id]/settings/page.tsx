"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProjectSettings } from "@/hooks/useProjectSettings";
import { SettingsHeader } from "@/components/project-settings/SettingsHeader";
import { RenameSection } from "@/components/project-settings/RenameSection";
import { VisibilitySection } from "@/components/project-settings/VisibilitySection";
import { ShareSection } from "@/components/project-settings/ShareSection";
import { DangerZone } from "@/components/project-settings/DangerZone";

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = String(id);

  const router = useRouter();
  const { user, loading } = useAuth();

  const ps = useProjectSettings(projectId, !loading && !!user);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && ps.role && ps.role !== "OWNER") {
      router.push(`/project/${projectId}`);
    }
  }, [loading, ps.role, projectId, router]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <SettingsHeader onBack={() => router.push(`/project/${projectId}`)} />

      {ps.error && <div className="text-sm text-red-600">{ps.error}</div>}

      <RenameSection
        value={ps.nameInput}
        originalValue={ps.projectName}
        onChange={ps.setNameInput}
        onSave={ps.handleRename}
        saving={ps.savingName}
      />

      <VisibilitySection
        value={ps.visibilityInput}
        originalValue={ps.visibility}
        onChange={ps.setVisibilityInput}
        onSave={ps.handleVisibility}
        saving={ps.savingVisibility}
      />

      <ShareSection
        email={ps.shareEmail}
        role={ps.shareRole}
        onEmailChange={ps.setShareEmail}
        onRoleChange={ps.setShareRole}
        onShare={async () => {
          try {
            await ps.handleShare();
            alert("Project shared successfully.");
          } catch {}
        }}
        sharing={ps.sharing}
      />

      <DangerZone
        deleting={ps.deleting}
        onDelete={async () => {
          const confirmed = confirm(
            `Delete project "${ps.projectName}"? This cannot be undone.`
          );
          if (!confirmed) return;

          try {
            await ps.handleDelete();
            router.push("/playground");
          } catch {}
        }}
      />
    </div>
  );
}