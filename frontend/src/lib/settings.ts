export type ThemeMode = "dark" | "light" | "auto";

export type UserPreferences = {
  theme: ThemeMode;
  fontSize: string;
  tabSize: string;
  autoSave: boolean;
  formatOnSave: boolean;
  minimap: boolean;
  notifications: boolean;
  emailNotifications: boolean;
  collaborationUpdates: boolean;
  errorAlerts: boolean;
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "dark",
  fontSize: "14",
  tabSize: "2",
  autoSave: true,
  formatOnSave: false,
  minimap: true,
  notifications: true,
  emailNotifications: false,
  collaborationUpdates: true,
  errorAlerts: true,
};

export const USER_PREFERENCES_KEY = "user-preferences";
export const USER_PREFERENCES_CHANGED_EVENT = "user-preferences-changed";

export function mergeUserPreferences(partial?: Partial<UserPreferences> | null): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...(partial ?? {}),
  };
}

export function getStoredUserPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const raw = localStorage.getItem(USER_PREFERENCES_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return mergeUserPreferences(parsed);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function setStoredUserPreferences(preferences: UserPreferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences));
  applyTheme(preferences.theme);
  window.dispatchEvent(new Event(USER_PREFERENCES_CHANGED_EVENT));
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const appRoot = document.getElementById("root")?.firstElementChild as HTMLElement | null;

  const shouldUseDark =
    theme === "dark" ||
    (theme === "auto" &&
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  root.classList.toggle("dark", shouldUseDark);
  if (appRoot) {
    appRoot.classList.toggle("dark", shouldUseDark);
  }
}
