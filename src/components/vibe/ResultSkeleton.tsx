export function ResultSkeleton({ topic }: { topic: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="sr-only">Checking sentiment for {topic}</p>
      <div aria-hidden="true">
        <div className="h-5 w-28 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
        <div className="mt-3 h-4 w-3/4 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
        <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
