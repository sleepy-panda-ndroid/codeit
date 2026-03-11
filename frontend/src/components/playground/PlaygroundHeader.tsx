"use client";

export function PlaygroundHeader({
  email,
  onSwitchAccount,
}: {
  email: string;
  onSwitchAccount: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Playground</h1>
        <p className="text-sm opacity-70">{email}</p>
      </div>

      <button className="border px-3 py-2" onClick={onSwitchAccount}>
        Switch account
      </button>
    </div>
  );
}