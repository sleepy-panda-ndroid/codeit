import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Code2, FolderGit2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Card } from "../components/ui/card";
import { getPublicProfile } from "../../lib/auth";

export default function ProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getPublicProfile>> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (userId) getPublicProfile(userId).then(setProfile).catch((err) => setError(err instanceof Error ? err.message : "Profile unavailable")); }, [userId]);
  if (error) return <div className="p-8 text-red-300">{error}</div>;
  if (!profile) return <div className="p-8 text-gray-400">Loading profile...</div>;
  const sections = [
    ["Owned projects", profile.ownedProjects],
    ["Collaborates on", profile.collaboratedProjects],
    ["Projects in common", profile.commonProjects],
  ] as const;
  return <div className="p-8 max-w-5xl mx-auto text-white">
    <Link to="/app" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6"><ArrowLeft className="w-4 h-4" /> Back to Dashboard</Link>
    <Card className="bg-[#30343b] border-[#59616d] p-4 mb-6"><div className="flex items-center gap-3"><Avatar className="w-12 h-12"><AvatarImage src={profile.user.avatarDataUrl} /><AvatarFallback className="bg-cyan-700"><Code2 className="w-6 h-6" /></AvatarFallback></Avatar><h1 className="text-xl font-bold">{profile.user.name || "Unnamed user"}</h1></div></Card>
    {sections.map(([title, projects]) => projects.length > 0 && <section key={title} className="mb-8"><h2 className="text-xl font-semibold mb-4">{title}</h2><div className="grid gap-4 md:grid-cols-2">{projects.map((project) => <Link key={`${title}-${project._id}`} to={`/app/ide/${project._id}`}><Card className="bg-[#30343b] border-[#59616d] p-5 hover:border-cyan-500/70"><div className="flex items-center gap-3"><FolderGit2 className="w-5 h-5 text-cyan-400" /><div><h3 className="font-medium">{project.name}</h3><p className="text-sm text-gray-300">{project.visibility.toLowerCase()}</p></div></div></Card></Link>)}</div></section>)}
  </div>;
}
