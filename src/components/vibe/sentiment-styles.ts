/**
 * The single source of truth for how each sentiment is coloured and labelled,
 * so the readout, the legend, and the daily chart cannot drift apart.
 */
import type { Sentiment } from "@/lib/types";

/** The order sentiments are always presented in, best to worst. */
export const SENTIMENT_ORDER: readonly Sentiment[] = [
  "positive",
  "neutral",
  "negative",
];

interface SentimentStyle {
  label: string;
  /** Headline text colour, contrast-checked against both backgrounds. */
  text: string;
  /** Background colour for dots and stacked bar segments. */
  swatch: string;
  /** SVG fill for the daily chart. */
  fill: string;
}

export const SENTIMENT_STYLES: Record<Sentiment, SentimentStyle> = {
  positive: {
    label: "Positive",
    text: "text-green-700 dark:text-green-400",
    swatch: "bg-green-500",
    fill: "fill-green-500",
  },
  neutral: {
    label: "Neutral",
    text: "text-amber-700 dark:text-amber-400",
    swatch: "bg-amber-500",
    fill: "fill-amber-500",
  },
  negative: {
    label: "Negative",
    text: "text-red-700 dark:text-red-400",
    swatch: "bg-red-500",
    fill: "fill-red-500",
  },
};
