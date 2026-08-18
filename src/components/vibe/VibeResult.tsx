import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "@/components/icons";
import { formatCount, plural } from "@/lib/format";
import type { Sentiment, TrendDirection, VibeSummary, VibeTrend } from "@/lib/types";

import { SentimentSparkline } from "./SentimentSparkline";
import { SENTIMENT_ORDER, SENTIMENT_STYLES } from "./sentiment-styles";

const CARD_CLASS =
  "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

const DIVIDER_CLASS =
  "mt-4 flex items-center gap-2 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800";

/** How decisive the leading sentiment reads, by the share it holds. */
const STRENGTHS = [
  { atLeast: 60, word: "overwhelmingly" },
  { atLeast: 50, word: "mostly" },
] as const;

const TREND_ICONS = {
  up: { Icon: ArrowUpIcon, color: "text-green-700 dark:text-green-400" },
  down: { Icon: ArrowDownIcon, color: "text-red-700 dark:text-red-400" },
  flat: { Icon: MinusIcon, color: "text-zinc-500 dark:text-zinc-400" },
} as const satisfies Record<TrendDirection, unknown>;

export function VibeResult({ summary }: { summary: VibeSummary }) {
  const { counts, dominant, total } = summary;
  const period = `${summary.days} ${plural(summary.days, "day")}`;

  if (dominant === null) {
    return (
      <div className={`${CARD_CLASS} text-center`}>
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          No recent news
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Nothing was published about “{summary.topic}” in the last {period}. Try
          a broader topic or a longer window.
        </p>
      </div>
    );
  }

  const style = SENTIMENT_STYLES[dominant.sentiment];
  const strength = STRENGTHS.find(({ atLeast }) => dominant.share >= atLeast);
  const verdict = strength
    ? `${strength.word} ${dominant.sentiment}`
    : dominant.sentiment;

  // Negative takes the remainder so the three shares always total 100 and the
  // stacked bar always fills its track.
  const positive = percentOf(counts.positive, total);
  const neutral = percentOf(counts.neutral, total);
  const percent: Record<Sentiment, number> = {
    positive,
    neutral,
    negative: Math.max(0, 100 - positive - neutral),
  };

  return (
    <div className={CARD_CLASS}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${style.swatch}`} />
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Sentiment
          </span>
        </div>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {formatCount(total)} {plural(total, "article")}
        </span>
      </div>

      <h2
        className={`mt-2 text-2xl font-bold tracking-tight first-letter:uppercase ${style.text}`}
      >
        {verdict}
      </h2>
      <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-300">
        The news feels {verdict} about “{summary.topic}” over the last {period}.
      </p>

      <div
        className="mt-4 flex h-3 w-full overflow-hidden rounded-full"
        aria-hidden="true"
      >
        {SENTIMENT_ORDER.map((sentiment) => (
          <div
            key={sentiment}
            className={SENTIMENT_STYLES[sentiment].swatch}
            style={{ width: `${percent[sentiment]}%` }}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {SENTIMENT_ORDER.map((sentiment) => (
          <li key={sentiment} className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${SENTIMENT_STYLES[sentiment].swatch}`}
            />
            <span className="text-zinc-600 dark:text-zinc-300">
              {SENTIMENT_STYLES[sentiment].label}
            </span>
            <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
              {formatCount(counts[sentiment])} · {percent[sentiment]}%
            </span>
          </li>
        ))}
      </ul>

      {summary.daily && <SentimentSparkline points={summary.daily} />}

      <TrendLine trend={summary.trend} />
    </div>
  );
}

function TrendLine({ trend }: { trend: VibeTrend | null }) {
  if (trend === null) {
    return (
      <p className={`${DIVIDER_CLASS} text-zinc-500 dark:text-zinc-400`}>
        Not enough recent history to compare a trend.
      </p>
    );
  }

  const { Icon, color } = TREND_ICONS[trend.direction];

  return (
    <div className={DIVIDER_CLASS}>
      <Icon className={`h-4 w-4 shrink-0 ${color}`} />
      <p className="text-zinc-600 dark:text-zinc-300">{trendCopy(trend)}</p>
    </div>
  );
}

function trendCopy({ direction, deltaPoints }: VibeTrend): string {
  if (direction === "flat") {
    return "Positive share is about even across the window.";
  }
  const magnitude = Math.abs(deltaPoints).toFixed(1);
  return `Positive share is ${direction} ${magnitude} pts in the recent part of the window.`;
}

function percentOf(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}
