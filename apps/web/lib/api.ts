import { API_URL } from "./utils";

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (init?.token) {
    headers.Authorization = `Bearer ${init.token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const message =
      typeof err.error === "string"
        ? err.error
        : typeof err.message === "string"
          ? err.message
          : "Request failed";
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
