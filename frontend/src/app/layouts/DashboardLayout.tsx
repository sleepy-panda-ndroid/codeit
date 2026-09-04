"use client";

import { Outlet, Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  LayoutDashboard,
  FolderGit2,
  Users,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Logo } from "../components/Logo";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import {
  AUTH_SESSION_CHANGED_EVENT,
  clearAuthSession,
  getMe,
  getStoredToken,
  getStoredUser,
  setAuthSession,
} from "../../lib/auth";
import { getNotificationCount } from "../../lib/notification";

const DASHBOARD_ROUTES = ["/app", "/app/projects", "/app/shared"];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("user@example.com");
  const [userAvatar, setUserAvatar] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);

  const navItems = [
    { path: "/app", label: "Dashboard", icon: LayoutDashboard },
    { path: "/app/projects", label: "My Projects", icon: FolderGit2 },
    { path: "/app/shared", label: "Shared Projects", icon: Users },
    { path: "/app/notifications", label: "Notifications", icon: Bell},
    { path: "/app/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/app") {
      return location.pathname === "/app";
    }
    return location.pathname.startsWith(path);
  };

  const handleSearchChange = (value: string) => {
    if (DASHBOARD_ROUTES.includes(location.pathname)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set("q", value);
          else next.delete("q");
          return next;
        },
        { replace: true }
      );
    } else {
      // typing from a non-list page jumps to the dashboard, filtered
      navigate(value ? `/app?q=${encodeURIComponent(value)}` : "/app");
    }
  };

  const initials = useMemo(() => {
    return userName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "U";
  }, [userName]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const stored = getStoredUser();
    if (stored) {
      setUserName(stored.name || "User");
      setUserEmail(stored.email || "user@example.com");
      setUserAvatar(stored.avatarDataUrl || "");
    }

    getMe()
      .then((me) => {
        setUserName(me.name || "User");
        setUserEmail(me.email || "user@example.com");
        setUserAvatar(me.avatarDataUrl || "");
        setAuthSession(token, me);
        getNotificationCount()
        .then((data) => setNotificationCount(data.count))
        .catch(() => setNotificationCount(0));
      })
      .catch(() => {
        clearAuthSession();
        navigate("/login", { replace: true });
      });
  }, [navigate]);

  useEffect(() => {
    const syncUser = () => {
      const stored = getStoredUser();
      if (!stored) return;
      setUserName(stored.name || "User");
      setUserEmail(stored.email || "user@example.com");
      if (stored.avatarDataUrl !== undefined) {
        setUserAvatar(stored.avatarDataUrl);
      }
    };

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncUser);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncUser);
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#1e1e1e] text-white overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-[#252526] border-r border-[#3e3e42] transition-all duration-300 flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-[#3e3e42] flex items-center justify-between">
          <Logo size="sm" showText={true} />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-[#2a2d2e] hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-300 hover:text-white hover:bg-[#2a2d2e]"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            <div className="relative w-96 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search projects..."
                className="pl-10 bg-[#1e1e1e] border-[#3e3e42] text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none">
                  <Avatar className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarImage src={userAvatar} />
                    <AvatarFallback className="bg-indigo-600 text-white">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#252526] border border-[#3e3e42] text-white shadow-lg"
              >
                <DropdownMenuLabel className="text-white px-2 py-1.5">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-white">{userName}</p>
                    <p className="text-xs text-gray-400">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#3e3e42] my-1" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/30 cursor-pointer flex items-center px-2 py-1.5"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}