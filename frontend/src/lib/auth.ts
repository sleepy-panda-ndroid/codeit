import { apiFetch } from "./api";
import type { UserPreferences } from "./settings";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatarDataUrl?: string;
  preferences?: UserPreferences;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

export const AUTH_SESSION_CHANGED_EVENT = "auth:session-changed";

const TOKEN_KEY = "token";
const USER_KEY = "user";

export function setAuthSession(token: string, user: AuthUser) {
  const { avatarDataUrl: _avatarDataUrl, ...sessionUser } = user;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function clearAuthSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

export async function login(email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(name: string, email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function getMe() {
  return apiFetch<AuthUser>("/auth/me");
}

export async function updateProfile(input: { name: string; email: string; bio?: string; avatarDataUrl?: string }) {
  return apiFetch<AuthUser>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function updatePassword(input: { currentPassword: string; newPassword: string }) {
  return apiFetch<{ ok: true }>("/auth/password", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function updateAvatar(avatarDataUrl: string) {
  return apiFetch<AuthUser>("/auth/avatar", {
    method: "PUT",
    body: JSON.stringify({ avatarDataUrl }),
  });
}

export async function updatePreferences(input: UserPreferences) {
  return apiFetch<{ preferences: UserPreferences }>("/auth/preferences", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
