"use client";

export function SettingsHeader({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Project Settings</h1>
        <p className="text-sm opacity-70">
          Manage owner-only settings for this project
        </p>
      </div>

      <button className="border px-3 py-2" onClick={onBack}>
        Back to Project
      </button>
    </div>
  );
}