"use client";

type Visibility = "PRIVATE" | "PUBLIC" | "UNLISTED";

export function VisibilitySection({
  value,
  originalValue,
  onChange,
  onSave,
  saving,
}: {
  value: Visibility;
  originalValue: Visibility;
  onChange: (v: Visibility) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section className="border p-4 space-y-3">
      <h2 className="font-semibold">Visibility</h2>

      <select
        className="border p-2 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value as Visibility)}
      >
        <option value="PRIVATE">PRIVATE</option>
        <option value="PUBLIC">PUBLIC</option>
        <option value="UNLISTED">UNLISTED</option>
      </select>

      <button
        className="border px-3 py-2 disabled:opacity-50"
        disabled={saving || value === originalValue}
        onClick={onSave}
      >
        {saving ? "Saving..." : "Save Visibility"}
      </button>
    </section>
  );
}