import { API_URL } from "./utils";

function apiNetworkError(url: string, err: unknown): Error {
  if (err instanceof TypeError) {
    const onProdSite =
      typeof window !== "undefined" &&
      !/localhost|127\.0\.0\.1/.test(window.location.hostname);
    const apiLooksLocal = /localhost|127\.0\.0\.1/.test(url);
    if (onProdSite && apiLooksLocal) {
      return new Error(
        "NEXT_PUBLIC_API_URL is not set on Vercel — API calls are going to localhost."
      );
    }
    return new Error(
      `Cannot reach API at ${url}. Check NEXT_PUBLIC_API_URL on Vercel and CORS_ORIGIN on Railway.`
    );
  }
  return err instanceof Error ? err : new Error("Request failed");
}

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

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch (err) {
    throw apiNetworkError(API_URL, err);
  }

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
