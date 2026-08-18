/**
 * Shared types for Topic Sentiment Analysis.
 *
 * These types are runtime-agnostic and carry no side effects, so Route
 * Handlers and Client Components can both import them. The server-only
 * boundary lives in `lib/webz.ts`; never add `import "server-only"` here.
 */

export type Sentiment = "positive" | "negative" | "neutral";

/** The look-back windows offered in the UI, in days. */
export type WindowDays = 1 | 7 | 14 | 30;

/** Document counts per sentiment. */
export interface SentimentCounts {
  positive: number;
  negative: number;
  neutral: number;
}

/** One calendar day of the sentiment histogram. */
export interface DailySentimentPoint {
  /** ISO calendar date, `YYYY-MM-DD`. */
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

export type TrendDirection = "up" | "down" | "flat";

/** How the recent part of a window compares with its earlier part. */
export interface VibeTrend {
  direction: TrendDirection;
  /** Change in positive share, in percentage points. */
  deltaPoints: number;
}

/** The leading sentiment and how much of the window it holds, 0 to 100. */
export interface DominantSentiment {
  sentiment: Sentiment;
  share: number;
}

/** The body a client sends to `POST /api/vibe`. */
export interface VibeRequest {
  topic: string;
  days: WindowDays;
}

/** The payload `POST /api/vibe` returns. */
export interface VibeSummary {
  topic: string;
  days: WindowDays;
  counts: SentimentCounts;
  /** Documents carrying a sentiment label across the window. */
  total: number;
  /** Null when the window has no documents to rank. */
  dominant: DominantSentiment | null;
  /** Per-day counts, or null for a single-day check. */
  daily: DailySentimentPoint[] | null;
  /** Null when the window is too short or too sparse to compare. */
  trend: VibeTrend | null;
}
