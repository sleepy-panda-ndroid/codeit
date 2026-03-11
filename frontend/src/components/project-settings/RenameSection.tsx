"use client";

export function RenameSection({
  value,
  originalValue,
  onChange,
  onSave,
  saving,
}: {
  value: string;
  originalValue: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section className="border p-4 space-y-3">
      <h2 className="font-semibold">Rename Project</h2>

      <input
        className="border p-2 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Project name"
      />

      <button
        className="border px-3 py-2 disabled:opacity-50"
        disabled={saving || !value.trim() || value.trim() === originalValue}
        onClick={onSave}
      >
        {saving ? "Saving..." : "Save Name"}
      </button>
    </section>
  );
}