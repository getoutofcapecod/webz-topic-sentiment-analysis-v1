/**
 * Values shared by the UI and the server. No server-only dependencies here, so
 * Client Components, the Route Handler, and the Webz.io client can all import
 * them and stay in sync.
 */
import type { WindowDays } from "./types";

/** Look-back windows offered by the segmented control, shortest first. */
export const WINDOW_OPTIONS: readonly WindowDays[] = [1, 7, 14, 30];

/** The window preselected before the user picks one. */
export const DEFAULT_DAYS: WindowDays = 7;

/** Longest topic accepted, enforced by the input, zod, and the query builder. */
export const MAX_TOPIC_LENGTH = 100;

/** Example topics offered as quick-pick chips. */
export const PRESET_TOPICS: readonly string[] = [
  "Electric vehicles",
  "Artificial intelligence",
  "Bitcoin",
  "Renewable energy",
];
