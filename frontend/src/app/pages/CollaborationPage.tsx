import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router";
import {
  UserPlus,
  Mail,
  Trash2,
  Shield,
  Eye,
  Edit,
  Crown,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  listProjectMembers,
  removeProjectMember,
  shareProject,
  updateProjectMemberRole,
  getProject,
  type ProjectMember,
} from "../../lib/projects";

export default function CollaborationPage() {
  const { projectId = "" } = useParams();

  const [projectName, setProjectName] = useState("Project");
  const [projectRole, setProjectRole] = useState<"OWNER" | "WRITER" | "READER">("READER");
  const [members, setMembers] = useState<ProjectMember[]>([]);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"READER" | "WRITER">("READER");
  const [linkCopied, setLinkCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canManage = projectRole === "OWNER";

  const refresh = async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");

    try {
      const [detail, memberList] = await Promise.all([
        getProject(projectId),
        listProjectMembers(projectId),
      ]);

      setProjectName(detail.project.name);
      setProjectRole(detail.role);
      setMembers(memberList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collaboration data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [projectId]);

  const ownerCount = useMemo(() => members.filter((m) => m.role === "OWNER").length, [members]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !email.trim() || !canManage) return;

    setSubmitting(true);
    setError("");
    try {
      await shareProject(projectId, email.trim(), role);
      setEmail("");
      setRole("READER");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite collaborator");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!projectId || !canManage) return;

    setError("");
    try {
      await removeProjectMember(projectId, userId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove collaborator");
    }
  };

  const handleRoleChange = async (userId: string, newRole: "READER" | "WRITER") => {
    if (!projectId || !canManage) return;

    setError("");
    try {
      await updateProjectMemberRole(projectId, userId, newRole);
      setMembers((prev) => prev.map((m) => (
        m.user.id === userId ? { ...m, role: newRole } : m
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update member role");
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/app/ide/${projectId}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const getRoleIcon = (memberRole: string) => {
    switch (memberRole) {
      case "OWNER":
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case "WRITER":
        return <Edit className="w-4 h-4 text-blue-400" />;
      case "READER":
        return <Eye className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link to="/app" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Project Collaboration</h1>
          <p className="text-gray-400">Manage access and permissions for "{projectName}"</p>
        </div>

        {error && (
          <Card className="bg-red-950/30 border-red-800 text-red-300 p-4 mb-6">{error}</Card>
        )}

        <Card className="bg-[#252526] border-[#3e3e42] p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Share Project</h2>
          <div className="flex gap-2">
            <Input
              value={`${window.location.origin}/app/ide/${projectId}`}
              readOnly
              className="bg-[#1e1e1e] border-[#3e3e42] text-gray-300"
            />
            <Button onClick={copyShareLink} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card className="bg-[#252526] border-[#3e3e42] p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Collaborator
          </h2>

          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white mb-2">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#1e1e1e] border-[#3e3e42] text-white placeholder:text-gray-500"
                required
                disabled={!canManage || submitting}
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-white mb-2">Permission Level</Label>
              <Select value={role} onValueChange={(value: "READER" | "WRITER") => setRole(value)} disabled={!canManage || submitting}>
                <SelectTrigger className="bg-[#1e1e1e] border-[#3e3e42] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252526] border-[#3e3e42] text-white">
                  <SelectItem value="READER">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">Viewer</p>
                        <p className="text-xs text-gray-400">Can view code but not edit</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="WRITER">
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="font-medium">Editor</p>
                        <p className="text-xs text-gray-400">Can view and edit code</p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!canManage || submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              {submitting ? "Sending Invitation..." : "Send Invitation"}
            </Button>

            {!canManage && (
              <p className="text-xs text-gray-400">Only project owners can manage invitations and member roles.</p>
            )}
          </form>
        </Card>

        <Card className="bg-[#252526] border-[#3e3e42] p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Team Members ({members.length})
          </h2>

          {loading ? (
            <div className="text-gray-400 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading members...
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.user.id}
                  className="flex items-center justify-between p-4 bg-[#1e1e1e] rounded-lg border border-[#3e3e42]"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-indigo-600 text-white">
                        {getInitials(member.user.name || member.user.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{member.user.name || "Unnamed User"}</p>
                        {member.role === "OWNER" && (
                          <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 text-xs rounded border border-yellow-600/30">
                            Owner
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{member.user.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Joined {new Date(member.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {member.role !== "OWNER" ? (
                      <>
                        <Select
                          value={member.role}
                          onValueChange={(value: "READER" | "WRITER") => void handleRoleChange(member.user.id, value)}
                          disabled={!canManage}
                        >
                          <SelectTrigger className="w-32 bg-[#252526] border-[#3e3e42] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#252526] border-[#3e3e42] text-white">
                            <SelectItem value="READER">Viewer</SelectItem>
                            <SelectItem value="WRITER">Editor</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                          onClick={() => void handleRemoveCollaborator(member.user.id)}
                          disabled={!canManage}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#252526] rounded border border-[#3e3e42]">
                        {getRoleIcon(member.role)}
                        <span className="text-sm text-gray-300 capitalize">owner</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="bg-indigo-600/10 border-indigo-600/30 p-6 mt-6">
          <h3 className="font-semibold text-white mb-3">Permission Levels</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-start gap-2">
              <Crown className="w-4 h-4 text-yellow-400 mt-0.5" />
              <div>
                <span className="font-medium">Owner:</span> Full access including project deletion and member management
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Edit className="w-4 h-4 text-blue-400 mt-0.5" />
              <div>
                <span className="font-medium">Editor:</span> Can view, edit, and run code
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Eye className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <span className="font-medium">Viewer:</span> Can only view and run code
              </div>
            </div>
          </div>
          <p className="text-xs text-indigo-200 mt-4">Project currently has {ownerCount} owner{ownerCount === 1 ? "" : "s"}.</p>
        </Card>
      </div>
    </div>
  );
}
