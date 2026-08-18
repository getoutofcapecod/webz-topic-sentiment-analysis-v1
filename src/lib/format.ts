/** Display helpers shared by the UI. */

/** Pluralise a noun against a count: `plural(1, "day")` is `"day"`. */
export function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

/**
 * Group a number with thousands separators. The locale is pinned so the server
 * and the browser render the same string and hydration stays stable.
 */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}
