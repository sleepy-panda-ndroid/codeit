const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token") ?? localStorage.getItem("token");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;

    const text = await res.text();
    if (text) {
      try {
        const data = JSON.parse(text);
        if (typeof data?.error === "string") {
          message = data.error;
        } else if (typeof data?.message === "string") {
          message = data.message;
        } else {
          message = JSON.stringify(data);
        }
      } catch {
        message = text;
      }
    }

    throw new Error(message);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json();
}
