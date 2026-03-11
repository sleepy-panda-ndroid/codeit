"use client";

export function DangerZone({
  onDelete,
  deleting,
}: {
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <section className="border p-4 space-y-3">
      <h2 className="font-semibold text-red-600">Danger Zone</h2>

      <p className="text-sm opacity-70">
        Delete this project permanently. This action cannot be undone.
      </p>

      <button
        className="border px-3 py-2 text-red-600 disabled:opacity-50"
        disabled={deleting}
        onClick={onDelete}
      >
        {deleting ? "Deleting..." : "Delete Project"}
      </button>
    </section>
  );
}