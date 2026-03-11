"use client";

import { useState } from "react";
import { shareProject } from "@/lib/projects";

export function ShareModal({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"WRITER" | "READER">("READER");
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    if (!email.trim()) return;

    setLoading(true);
    try {
      await shareProject(projectId, email, role);
      alert("Project shared");
      onClose();
    } catch {
      alert("Share failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 w-96 space-y-4 border">

        <div className="text-lg font-semibold">
          Share Project
        </div>

        <input
          className="border p-2 w-full"
          placeholder="Email (must already be signed up)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <select
          className="border p-2 w-full"
          value={role}
          onChange={(e) =>
            setRole(e.target.value as "WRITER" | "READER")
          }
        >
          <option value="READER">Reader</option>
          <option value="WRITER">Writer</option>
        </select>

        <div className="flex justify-end gap-2">
          <button
            className="border px-3 py-1"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="bg-black text-white px-3 py-1"
            disabled={loading}
            onClick={handleShare}
          >
            Share
          </button>
        </div>

      </div>
    </div>
  );
}