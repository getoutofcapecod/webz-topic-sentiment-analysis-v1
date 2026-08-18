import { VibeApp } from "@/components/vibe/VibeApp";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-widest text-green-700 dark:text-green-400">
            Topic Sentiment Analysis
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            How does the news feel about it?
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Pick a topic and a window to see whether the news is feeling
            positive, negative, or neutral. The daily view shows where the mood
            is moving.
          </p>
        </div>
      </header>

      <VibeApp />
    </main>
  );
}
