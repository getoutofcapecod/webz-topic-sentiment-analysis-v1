/**
 * Server-only client for the Webz.io Segmentation API.
 *
 * Talks to `GET https://api.webz.io/seg_api/news` and maps aggregated sentiment
 * counts and per-day sentiment histograms onto the typed shapes the app uses.
 *
 * SECURITY: this module imports `server-only`, so Next.js refuses to bundle it
 * into a Client Component. `WEBZ_API_TOKEN` is read here and nowhere else, and
 * never reaches the browser. Client code imports types from `lib/types.ts` and
 * calls the Route Handler in `app/api/vibe/route.ts`.
 */
import "server-only";

import { MAX_TOPIC_LENGTH } from "./constants";
import type { Sentiment, SentimentCounts } from "./types";

const SEGMENT_URL = "https://api.webz.io/seg_api/news";

/** Segmentation returns at most this many buckets per page. */
const PAGE_SIZE = 10;

/** Segmentation returns at most this many buckets for a whole query. */
const MAX_BUCKETS = 100;

/** Leave a comfortable margin below Webz.io's roughly one request per second. */
const MIN_REQUEST_GAP_MS = 2_000;
const RATE_LIMIT_RETRY_DELAY_MS = 3_000;
const MAX_RATE_LIMIT_RETRIES = 1;

/**
 * Segmentation windows reach back 31 days. A `ts` older than that is not an
 * error: Webz.io silently falls back to its 3 day default, which would answer
 * a different question than the one asked.
 */
const MAX_WINDOW_MS = 31 * 86_400_000;

/**
 * What went wrong, and therefore how the Route Handler should answer:
 * `config` is our misconfiguration, `invalid-request` is the caller's input,
 * `upstream` is Webz.io.
 */
export type WebzErrorKind = "config" | "invalid-request" | "upstream";

interface WebzErrorOptions {
  /** Raw upstream text, for server logs only. */
  detail?: string;
  upstreamStatus?: number;
  /** True only when repeating the same request could plausibly succeed. */
  retryable?: boolean;
}

/**
 * A Webz.io failure. `message` is safe to show a user; `detail` holds the raw
 * upstream text and belongs in server logs only.
 */
export class WebzError extends Error {
  readonly detail?: string;
  readonly upstreamStatus?: number;
  readonly retryable: boolean;

  constructor(
    readonly kind: WebzErrorKind,
    message: string,
    options: WebzErrorOptions = {},
  ) {
    super(message);
    this.name = "WebzError";
    this.detail = options.detail;
    this.upstreamStatus = options.upstreamStatus;
    this.retryable = options.retryable ?? false;
  }
}

function getToken(): string {
  const token = process.env.WEBZ_API_TOKEN;
  if (!token) {
    throw new WebzError(
      "config",
      "The Webz.io API token is not configured. Copy .env.example to .env.local and add a token from https://app.webz.io (the free tier includes monthly credits).",
    );
  }
  return token;
}

/**
 * Turn a user topic into a safe phrase for the Webz.io query syntax.
 *
 * `q` is boolean/keyword syntax rather than natural language, so the topic is
 * quoted as a single phrase. Quoting alone would neutralise stray operators;
 * stripping them as well keeps the query predictable and easy to reason about.
 */
function sanitizeTopic(topic: string): string {
  const trimmed = topic.trim();
  if (trimmed.length === 0) {
    throw new WebzError("invalid-request", "Enter a topic to check.");
  }
  if (trimmed.length > MAX_TOPIC_LENGTH) {
    throw new WebzError(
      "invalid-request",
      `Topic must be at most ${MAX_TOPIC_LENGTH} characters.`,
    );
  }
  const safe = trimmed
    .replace(/[^\p{L}\p{N}\s.,'’-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (safe.length === 0) {
    throw new WebzError(
      "invalid-request",
      "Topic must contain letters or numbers.",
    );
  }
  return safe;
}

/** Build the `q` parameter for a topic. */
export function buildQuery(topic: string): string {
  return `"${sanitizeTopic(topic)}"`;
}

/** Aggregated sentiment counts for a window starting at `since` (Unix ms). */
export async function fetchSentimentCounts(
  query: string,
  since: number,
): Promise<SentimentCounts> {
  assertWindow(since);

  const data = await requestSegmentation({
    q: publishedSince(query, since),
    field: "sentiment",
    ts: String(since),
  });

  const counts: SentimentCounts = { positive: 0, negative: 0, neutral: 0 };
  for (const bucket of readBuckets(data)) {
    const label = bucket.sentiment;
    const docs = bucket.num_docs;
    if (typeof label === "string" && isSentiment(label) && typeof docs === "number") {
      counts[label] += docs;
    }
  }
  return counts;
}

/**
 * Per-day document counts for one sentiment, keyed by ISO calendar date.
 * Pages until Webz.io reports no more buckets.
 */
export async function fetchDailySeries(
  query: string,
  since: number,
  sentiment: Sentiment,
  until?: number,
): Promise<Record<string, number>> {
  assertWindow(since);
  const series: Record<string, number> = {};

  for (let from = 0; from < MAX_BUCKETS; from += PAGE_SIZE) {
    const data = await requestSegmentation({
      q: publishedSince(`${query} sentiment:${sentiment}`, since, until),
      field: "published",
      ts: String(since),
      from: String(from),
    });

    const buckets = readBuckets(data);
    for (const bucket of buckets) {
      const date = normalizePublishedDate(bucket.published);
      if (date && typeof bucket.num_docs === "number") {
        series[date] = (series[date] ?? 0) + bucket.num_docs;
      }
    }

    if (buckets.length < PAGE_SIZE || !hasMoreResults(data)) break;
  }

  return series;
}

/**
 * `ts` bounds the *crawl* window, so an article published years ago but crawled
 * yesterday falls inside it. The `published:` filter pins results to the window
 * the UI actually describes, and keeps the date histogram to one bucket per day
 * in the window instead of an open-ended set of stray older dates.
 */
function publishedSince(query: string, since: number, until?: number): string {
  return until === undefined
    ? `${query} published:>${since}`
    : `${query} published:>${since} AND published:<${until}`;
}

function assertWindow(since: number): void {
  if (Date.now() - since > MAX_WINDOW_MS) {
    throw new WebzError(
      "invalid-request",
      "Sentiment windows reach back at most 31 days.",
      { detail: `ts ${since} is older than the 31 day segmentation limit` },
    );
  }
}

/**
 * Webz.io rate limits per account, so outbound calls are spaced here rather
 * than at each call site. Best effort: the schedule is per server instance.
 */
let nextRequestAt = 0;

async function paced<T>(run: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const wait = Math.max(0, nextRequestAt - now);
  nextRequestAt = Math.max(now, nextRequestAt) + MIN_REQUEST_GAP_MS;
  if (wait > 0) await delay(wait);
  return run();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestSegmentation(
  query: Record<string, string>,
): Promise<Record<string, unknown>> {
  const token = getToken();
  const url = `${SEGMENT_URL}?${new URLSearchParams({
    // One wire story republished by fifty outlets is one opinion, not fifty.
    // This matches the Webz.io default; sending it keeps the counts honest
    // even if that default ever changes.
    includeSyndicated: "false",
    ...query,
  })}`;

  // `no-store` keeps every check live: a rolling sentiment window is only
  // useful against the freshest data.
  let response: Response;
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await paced(() =>
        fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      );
    } catch (error) {
      throw new WebzError(
        "upstream",
        "The news service could not be reached. Try again shortly.",
        {
          detail: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
      );
    }

    if (response.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) break;
    await delay(RATE_LIMIT_RETRY_DELAY_MS);
  }

  if (!response.ok) throw await upstreamError(response);

  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new WebzError("upstream", "The news service returned an unreadable response.", {
      detail: `non-JSON body from ${SEGMENT_URL}`,
    });
  }
}

async function upstreamError(response: Response): Promise<WebzError> {
  let detail: string | undefined;
  try {
    const body = (await response.json()) as { detail?: string; error?: string };
    detail = body.detail ?? body.error;
  } catch {
    detail = undefined;
  }

  // Webz.io returns 429 both for pacing and for an exhausted credit balance,
  // and only the detail text tells them apart. Retrying helps with the first
  // and never with the second, so they must not be reported the same way.
  const outOfCredits =
    response.status === 429 && /credit/i.test(detail ?? "");

  return new WebzError("upstream", userMessageFor(response.status, outOfCredits), {
    detail: detail ?? `HTTP ${response.status}`,
    upstreamStatus: response.status,
    retryable: response.status === 429 && !outOfCredits,
  });
}

function userMessageFor(status: number, outOfCredits: boolean): string {
  switch (status) {
    case 400:
      // Our query, not the user's: a malformed `q` is a bug in this client.
      return "The news service could not process the search. Try a simpler topic.";
    case 401:
      return "The news service rejected the configured API token, or the account lacks access to this API.";
    case 403:
      return "The Webz.io account is not active for this API.";
    case 429:
      return outOfCredits
        ? "The Webz.io account is out of credits."
        : "The news service is rate limiting requests. Wait a moment and try again.";
    default:
      return "The news service is unavailable right now. Try again shortly.";
  }
}

/** Tolerate a slightly off-schema response instead of crashing on it. */
function readBuckets(data: Record<string, unknown>): Record<string, unknown>[] {
  if (!Array.isArray(data.segmentation)) return [];
  return data.segmentation.map(
    (entry) => (entry ?? {}) as Record<string, unknown>,
  );
}

function hasMoreResults(data: Record<string, unknown>): boolean {
  const more = data.more_results_available;
  return typeof more === "number" ? more > 0 : more === true;
}

function normalizePublishedDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d+$/.test(value)) {
    const date = new Date(Number(value));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return null;
}

function isSentiment(value: string): value is Sentiment {
  return value === "positive" || value === "negative" || value === "neutral";
}
