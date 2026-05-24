const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Authenticated fetch to the FastAPI backend.
 * Automatically attaches the Supabase access token.
 */
export async function apiFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}
