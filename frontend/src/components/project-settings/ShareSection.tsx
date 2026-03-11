"use client";

type Role = "READER" | "WRITER";

export function ShareSection({
  email,
  role,
  onEmailChange,
  onRoleChange,
  onShare,
  sharing,
}: {
  email: string;
  role: Role;
  onEmailChange: (v: string) => void;
  onRoleChange: (v: Role) => void;
  onShare: () => void;
  sharing: boolean;
}) {
  return (
    <section className="border p-4 space-y-3">
      <h2 className="font-semibold">Share Project</h2>

      <input
        className="border p-2 w-full"
        placeholder="User email (must already be signed up)"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
      />

      <select
        className="border p-2 w-full"
        value={role}
        onChange={(e) => onRoleChange(e.target.value as Role)}
      >
        <option value="READER">READER</option>
        <option value="WRITER">WRITER</option>
      </select>

      <button
        className="border px-3 py-2 disabled:opacity-50"
        disabled={sharing || !email.trim()}
        onClick={onShare}
      >
        {sharing ? "Sharing..." : "Share"}
      </button>
    </section>
  );
}