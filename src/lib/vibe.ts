/** Turns a topic and a window into a sentiment readout and a daily trend. */
import "server-only";

import { buildQuery, fetchDailySeries, fetchSentimentCounts } from "./webz";
import type {
  DailySentimentPoint,
  Sentiment,
  SentimentCounts,
  VibeSummary,
  VibeTrend,
  WindowDays,
} from "./types";

const DAY_MS = 86_400_000;
const SENTIMENTS: readonly Sentiment[] = ["positive", "negative", "neutral"];

/** Share of the window treated as "recent" when comparing the two halves. */
const RECENT_FRACTION = 1 / 3;

/** Below this many points of movement the trend reads as flat. */
const FLAT_THRESHOLD_POINTS = 1;

type SentimentSeries = Record<Sentiment, Record<string, number>>;

type VibeAggregate = Pick<VibeSummary, "counts" | "total" | "dominant">;

export async function computeVibe(
  topic: string,
  days: WindowDays,
): Promise<VibeSummary> {
  const query = buildQuery(topic);
  const trimmedTopic = topic.trim();
  const now = Date.now();

  if (days === 1) {
    const counts = await fetchSentimentCounts(query, now - DAY_MS);
    return {
      topic: trimmedTopic,
      days,
      ...aggregate(counts),
      daily: null,
      trend: null,
    };
  }

  // Whole UTC days, so every column of the chart covers a full day and the
  // histogram returns exactly one bucket per day: a rolling window would
  // straddle one extra date and cost an extra page of credits per sentiment.
  const end = startOfUtcDay(now);
  const since = end - days * DAY_MS;
  const series: SentimentSeries = { positive: {}, negative: {}, neutral: {} };

  // One histogram per sentiment, in sequence: each call spends a credit, so a
  // failure stops the rest. `lib/webz.ts` paces the calls for the rate limit.
  // The mix is a ratio across all three, so a partial set would be skewed
  // rather than merely incomplete: let the failure surface instead.
  for (const sentiment of SENTIMENTS) {
    series[sentiment] = await fetchDailySeries(query, since, sentiment, end);
  }

  const daily = mergeDailySeries(days, series);

  return {
    topic: trimmedTopic,
    days,
    ...aggregate(sumDailyCounts(daily)),
    daily: daily.length > 0 ? daily : null,
    trend: trendFromDaily(daily),
  };
}

function startOfUtcDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

function aggregate(counts: SentimentCounts): VibeAggregate {
  const total = counts.positive + counts.negative + counts.neutral;
  if (total === 0) return { counts, total, dominant: null };

  const sentiment = dominantSentiment(counts);
  return {
    counts,
    total,
    dominant: { sentiment, share: (counts[sentiment] / total) * 100 },
  };
}

/** Neutral takes ties: a split verdict is not a positive or negative one. */
function dominantSentiment(counts: SentimentCounts): Sentiment {
  if (counts.neutral >= counts.positive && counts.neutral >= counts.negative) {
    return "neutral";
  }
  return counts.positive > counts.negative ? "positive" : "negative";
}

function mergeDailySeries(
  days: WindowDays,
  series: SentimentSeries,
): DailySentimentPoint[] {
  const dates = new Set<string>();
  for (const values of Object.values(series)) {
    for (const date of Object.keys(values)) dates.add(date);
  }

  return [...dates]
    .sort()
    .slice(-days)
    .map((date) => ({
      date,
      positive: series.positive[date] ?? 0,
      negative: series.negative[date] ?? 0,
      neutral: series.neutral[date] ?? 0,
    }));
}

function sumDailyCounts(points: DailySentimentPoint[]): SentimentCounts {
  return points.reduce<SentimentCounts>(
    (sum, point) => ({
      positive: sum.positive + point.positive,
      negative: sum.negative + point.negative,
      neutral: sum.neutral + point.neutral,
    }),
    { positive: 0, negative: 0, neutral: 0 },
  );
}

/** Compare positive share in the recent part of the window with the rest. */
function trendFromDaily(points: DailySentimentPoint[]): VibeTrend | null {
  if (points.length < 2) return null;

  const split = Math.max(1, Math.floor(points.length * (1 - RECENT_FRACTION)));
  const earlier = sumDailyCounts(points.slice(0, split));
  const recent = sumDailyCounts(points.slice(split));
  const earlierTotal = totalOf(earlier);
  const recentTotal = totalOf(recent);
  if (earlierTotal === 0 || recentTotal === 0) return null;

  const delta =
    (recent.positive / recentTotal - earlier.positive / earlierTotal) * 100;
  const rounded = Math.round(delta * 10) / 10;
  const direction =
    Math.abs(rounded) < FLAT_THRESHOLD_POINTS
      ? "flat"
      : rounded > 0
        ? "up"
        : "down";

  return { direction, deltaPoints: rounded };
}

function totalOf(counts: SentimentCounts): number {
  return counts.positive + counts.negative + counts.neutral;
}
