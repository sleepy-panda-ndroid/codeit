import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Plus, FolderGit2, Clock, Users, X, FolderPlus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import ProjectCard from "../components/ProjectCard";
import { createProject, listOwnedProjects, listSharedProjects, searchProjects, type Project } from "../../lib/projects";
import { getStoredUser } from "../../lib/auth";
import CreateProjectModal from "../components/CreateProjectModal";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();

  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [searchResults, setSearchResults] = useState<Project[]>([]);
  const [searching, setSearching] = useState(false);

  const user = getStoredUser();

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [owned, shared] = await Promise.all([listOwnedProjects(), listSharedProjects()]);
      setOwnedProjects(owned);
      setSharedProjects(shared);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Global search: owned + shared + public, fetched from the backend (debounced).
  useEffect(() => {
    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = window.setTimeout(() => {
      searchProjects(query)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  const allProjects = useMemo(() => {
    const merged = [...ownedProjects, ...sharedProjects];
    return merged.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [ownedProjects, sharedProjects]);

  const displayedProjects = useMemo(() => {
    if (location.pathname === "/app/projects") return ownedProjects;
    if (location.pathname === "/app/shared") return sharedProjects;
    return allProjects;
  }, [location.pathname, ownedProjects, sharedProjects, allProjects]);

  // With a query, show global search results; otherwise the route's normal list.
  const projectsToShow = query ? searchResults : displayedProjects;

  const sectionTitle = query
    ? `Search results for "${query}"`
    : location.pathname === "/app/projects"
      ? "My Projects"
      : location.pathname === "/app/shared"
        ? "Shared Projects"
        : "Recent Projects";

  const handleCreateProject = () => {
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreateProject = async ({
    name,
    description,
  }: {
    name: string;
    description: string;
  }) => {
    setCreating(true);
    setError("");
    try {
      const created = await createProject(name, description);
      setIsCreateModalOpen(false);
      navigate(`/app/ide/${created._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white">Welcome back, {user?.name || "Developer"}! 👋</h1>
        <p className="text-gray-400">Here's what's happening with your projects today.</p>
      </div>

      {error && (
        <Card className="bg-red-950/30 border-red-800 text-red-300 p-4 mb-6">
          {error}
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 border-0 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-200 text-sm mb-1">Total Projects</p>
              <p className="text-3xl font-bold">{allProjects.length}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <FolderGit2 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm mb-1">Your Projects</p>
              <p className="text-3xl font-bold">{ownedProjects.length}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-pink-600 to-pink-700 border-0 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-200 text-sm mb-1">Collaborations</p>
              <p className="text-3xl font-bold">{sharedProjects.length}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Projects Section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">{sectionTitle}</h2>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCreateProject} disabled={creating}>
          <Plus className="w-5 h-5 mr-2" />
          {creating ? "Creating..." : "New Project"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {searching && (
          <Card className="bg-white/5 border-white/10 p-6 text-gray-300 md:col-span-2 lg:col-span-3">
            Searching…
          </Card>
        )}
        {!loading && !searching && projectsToShow.length === 0 && (
          <Card className="bg-white/5 border-white/10 p-6 text-gray-300 md:col-span-2 lg:col-span-3">
            {query
              ? `No projects match "${query}".`
              : "No projects yet. Create one or Contact your team lead."}
          </Card>
        )}
        {projectsToShow.map((project) => (
          <ProjectCard
            key={project._id}
            project={project}
            onProjectUpdated={refresh}
            onProjectDeleted={refresh}
          />
        ))}
      </div>

      <CreateProjectModal
        open={isCreateModalOpen}
        onClose={() => {
          if (!creating) setIsCreateModalOpen(false);
        }}
        loading={creating}
        onCreate={handleConfirmCreateProject}
      />
    </div>
  );
}