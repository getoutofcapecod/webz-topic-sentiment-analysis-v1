import { plural } from "@/lib/format";
import type { DailySentimentPoint } from "@/lib/types";

import { SENTIMENT_ORDER, SENTIMENT_STYLES } from "./sentiment-styles";

/** The viewBox is a fixed drawing space; CSS scales the rendered chart. */
const VIEW_WIDTH = 520;
const CHART_TOP = 4;
const CHART_HEIGHT = 68;
const BASELINE = CHART_TOP + CHART_HEIGHT;

/** Share of each column's slot given over to the gap beside it. */
const GAP_RATIO = 0.18;
const MAX_GAP = 5;

/**
 * Format an API date bucket as a stable month/day label in UTC.
 */
function axisLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function SentimentSparkline({
  points,
}: {
  points: DailySentimentPoint[];
}) {
  // One column is a reading, not a trend.
  if (points.length < 2) return null;

  const compact = points.length > 10;
  const labelEvery = points.length > 20 ? 5 : 2;
  const chartWidth = points.length > 20 ? 960 : points.length > 10 ? 760 : VIEW_WIDTH;
  const labelY = 88;
  const fontSize = compact ? 9 : 11;
  const viewHeight = 96;

  // Columns share the full width evenly, so a 7-day window reads as clearly
  // as a 30-day one instead of huddling in the middle.
  const slot = chartWidth / points.length;
  const gap = Math.min(MAX_GAP, slot * GAP_RATIO);
  const barWidth = slot - gap;

  return (
    <figure className="mt-5 border-t border-zinc-200/80 pt-4 dark:border-zinc-700/60">
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <figcaption className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Daily mix
          </figcaption>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Completed UTC days
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          {SENTIMENT_ORDER.map((sentiment) => (
            <span key={sentiment} className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-[3px] ${SENTIMENT_STYLES[sentiment].swatch}`}
                aria-hidden="true"
              />
              {SENTIMENT_STYLES[sentiment].label}
            </span>
          ))}
        </div>
      </div>

      <div className={compact ? "overflow-x-auto" : undefined}>
        <svg
          viewBox={`0 0 ${chartWidth} ${viewHeight}`}
          width={chartWidth}
          height={viewHeight}
          className={compact ? "block h-auto min-w-[760px]" : "block h-auto w-full"}
          role="img"
      >
        <title>
          {`Share of positive, neutral, and negative articles per day over the last ${points.length} ${plural(points.length, "day")}`}
        </title>

        {/* Midpoint guide for reading proportions */}
        <line
          x1={0}
          x2={VIEW_WIDTH}
          y1={CHART_TOP + CHART_HEIGHT / 2}
          y2={CHART_TOP + CHART_HEIGHT / 2}
          stroke="currentColor"
          strokeOpacity={0.06}
          strokeDasharray="3 3"
        />

        <line
          x1={0}
          x2={VIEW_WIDTH}
          y1={BASELINE}
          y2={BASELINE}
          stroke="currentColor"
          strokeOpacity={0.1}
        />

        {points.map((point, i) => {
          const x = i * slot + gap / 2;
          const cx = x + barWidth / 2;

          return (
            <g key={point.date}>
              <title>
                {`${point.date}: ${point.positive} positive, ${point.neutral} neutral, ${point.negative} negative`}
              </title>

              {stackedSegments(point).map((seg) => (
                <rect
                  key={seg.sentiment}
                  x={x}
                  y={CHART_TOP + seg.offset}
                  width={barWidth}
                  height={Math.max(seg.height - 0.75, 0)}
                  rx={Math.min(2.5, barWidth / 3)}
                  className={SENTIMENT_STYLES[seg.sentiment].fill}
                />
              ))}

              {(!compact || i % labelEvery === 0 || i === points.length - 1) && (
                <text
                  x={cx}
                  y={labelY}
                  textAnchor="middle"
                  fontSize={fontSize}
                  fill="currentColor"
                  fillOpacity={0.55}
                >
                  {axisLabel(point.date)}
                </text>
              )}
            </g>
          );
        })}
        </svg>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Daily percentages
          </p>
          {points.length > 10 && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Scroll horizontally for all days
            </p>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className={`w-full table-fixed text-[11px] ${points.length > 20 ? "min-w-[1120px]" : points.length > 10 ? "min-w-[760px]" : "min-w-[560px]"}`}>
          <caption className="sr-only">
            Daily sentiment percentages for each completed UTC day
          </caption>
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50">
            <tr>
              <th scope="col" className="w-24 px-2 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                Share
              </th>
              {points.map((point) => (
                <th
                  key={point.date}
                  scope="col"
                  className="px-1 py-2 text-center font-medium tabular-nums text-zinc-500 dark:text-zinc-400"
                >
                  {axisLabel(point.date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SENTIMENT_ORDER.map((sentiment) => (
              <tr key={sentiment} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/70">
                <th
                  scope="row"
                  className={`px-2 py-1.5 text-left font-medium ${SENTIMENT_STYLES[sentiment].text}`}
                >
                  {SENTIMENT_STYLES[sentiment].label}
                </th>
                {points.map((point) => (
                  <td
                    key={point.date}
                    className="px-1 py-1.5 text-center tabular-nums text-zinc-600 dark:text-zinc-300"
                  >
                    {shareFor(point, sentiment)}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </figure>
  );
}

function shareFor(point: DailySentimentPoint, sentiment: "positive" | "neutral" | "negative"): number {
  const total = point.positive + point.neutral + point.negative;
  return total === 0 ? 0 : Math.round((point[sentiment] / total) * 100);
}

/** Each day is normalised to a full-height column of sentiment shares. */
function stackedSegments(point: DailySentimentPoint) {
  const total = point.positive + point.neutral + point.negative;
  let offset = 0;

  return SENTIMENT_ORDER.map((sentiment) => {
    const height = total === 0 ? 0 : (point[sentiment] / total) * CHART_HEIGHT;
    const segment = { sentiment, height, offset };
    offset += height;
    return segment;
  });
}
