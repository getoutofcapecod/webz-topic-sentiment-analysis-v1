import type { FormEvent } from "react";

import {
  MAX_TOPIC_LENGTH,
  PRESET_TOPICS,
  WINDOW_OPTIONS,
} from "@/lib/constants";
import { plural } from "@/lib/format";
import type { WindowDays } from "@/lib/types";

interface VibeFormProps {
  topic: string;
  days: WindowDays;
  loading: boolean;
  onTopicChange: (value: string) => void;
  onDaysChange: (value: WindowDays) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPreset: (preset: string) => void;
}

const LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

const INPUT_CLASS =
  "h-10 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-500 focus:border-green-600 focus:ring-2 focus:ring-green-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:ring-green-500/60";

// A radio group rather than toggle buttons: the browser then supplies the
// single-select semantics and arrow-key navigation for free.
const WINDOW_CLASS =
  "block cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition peer-checked:bg-white peer-checked:text-zinc-900 peer-checked:shadow-sm peer-checked:ring-1 peer-checked:ring-zinc-300 peer-focus-visible:ring-2 peer-focus-visible:ring-green-600 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-100 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:peer-checked:bg-zinc-900 dark:peer-checked:text-zinc-100 dark:peer-checked:ring-zinc-600 dark:peer-focus-visible:ring-offset-zinc-800";

export function VibeForm({
  topic,
  days,
  loading,
  onTopicChange,
  onDaysChange,
  onSubmit,
  onPreset,
}: VibeFormProps) {
  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="topic" className={LABEL_CLASS}>
            Topic
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(event) => onTopicChange(event.target.value)}
              placeholder="e.g. electric vehicles"
              maxLength={MAX_TOPIC_LENGTH}
              autoComplete="off"
              className={INPUT_CLASS}
            />
            <button
              type="submit"
              disabled={loading || topic.trim().length === 0}
              className="h-10 w-full shrink-0 rounded-lg bg-green-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-zinc-900 sm:w-auto"
            >
              {loading ? "Checking…" : "Check sentiment"}
            </button>
          </div>
        </div>

        <fieldset className="mt-3">
          <legend className={LABEL_CLASS}>Window</legend>
          <div className="mt-1.5 inline-flex flex-wrap rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            {WINDOW_OPTIONS.map((option) => (
              <label key={option}>
                <input
                  type="radio"
                  name="window"
                  value={option}
                  checked={option === days}
                  disabled={loading}
                  onChange={() => onDaysChange(option)}
                  className="peer sr-only"
                />
                <span className={WINDOW_CLASS}>
                  {option} {plural(option, "day")}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          Try a topic
        </span>
        {PRESET_TOPICS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onPreset(preset)}
            disabled={loading}
            className="whitespace-nowrap rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-green-600 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-green-500 dark:hover:text-green-400 dark:focus-visible:ring-offset-zinc-950"
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}
