const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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

  return res.json();
}