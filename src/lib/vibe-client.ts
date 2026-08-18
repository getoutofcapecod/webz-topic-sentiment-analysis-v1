/**
 * Browser-side wrapper around `POST /api/vibe`.
 *
 * Deliberately free of server-only imports so Client Components can call it.
 * The Webz.io token stays on the server; this only ever talks to our own
 * Route Handler.
 */
import type { VibeRequest, VibeSummary } from "./types";

export async function runVibeCheck(
  request: VibeRequest,
): Promise<VibeSummary> {
  const response = await fetch("/api/vibe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(errorMessage(body));
  }

  return body as VibeSummary;
}

function errorMessage(body: unknown): string {
  if (body && typeof body === "object" && "error" in body) {
    const message = (body as { error: unknown }).error;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return "Something went wrong. Please try again.";
}
