import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router";
import {
  User,
  Palette,
  Code,
  Shield,
  Bell,
  ArrowLeft,
  Save
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  getMe,
  getStoredToken,
  getStoredUser,
  setAuthSession,
  updatePassword,
  updatePreferences,
  updateProfile,
} from "../../lib/auth";
import {
  DEFAULT_PREFERENCES,
  type ThemeMode,
  type UserPreferences,
  getStoredUserPreferences,
  mergeUserPreferences,
  setStoredUserPreferences,
} from "../../lib/settings";

export default function SettingsPage() {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("User");
  const [email, setEmail] = useState("user@example.com");
  const [bio, setBio] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const [originalProfile, setOriginalProfile] = useState({
    name: "User",
    email: "user@example.com",
    bio: "",
    avatarDataUrl: "",
  });

  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [fontSize, setFontSize] = useState(DEFAULT_PREFERENCES.fontSize);
  const [tabSize, setTabSize] = useState(DEFAULT_PREFERENCES.tabSize);
  const [autoSave, setAutoSave] = useState(DEFAULT_PREFERENCES.autoSave);
  const [formatOnSave, setFormatOnSave] = useState(DEFAULT_PREFERENCES.formatOnSave);
  const [minimap, setMinimap] = useState(DEFAULT_PREFERENCES.minimap);
  const [notifications, setNotifications] = useState(DEFAULT_PREFERENCES.notifications);
  const [emailNotifications, setEmailNotifications] = useState(DEFAULT_PREFERENCES.emailNotifications);
  const [collaborationUpdates, setCollaborationUpdates] = useState(DEFAULT_PREFERENCES.collaborationUpdates);
  const [errorAlerts, setErrorAlerts] = useState(DEFAULT_PREFERENCES.errorAlerts);
  const [originalPreferences, setOriginalPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();
    const localPreferences = getStoredUserPreferences();

    setTheme(localPreferences.theme);
    setFontSize(localPreferences.fontSize);
    setTabSize(localPreferences.tabSize);
    setAutoSave(localPreferences.autoSave);
    setFormatOnSave(localPreferences.formatOnSave);
    setMinimap(localPreferences.minimap);
    setNotifications(localPreferences.notifications);
    setEmailNotifications(localPreferences.emailNotifications);
    setCollaborationUpdates(localPreferences.collaborationUpdates);
    setErrorAlerts(localPreferences.errorAlerts);
    setOriginalPreferences(localPreferences);

    if (storedUser) {
      const nextProfile = {
        name: storedUser.name || "User",
        email: storedUser.email || "user@example.com",
        bio: storedUser.bio || "",
        avatarDataUrl: storedUser.avatarDataUrl || "",
      };
      setName(nextProfile.name);
      setEmail(nextProfile.email);
      setBio(nextProfile.bio);
      setAvatarDataUrl(nextProfile.avatarDataUrl);
      setOriginalProfile(nextProfile);
    }

    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then((me) => {
        const serverPreferences = mergeUserPreferences(me.preferences);

        const nextProfile = {
          name: me.name || "User",
          email: me.email || "user@example.com",
          bio: me.bio || "",
          avatarDataUrl: me.avatarDataUrl || "",
        };

        setName(nextProfile.name);
        setEmail(nextProfile.email);
        setBio(nextProfile.bio);
        setAvatarDataUrl(nextProfile.avatarDataUrl);
        setOriginalProfile(nextProfile);

        setTheme(serverPreferences.theme);
        setFontSize(serverPreferences.fontSize);
        setTabSize(serverPreferences.tabSize);
        setAutoSave(serverPreferences.autoSave);
        setFormatOnSave(serverPreferences.formatOnSave);
        setMinimap(serverPreferences.minimap);
        setNotifications(serverPreferences.notifications);
        setEmailNotifications(serverPreferences.emailNotifications);
        setCollaborationUpdates(serverPreferences.collaborationUpdates);
        setErrorAlerts(serverPreferences.errorAlerts);
        setOriginalPreferences(serverPreferences);


        setStoredUserPreferences(serverPreferences);
        setAuthSession(token, {
          ...me,
          preferences: serverPreferences,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const initials = useMemo(() => {
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "U";
  }, [name]);

  const buildPreferences = (): UserPreferences => ({
    theme,
    fontSize,
    tabSize,
    autoSave,
    formatOnSave,
    minimap,
    notifications,
    emailNotifications,
    collaborationUpdates,
    errorAlerts,
  });

  const handleSave = async () => {
    setSaveError("");
    setSaveSuccess("");

    const token = getStoredToken();
    if (!token) {
      setSaveError("You are not logged in.");
      return;
    }

    if (!name.trim()) {
      setSaveError("Name is required.");
      return;
    }

    if (!email.trim()) {
      setSaveError("Email is required.");
      return;
    }

    setSaving(true);
    try {
      const updatedProfile = await updateProfile({
        name: name.trim(),
        email: email.trim(),
        bio: bio.trim(),
        avatarDataUrl,
      });

      const preferencesToSave = buildPreferences();
      const preferencesResponse = await updatePreferences(preferencesToSave);
      const mergedPreferences = mergeUserPreferences(preferencesResponse.preferences);

      setStoredUserPreferences(mergedPreferences);

      const nextProfile = {
        name: updatedProfile.name || "User",
        email: updatedProfile.email || "user@example.com",
        bio: updatedProfile.bio || "",
        avatarDataUrl: updatedProfile.avatarDataUrl || avatarDataUrl,
      };

      setName(nextProfile.name);
      setEmail(nextProfile.email);
      setBio(nextProfile.bio);
      setAvatarDataUrl(nextProfile.avatarDataUrl);
      setOriginalProfile(nextProfile);
      setOriginalPreferences(mergedPreferences);

      setAuthSession(token, {
        ...updatedProfile,
        preferences: mergedPreferences,
      });

      setSaveSuccess("Settings saved successfully.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(originalProfile.name);
    setEmail(originalProfile.email);
    setBio(originalProfile.bio);
    setAvatarDataUrl(originalProfile.avatarDataUrl);

    setTheme(originalPreferences.theme);
    setFontSize(originalPreferences.fontSize);
    setTabSize(originalPreferences.tabSize);
    setAutoSave(originalPreferences.autoSave);
    setFormatOnSave(originalPreferences.formatOnSave);
    setMinimap(originalPreferences.minimap);
    setNotifications(originalPreferences.notifications);
    setEmailNotifications(originalPreferences.emailNotifications);
    setCollaborationUpdates(originalPreferences.collaborationUpdates);
    setErrorAlerts(originalPreferences.errorAlerts);

    setSaveError("");
    setSaveSuccess("");
    setPasswordError("");
    setPasswordSuccess("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setSaveError("Avatar image must be 2MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setAvatarDataUrl(result);
      }
    };
    reader.onerror = () => {
      setSaveError("Failed to read avatar image.");
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = "";
  };

  const handleUpdatePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated successfully.");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/app" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>

        {saveError && (
          <div className="mb-4 rounded-lg border border-red-800/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 rounded-lg border border-green-800/40 bg-green-950/20 px-4 py-3 text-sm text-green-300">
            {saveSuccess}
          </div>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-[#252526] border border-[#3e3e42]">
            <TabsTrigger 
              value="profile" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="appearance" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger 
              value="editor" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Code className="w-4 h-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-[#252526] border-[#3e3e42] p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>
              
              <div className="flex items-center gap-6 mb-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarDataUrl} />
                  <AvatarFallback className="bg-indigo-600 text-white text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white mb-2"
                    onClick={() => avatarInputRef.current?.click()}
                    type="button"
                  >
                    Change Avatar
                  </Button>
                  <p className="text-sm text-gray-400">JPG, PNG, WEBP or GIF. Max size 2MB</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-white mb-2">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#1e1e1e] border-[#3e3e42] text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-white mb-2">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[#1e1e1e] border-[#3e3e42] text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="bio" className="text-white mb-2">Bio</Label>
                  <textarea
                    id="bio"
                    rows={4}
                    placeholder="Tell us about yourself..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3e3e42] text-white placeholder:text-gray-500 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card className="bg-[#252526] border-[#3e3e42] p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Appearance Preferences</h2>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="theme" className="text-white mb-2">Theme</Label>
                  <Select value={theme} onValueChange={(value) => setTheme(value as ThemeMode)}>
                    <SelectTrigger className="bg-[#1e1e1e] border-[#3e3e42] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#252526] border-[#3e3e42] text-white">
                      <SelectItem value="dark">Dark Mode</SelectItem>
                      <SelectItem value="light">Light Mode</SelectItem>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card
                    className={`bg-[#1e1e1e] border p-4 cursor-pointer hover:border-indigo-500 ${theme === "dark" ? "border-indigo-500" : "border-[#3e3e42]"}`}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="bg-[#0a0a0a] h-20 rounded mb-3"></div>
                    <p className="text-sm text-white">Dark</p>
                  </Card>
                  <Card
                    className={`bg-[#1e1e1e] border p-4 cursor-pointer hover:border-indigo-500 ${theme === "light" ? "border-indigo-500" : "border-[#3e3e42]"}`}
                    onClick={() => setTheme("light")}
                  >
                    <div className="bg-white h-20 rounded mb-3"></div>
                    <p className="text-sm text-white">Light</p>
                  </Card>
                  <Card
                    className={`bg-[#1e1e1e] border p-4 cursor-pointer hover:border-indigo-500 ${theme === "auto" ? "border-indigo-500" : "border-[#3e3e42]"}`}
                    onClick={() => setTheme("auto")}
                  >
                    <div className="bg-gradient-to-r from-[#0a0a0a] to-white h-20 rounded mb-3"></div>
                    <p className="text-sm text-white">Auto</p>
                  </Card>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Editor Settings */}
          <TabsContent value="editor" className="space-y-6">
            <Card className="bg-[#252526] border-[#3e3e42] p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Editor Preferences</h2>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="fontSize" className="text-white mb-2">Font Size</Label>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger className="bg-[#1e1e1e] border-[#3e3e42] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#252526] border-[#3e3e42] text-white">
                      <SelectItem value="12">12px</SelectItem>
                      <SelectItem value="14">14px</SelectItem>
                      <SelectItem value="16">16px</SelectItem>
                      <SelectItem value="18">18px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tabSize" className="text-white mb-2">Tab Size</Label>
                  <Select value={tabSize} onValueChange={setTabSize}>
                    <SelectTrigger className="bg-[#1e1e1e] border-[#3e3e42] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#252526] border-[#3e3e42] text-white">
                      <SelectItem value="2">2 spaces</SelectItem>
                      <SelectItem value="4">4 spaces</SelectItem>
                      <SelectItem value="8">8 spaces</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#1e1e1e] rounded-lg border border-[#3e3e42]">
                  <div>
                    <p className="font-medium text-white">Auto Save</p>
                    <p className="text-sm text-gray-400">Automatically save changes</p>
                  </div>
                  <Switch checked={autoSave} onCheckedChange={setAutoSave} />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#1e1e1e] rounded-lg border border-[#3e3e42]">
                  <div>
                    <p className="font-medium text-white">Format on Save</p>
                    <p className="text-sm text-gray-400">Auto-format code when saving</p>
                  </div>
                  <Switch checked={formatOnSave} onCheckedChange={setFormatOnSave} />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#1e1e1e] rounded-lg border border-[#3e3e42]">
                  <div>
                    <p className="font-medium text-white">Minimap</p>
                    <p className="text-sm text-gray-400">Show code minimap on the right</p>
                  </div>
                  <Switch checked={minimap} onCheckedChange={setMinimap} />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-[#252526] border-[#3e3e42] p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Notification Preferences</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#1e1e1e] rounded-lg border border-[#3e3e42]">
                  <div>
                    <p className="font-medium text-white">Push Notifications</p>
                    <p className="text-sm text-gray-400">Receive notifications in the app</p>
                  </div>
                  <Switch checked={notifications} onCheckedChange={setNotifications} />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#1e1e1e] rounded-lg border border-[#3e3e42]">
                  <div>
                    <p className="font-medium text-white">Email Notifications</p>
                    <p className="text-sm text-gray-400">Receive updates via email</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#1e1e1e] rounded-lg border border-[#3e3e42]">
                  <div>
                    <p className="font-medium text-white">Collaboration Updates</p>
                    <p className="text-sm text-gray-400">Notify when someone joins your project</p>
                  </div>
                  <Switch checked={collaborationUpdates} onCheckedChange={setCollaborationUpdates} />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#1e1e1e] rounded-lg border border-[#3e3e42]">
                  <div>
                    <p className="font-medium text-white">Error Alerts</p>
                    <p className="text-sm text-gray-400">Alert when code execution fails</p>
                  </div>
                  <Switch checked={errorAlerts} onCheckedChange={setErrorAlerts} />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-[#252526] border-[#3e3e42] p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Security Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword" className="text-white mb-2">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-[#1e1e1e] border-[#3e3e42] text-white placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <Label htmlFor="newPassword" className="text-white mb-2">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-[#1e1e1e] border-[#3e3e42] text-white placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-white mb-2">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-[#1e1e1e] border-[#3e3e42] text-white placeholder:text-gray-500"
                  />
                </div>

                {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
                {passwordSuccess && <p className="text-sm text-green-400">{passwordSuccess}</p>}

                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={handleUpdatePassword}
                  disabled={passwordSaving}
                >
                  {passwordSaving ? "Updating..." : "Update Password"}
                </Button>
              </div>

              <div className="mt-8 pt-6 border-t border-[#3e3e42]">
                <p className="text-xs text-gray-500 mt-3">Use Save Changes to persist this setting to your account.</p>
              </div>

              <div className="mt-8 pt-6 border-t border-[#3e3e42]">
                <h3 className="font-semibold text-white mb-4">Active Sessions</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-[#1e1e1e] rounded-lg border border-[#3e3e42]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Current Session</p>
                        <p className="text-sm text-gray-400">Chrome on macOS • New York, USA</p>
                      </div>
                      <span className="text-xs text-green-400">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5"
            onClick={handleCancel}
            disabled={saving || loading}
          >
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving || loading}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
