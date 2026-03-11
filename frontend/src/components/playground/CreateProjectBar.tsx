"use client";

export function CreateProjectBar({
  value,
  onChange,
  onCreate,
  disabled,
  creating,
}: {
  value: string;
  onChange: (v: string) => void;
  onCreate: () => void;
  disabled: boolean;
  creating: boolean;
}) {
  return (
    <div className="flex gap-2 max-w-xl">
      <input
        className="border p-2 flex-1"
        placeholder="New project name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !disabled) onCreate();
        }}
      />
      <button
        className="bg-black text-white px-4 disabled:opacity-50"
        disabled={disabled}
        onClick={onCreate}
      >
        {creating ? "Creating..." : "Create"}
      </button>
    </div>
  );
}