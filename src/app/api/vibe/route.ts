/**
 * POST /api/vibe
 *
 * The only server-side entry point for sentiment checks from the browser.
 * Validates the topic and window with zod, delegates to the server-only
 * Webz.io client, and returns JSON that never contains the API token or any
 * account metadata.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { MAX_TOPIC_LENGTH, WINDOW_OPTIONS } from "@/lib/constants";
import { computeVibe } from "@/lib/vibe";
import { WebzError } from "@/lib/webz";

const TOPIC_REQUIRED = "Enter a topic to check.";

const vibeSchema = z.object({
  topic: z
    .string(TOPIC_REQUIRED)
    .trim()
    .min(1, TOPIC_REQUIRED)
    .max(
      MAX_TOPIC_LENGTH,
      `Topic must be at most ${MAX_TOPIC_LENGTH} characters.`,
    ),
  days: z.literal(WINDOW_OPTIONS, "Choose a window of 1, 7, 14, or 30 days."),
});

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

/** Cap on tracked clients, above which expired windows are swept. */
const MAX_TRACKED_CLIENTS = 10_000;

const windows = new Map<string, { start: number; count: number }>();

/**
 * A fixed-window counter guarding the Webz.io credit balance, not a security
 * control. Two numbers per client rather than a list of timestamps: the extra
 * precision of a sliding window buys nothing here, and this stays O(1) per
 * request. In-memory and per server instance, so a public deployment would put
 * a shared limiter in front of it.
 */
function allowRequest(client: string): boolean {
  const now = Date.now();

  if (windows.size > MAX_TRACKED_CLIENTS) {
    for (const [key, seen] of windows) {
      if (now - seen.start >= RATE_WINDOW_MS) windows.delete(key);
    }
  }

  const current = windows.get(client);
  if (current === undefined || now - current.start >= RATE_WINDOW_MS) {
    windows.set(client, { start: now, count: 1 });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;

  current.count += 1;
  return true;
}

/** Only as trustworthy as the proxy in front of the app, which is enough here. */
function clientKey(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

function statusFor(error: WebzError): number {
  switch (error.kind) {
    case "invalid-request":
      return 400;
    case "config":
      return 500;
    case "upstream":
      // Pass a real rate limit through so the caller knows to back off. An
      // exhausted credit balance also arrives as 429 upstream but will never
      // clear on retry, so it is a bad gateway from the browser's point of view.
      return error.retryable ? 429 : 502;
  }
}

export async function POST(request: NextRequest) {
  if (!allowRequest(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many checks. Wait a moment and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = vibeSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const summary = await computeVibe(parsed.data.topic, parsed.data.days);
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof WebzError) {
      if (error.kind !== "invalid-request") {
        console.error(`[vibe] ${error.kind}: ${error.detail ?? error.message}`);
      }
      return NextResponse.json(
        { error: error.message },
        { status: statusFor(error) },
      );
    }

    console.error("[vibe] unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 },
    );
  }
}
