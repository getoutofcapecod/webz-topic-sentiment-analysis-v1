# Topic Sentiment Analysis

A Next.js demo for the [Webz.io News Segmentation API](https://docs.webz.io/docs/webz/news-blogs-forums-segmentation), meant as a reference for developers evaluating or integrating the API. You type a topic, choose a time window, and get the positive, neutral, and negative mix with a daily view of how that mood moved.

## Quick start

```bash
npm install
cp .env.example .env.local   # add your WEBZ_API_TOKEN
npm run dev                  # http://localhost:3000
```

Get a token from [app.webz.io](https://app.webz.io). The Segmentation API uses the standard `api_news` permission. Each segmentation request costs one credit, so a one-day check costs one credit, while a seven-day check normally costs three.

Without a token the app still boots, it just tells you to add one. Results are never mocked.

## The API call

The app uses the Segmentation API to count sentiment across the matching corpus instead of fetching a limited page of individual articles.

A one-day check makes one request:

```bash
curl "https://api.webz.io/seg_api/news?q=\"electric vehicles\"&field=sentiment&ts=<unix_ms_start>" \
  -H "Authorization: Bearer ***"
```

For a multi-day check, it requests one daily histogram for each sentiment:

```bash
curl "https://api.webz.io/seg_api/news?q=\"electric vehicles\"%20sentiment:positive&field=published&ts=<unix_ms_start>&from=0" \
  -H "Authorization: Bearer ***"
```

The response contains aggregate buckets rather than posts:

```jsonc
{
  "segmentation": [
    { "sentiment": "positive", "num_docs": 1234 },
    { "sentiment": "neutral", "num_docs": 2345 },
    { "sentiment": "negative", "num_docs": 456 }
  ],
  "requests_left": 998
}
```

A `field=published` request returns per-day buckets such as:

```jsonc
{
  "segmentation": [
    { "published": "2026-08-17", "num_docs": 321 }
  ],
  "more_results_available": 0
}
```

The live API can return the `published` bucket as a Unix-millisecond string, so `lib/webz.ts` accepts both formats and normalises them before the browser sees the data.

## How the trend works

The app offers 1, 7, 14, and 30-day windows. A one-day check shows the aggregate sentiment only. Longer checks request positive, neutral, and negative daily histograms, merge the dates, and render the daily sentiment mix.

The chart uses completed UTC calendar days. The request includes both lower and upper publication bounds, so a partially completed current day is not shown as a full day. The chart labels its dates explicitly and identifies them as UTC.

The trend compares positive share in the recent third of the window with the earlier part. Movement below one percentage point reads as flat. The result also includes the exact positive, neutral, and negative percentage for each day.

| Window | Requests | Credits |
| --- | ---: | ---: |
| 1 day | 1 | 1 |
| 7 days | 3 | 3 |
| 14 days | 6 | 6 |
| 30 days | 9 | 9 |

Webz.io allows roughly one request per second. The server spaces outbound requests by two seconds and retries one transient rate-limit response after a further delay.

## Architecture

```
Browser (Client Component)                 Server
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│ VibeApp  ──POST /api/vibe──────▶│ Route Handler (zod validation)       │
│   (state, result, errors)        │   └─▶ lib/vibe.ts                    │
│   │                             │         └─▶ lib/webz.ts (server-only)│
│   └──── JSON summary ───────────┘                 └─▶ GET seg_api/news │
└──────────────────────────┘      └─────────────────────────────────────┘
```

The page is a static shell and no check runs on mount, so opening it does not cost a credit. When you submit a topic, the browser posts to `/api/vibe`. The Route Handler validates the body with zod and delegates to the server-only Webz.io client. The browser never receives the API token or upstream error details.

All interactive state lives in `VibeApp.tsx`. The form, result, loading, error, and chart components are presentational and receive their data through props.

## Keeping costs and failures under control

The app does not run a query on page load. A one-day check uses one aggregate request. Longer checks make the three required sentiment histogram requests sequentially rather than racing them against Webz.io's rate limit.

The server paces every segmentation request centrally. A transient rate-limit response is retried once; exhausted credits and invalid credentials surface immediately with a clear message. The per-IP limiter is an in-memory demo guard, not a production security boundary.

The app never renders partial sentiment totals as if they were complete. If one histogram fails, the check surfaces the upstream error instead of presenting a distorted mix.

## Errors

| Status | What it means |
| --- | --- |
| 400 | Empty, invalid, or overlong topic; unsupported window |
| 401 | Bad token or missing API permission |
| 403 | Account inactive or blocked |
| 429 | Rate-limited after the retry window |
| 502 | Upstream service failure or exhausted credits |
| 500 | Missing server configuration |

Raw upstream error details stay in server logs. The browser receives only a safe, actionable message.

## Project layout

```
src/
├── app/
│   ├── api/vibe/route.ts       # POST endpoint: validate → compute → JSON
│   ├── layout.tsx              # root layout, footer, and metadata
│   ├── page.tsx                # static shell, no query on open
│   └── error.tsx               # client error boundary
├── components/
│   ├── icons.tsx               # shared SVG icons
│   └── vibe/
│       ├── VibeApp.tsx         # client container: state + orchestration
│       ├── VibeForm.tsx        # topic, window, and preset controls
│       ├── VibeResult.tsx      # aggregate readout and trend summary
│       ├── SentimentSparkline.tsx # daily chart and percentage table
│       └── ResultSkeleton.tsx  # loading placeholder
└── lib/
    ├── constants.ts            # API limits, windows, and presets
    ├── format.ts               # display formatting helpers
    ├── types.ts                # shared client-safe types
    ├── vibe.ts                 # sentiment aggregation and trend logic
    ├── webz.ts                 # server-only Webz.io client
    └── vibe-client.ts          # browser-side fetch wrapper for /api/vibe
```

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and zod.

## Out of scope

This is a demo, not a service. A production deployment would want real authentication on `/api/vibe`, a shared rate limiter, observability, automated tests, and a persistence layer for historical sentiment data.

## License

MIT
