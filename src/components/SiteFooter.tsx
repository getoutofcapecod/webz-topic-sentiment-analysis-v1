export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 py-6 dark:border-zinc-800">
      <div className="mx-auto max-w-4xl px-4 text-xs text-zinc-500 sm:px-6 dark:text-zinc-400">
        Demo app built on the{" "}
        <a
          href="https://webz.io/products/news-api/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-zinc-300 underline-offset-2 transition hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:decoration-zinc-700 dark:hover:text-green-400 dark:focus-visible:ring-offset-zinc-950"
        >
          Webz.io News API
        </a>
        . Example code only; not affiliated with or endorsed by Webz.io.
      </div>
    </footer>
  );
}
