"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProjectEditor } from "@/hooks/useProjectEditor";
import { FileSidebar } from "@/components/editor/FileSidebar";
import { EditorPane } from "@/components/editor/EditorPane";

export default function ProjectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = String(id);

  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [loading, user, router]);

  const ed = useProjectEditor(projectId);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!user) return null;

  return (
    <div className="h-screen flex">
      <FileSidebar
        files={ed.files}
        activePath={ed.activePath}
        onSelect={ed.setActivePath}
        onCreate={ed.handleCreateFile}
        onDelete={ed.handleDeleteFile}
        onBack={() => router.push("/playground")}
        readOnly={ed.readOnly}
      />

      <div className="flex-1 flex flex-col">
        <div className="border-b px-3 py-2 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold">{ed.projectName || "Project"}</span>
            <span className="opacity-70"> · {ed.visibility || "PRIVATE"}</span>
          </div>
          <div className="text-sm border px-2 py-1">{ed.role || "..."}</div>
        </div>

        <EditorPane
          activePath={ed.activePath}
          content={ed.content}
          onChange={ed.setContent}
          onSave={ed.handleSave}
          saving={ed.saving}
          dirty={ed.dirty}
          readOnly={ed.readOnly}
        />
      </div>
    </div>
  );
}