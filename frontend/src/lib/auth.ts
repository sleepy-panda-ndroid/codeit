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

export function setAuthSession(token: string, user: AuthUser) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem("token");
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

export async function updateProfile(input: { name: string; email: string; bio?: string }) {
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
