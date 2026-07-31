import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Bell,
  Check,
  X,
  Loader2,
  Users,
  Clock3,
  FolderGit2,
  Mail,
} from "lucide-react";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  acceptProjectInvite,
  declineProjectInvite,
  listNotifications,
  type NotificationItem,
} from "../../lib/notification";

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  const inviteCount = useMemo(
    () => items.filter((item) => item.type === "PROJECT_INVITE").length,
    [items]
  );

  const refresh = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listNotifications();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleAccept = async (item: NotificationItem) => {
    setActingId(item.id);
    setError("");

    try {
      const result = await acceptProjectInvite(item.accessId);
      setItems((prev) => prev.filter((n) => n.id !== item.id));
      navigate(`/app/ide/${result.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setActingId(null);
    }
  };

  const handleDecline = async (item: NotificationItem) => {
    setActingId(item.id);
    setError("");

    try {
      await declineProjectInvite(item.accessId);
      setItems((prev) => prev.filter((n) => n.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline invitation");
    } finally {
      setActingId(null);
    }
  };

  const getInitials = (name: string, email: string) => {
    const source = name?.trim() || email;
    return source
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
              <p className="text-gray-400">
                Review invitations and other project activity.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Card className="bg-[#252526] border-[#3e3e42] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Active invites</div>
                    <div className="text-xl font-semibold text-white">{inviteCount}</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {error && (
          <Card className="bg-red-950/30 border-red-800 text-red-300 p-4 mb-6">
            {error}
          </Card>
        )}

        {loading ? (
          <Card className="bg-[#252526] border-[#3e3e42] p-8">
            <div className="flex items-center gap-3 text-gray-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading notifications...
            </div>
          </Card>
        ) : items.length === 0 ? (
          <Card className="bg-[#252526] border-[#3e3e42] p-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[#1e1e1e] border border-[#3e3e42] flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">All caught up</h2>
            <p className="text-gray-400">
              You do not have any active notifications right now.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const busy = actingId === item.id;

              return (
                <Card
                  key={item.id}
                  className="bg-[#252526] border-[#3e3e42] p-6 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-indigo-600 text-white">
                          {getInitials(item.actor.name, item.actor.email)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs border border-indigo-600/30 bg-indigo-600/10 text-indigo-300">
                            <Users className="w-3.5 h-3.5" />
                            Project Invite
                          </span>

                          <span className="inline-flex items-center gap-2 text-xs text-gray-400">
                            <Clock3 className="w-3.5 h-3.5" />
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-white mb-1">
                          {item.title}
                        </h3>

                        <p className="text-gray-300 mb-4">
                          <span className="font-medium text-white">
                            {item.actor.name || item.actor.email}
                          </span>{" "}
                          invited you to{" "}
                          <span className="font-medium text-indigo-300">
                            {item.projectName || "a project"}
                          </span>
                          .
                        </p>

                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="rounded-xl border border-[#3e3e42] bg-[#1e1e1e] p-3">
                            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                              Project
                            </div>
                            <div className="flex items-center gap-2 text-white">
                              <FolderGit2 className="w-4 h-4 text-indigo-400" />
                              <span className="truncate">{item.projectName || "Unknown project"}</span>
                            </div>
                          </div>

                          <div className="rounded-xl border border-[#3e3e42] bg-[#1e1e1e] p-3">
                            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                              Invited by
                            </div>
                            <div className="flex items-center gap-2 text-white">
                              <Mail className="w-4 h-4 text-indigo-400" />
                              <span className="truncate">
                                {item.actor.name || item.actor.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        className="text-gray-300 hover:text-white hover:bg-white/10"
                        onClick={() => void handleDecline(item)}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-2" />
                            Decline
                          </>
                        )}
                      </Button>

                      <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => void handleAccept(item)}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Accept
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}