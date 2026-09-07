const API =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Authenticated fetch to the FastAPI backend.
 * Automatically attaches the Supabase access token.
 */
export async function apiFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);

  headers.set("Authorization", `Bearer ${token}`);

  // Only send JSON content type when we actually have a body.
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Required for ngrok free browser warning.
  headers.set("ngrok-skip-browser-warning", "true");

  return fetch(`${API}${path}`, {
    ...init,
    headers,
  });
}