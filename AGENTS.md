## Project conventions

- **Stack:** Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS v4, zod.
- **Server Components are the default.** `components/vibe/VibeApp.tsx` is the only
  `"use client"` boundary; everything under it is presentational and takes props.
  Do not add a directive to a new file unless it needs hooks, and do not add hooks
  to a file that has no directive.
- **Never import the Webz.io client from a Client Component.** `lib/webz.ts` imports
  `server-only`; the API token must stay server-side. Client code imports types from
  `lib/types.ts` and talks to the app through Route Handlers.
- **Reads, not mutations.** Server endpoints go in `app/api/` as Route Handlers.
- **The token is `WEBZ_API_TOKEN`** in `.env.local` (gitignored). Never hardcode it,
  never log it, never return it. `.env.example` is the committed template.
- **The Webz.io Segmentation API** is `GET https://api.webz.io/seg_api/news`
  (query params: `q`, `field`, `ts`, `from`, `includeSyndicated`), auth via
  `Authorization: Bearer`. Response and error semantics live in `lib/webz.ts`.
  Do not guess the schema from training data: read `lib/webz.ts` and the docs at
  https://docs.webz.io.
- **Segmentation constraints**, all enforced in `lib/webz.ts`: 10 buckets per
  response, 100 per query, windows reach back at most 31 days (a longer `ts`
  silently falls back to 3 days rather than erroring), roughly one request per
  second per endpoint, and 1 credit per request.
- **`ts` filters crawl time, not publish time.** Always pair it with a
  `published:` filter in `q`, or the result answers a different question than the
  UI asks.
- **Upstream statuses are translated, not forwarded.** Webz.io uses 429 for both
  rate limiting and exhausted credits; only a genuine rate limit is retryable.
  There is no 402 in this API.
- **Topics are capped** at `MAX_TOPIC_LENGTH` in `lib/constants.ts`, enforced by the
  input, by zod in the Route Handler, and by the query builder.
- **`lib/constants.ts` is the single source of truth** for windows and the topic
  cap. It is isomorphic, so the form, the zod schema, and the API client all import
  from it rather than repeating literals.
- **Sentiment colours live in `components/vibe/sentiment-styles.ts`.** The readout,
  the legend, and the chart all read from it; do not hardcode a sentiment colour.
- **No fabricated data, and no skewed data.** If the token is missing or an upstream
  call fails, show the error or config state; never mock results. The sentiment mix
  is a ratio across all three sentiments, so never render a readout built from a
  partial set of them.
- **Errors:** `WebzError` carries a `kind` (`config`, `invalid-request`, `upstream`).
  `message` is user-safe; `detail` is for server logs only and must not reach the
  browser. The Route Handler maps `kind` to an HTTP status.
- **Verify with** `npm run lint`, `npm run typecheck`, and `npm run build` before
  finishing; run the dev server to smoke-test `/` and `POST /api/vibe`.
- **Strict lint is enforced** (`eslint.config.mjs`): no `any`, no unused variables,
  type-only imports via `import type`, and no `console.log` (only `warn`/`error`).
  A passing build is not enough.
- **Accessibility is not optional.** Prefer native controls (the window picker is a
  radio group, not toggle buttons), and keep text at 4.5:1 contrast in both themes.
- **No em dashes** anywhere in code, comments, or docs. No comments that narrate
  change history; describe the code as it is.
