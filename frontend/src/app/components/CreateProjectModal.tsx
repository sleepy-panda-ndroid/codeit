import { FolderPlus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";

type CreateProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description: string }) => void | Promise<void>;
  loading?: boolean;
};

export default function CreateProjectModal({
  open,
  onClose,
  onCreate,
  loading = false,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) return;

    await onCreate({
      name: trimmedName,
      description: trimmedDescription,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#111827] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/20">
              <FolderPlus className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Create Project</h2>
              <p className="text-sm text-gray-400">
                Start a new project with a name and short description.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Project name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New Project"
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe your project"
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-5">
            <Button
                type="button"
                onClick={onClose}
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-white/10"
                disabled={loading}
            >
                Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}