"use client";

import { useEffect, useState } from "react";
import {
  listProjectMembers,
  removeProjectMember,
  updateProjectMemberRole,
  ProjectMember,
} from "@/lib/projects";

export function MembersModal({
  projectId,
  isOwner,
  onClose,
}: {
  projectId: string;
  isOwner: boolean;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listProjectMembers(projectId);
      setMembers(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [projectId]);

  async function handleRemove(userId: string) {
    if (!confirm("Remove this member from the project?")) return;

    setBusyUserId(userId);
    try {
      await removeProjectMember(projectId, userId);
      await refresh();
    } catch (e: any) {
      alert(e?.message || "Failed to remove member");
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleRoleChange(userId: string, role: "READER" | "WRITER") {
    setBusyUserId(userId);
    try {
      await updateProjectMemberRole(projectId, userId, role);
      await refresh();
    } catch (e: any) {
      alert(e?.message || "Failed to update role");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white border w-full max-w-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Project Members</h2>
          <button className="border px-3 py-1" onClick={onClose}>
            Close
          </button>
        </div>

        {loading ? (
          <div className="text-sm opacity-70">Loading members...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : members.length === 0 ? (
          <div className="text-sm opacity-70">No members found.</div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const isMemberOwner = member.role === "OWNER";
              const canManage = isOwner && !isMemberOwner;
              const isBusy = busyUserId === member.user.id;

              return (
                <div
                  key={member.user.id}
                  className="border p-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {member.user.name || "Unnamed User"}
                    </div>
                    <div className="text-sm opacity-70 truncate">
                      {member.user.email}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {canManage ? (
                      <select
                        className="border px-2 py-1 text-sm"
                        value={member.role}
                        disabled={isBusy}
                        onChange={(e) =>
                          handleRoleChange(
                            member.user.id,
                            e.target.value as "READER" | "WRITER"
                          )
                        }
                      >
                        <option value="READER">READER</option>
                        <option value="WRITER">WRITER</option>
                      </select>
                    ) : (
                      <span className="border px-2 py-0.5 text-xs">
                        {member.role}
                      </span>
                    )}

                    {canManage ? (
                      <button
                        className="border px-2 py-1 text-sm disabled:opacity-50"
                        disabled={isBusy}
                        onClick={() => handleRemove(member.user.id)}
                      >
                        {isBusy ? "Working..." : "Remove"}
                      </button>
                    ) : (
                      <span className="text-xs opacity-60">
                        {isMemberOwner ? "Owner" : "View only"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}