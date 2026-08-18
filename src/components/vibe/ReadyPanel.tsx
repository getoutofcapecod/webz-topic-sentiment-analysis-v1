export function ReadyPanel() {
  return (
    <div className="flex min-h-56 flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-green-700 dark:text-green-400">
          Topic sentiment analysis
        </p>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          See how the news feels about a topic.
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Enter a topic and choose a time window. The result shows the positive,
          neutral, and negative mix, plus its daily movement.
        </p>
      </div>
      <p className="mt-6 border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        No analysis runs until you submit a topic.
      </p>
    </div>
  );
}
