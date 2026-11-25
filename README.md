# Contest Stack

**Version:** 2.1.2 (Render-ready)  
A responsive competitive-programming practice workspace for creating and joining Codeforces/AtCoder practice contests.

## Problem statements: server-side crawler

The Problem tab now uses a server-side crawler and renders the statement inside Contest Stack. It does not put the full Codeforces/AtCoder website in an iframe.

Crawler order:

1. **Firecrawl Cloud (recommended and required for managed anti-bot proxying):** when `FIRECRAWL_API_KEY` is configured, the Vite server calls `POST https://api.firecrawl.dev/v2/scrape` with `formats: ["rawHtml"]` and `proxy: "auto"`. Firecrawl documents that `auto` retries with its enhanced proxy when the basic proxy fails. Codeforces official and mirror URLs are tried. The API key stays on the server and is never exposed to React.
2. **Local Playwright browser:** if Firecrawl is not configured or fails, the Vite server launches Chrome/Chromium through Playwright and reads only the judge's problem-statement container.
3. **Basic server HTML request:** a final direct request is attempted. If all sources fail, the UI shows a bounded diagnostic and the official-page link.

A server-side crawler avoids browser CORS restrictions, but it does not automatically bypass anti-bot protection. A normal Node/Playwright request can still receive HTTP 403. For Codeforces pages that block ordinary requests, configure Firecrawl Cloud: its managed `proxy: "auto"` mode can retry with an enhanced proxy. This requires your own Firecrawl API key and may consume account credits. If you do not configure the key, the app still tries local Playwright and direct server HTML, but Codeforces may continue to return 403. No crawler can guarantee access if the target blocks the crawler provider too.

### Configure Firecrawl (recommended)

1. Create a Firecrawl account and copy an API key from its dashboard.
2. In the project root, copy `.env.example` to `.env`.
3. Add your key:

```env
FIRECRAWL_API_KEY=fc-your-key-here
```

4. Keep `.env` private. Do not rename the variable to `VITE_FIRECRAWL_API_KEY`, and do not commit `.env` to Git.
5. Restart the Vite server after editing `.env`.

Firecrawl API reference: https://docs.firecrawl.dev/api-reference/endpoint/scrape

### Install the local browser crawler

```bash
npm install
npm run setup:crawler
```

This downloads the Chromium browser used by Playwright. If Google Chrome is installed, Contest Stack tries it first and then falls back to Playwright's Chromium build.

### Test the crawler

Start the app:

```bash
npm run dev
```

Open the health endpoint:

`http://localhost:5173/api/problem-statement/health`

The health response shows whether Firecrawl is configured. If `firecrawlConfigured` is false, set the key in `.env` and restart Vite. To run both known-problem smoke tests after the server starts, open a second terminal and run `npm run test:crawler`.

Then test a known problem:

`http://localhost:5173/api/problem-statement?platform=Codeforces&id=2275B`

For AtCoder, use an ID such as `ABC361-C`:

`http://localhost:5173/api/problem-statement?platform=AtCoder&id=ABC361-C`

Successful responses contain `success: true`, a sanitized `html` fragment, the title, source and cache status. The server caches statements for six hours to reduce requests. The endpoint only constructs URLs for valid Codeforces/AtCoder problem IDs; it does not accept arbitrary target URLs.

## Problem catalogue sources

### Codeforces metadata

- `problemset.problems`
- `contest.list?gym=false`
- Official API documentation: https://codeforces.com/apiHelp

The Codeforces API provides problem metadata, not full statement text. Catalogue responses are cached for 30 minutes and requests are spaced to respect the public API rate limit.

### AtCoder metadata

AtCoder Problems datasets:

- `problems.json`
- `contests.json`
- `problem-models.json`
- Documentation: https://github.com/kenkoooo/AtCoderProblems/blob/main/doc/api.md

The datasets provide problem IDs, contest IDs, indices, timestamps and estimated difficulty. Responses are cached for 30 minutes.

## Main features

- Responsive dark/lavender interface with horizontal top navigation.
- Contest dashboard with sticky filters and counts.
- Codeforces divisions and AtCoder contest types.
- Recent/Old, optional target difficulty, optional A/B/C… source-position filters, and manual problem IDs.
- Optional target rating (`Any difficulty` is valid).
- Required duration, start time and end time; immediate-start support.
- Capital-letter contest labels A, B, C… independent of source problem indices.
- Upcoming contest editing.
- Problem identities visible by default; host can hide them until contest end.
- Invite friends using a contest link/code/password UI (local prototype behavior; cross-device joining requires a backend).
- Contest room with countdown/progress and Overview, Problem, Status, Rank, Discuss and Preference tabs.
- In-app native statement reader powered by the server-side crawler, with an **Open original** fallback.
- Unsolved/Upsolved tracking and profile activity heatmap.

## Run locally

Requirements: Node.js 18.17+ and npm. `cheerio@1.0.0` is pinned to keep Node 18.17 compatibility.

```bash
npm install
cp .env.example .env
# Add FIRECRAWL_API_KEY=fc-your-key-here to .env for managed crawling
npm run setup:crawler
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). Keep the terminal running while using the site.

Production build and preview:

```bash
npm run build
npm run preview
```

## Deploy on Render (production web service)

This release includes `server.js`, `server/contestStackApi.js`, and `render.yaml`. The API handlers are shared between Vite development and the production Express server. Production serves the built `dist/` frontend and binds to `0.0.0.0` using Render's `PORT`.

### Deploy with Render Blueprint (recommended)

1. Push the project root to a GitHub repository.
2. In Render, choose **New → Blueprint** and connect that repository.
3. Render reads `render.yaml`; create the `contest-stack` web service.
4. When prompted, enter `FIRECRAWL_API_KEY` from your Firecrawl dashboard. If you do not configure it, crawler fallbacks may still receive 403 responses from judge sites.
5. Deploy. Render uses `npm install --include=dev && npm run build`, then `npm start`, and checks `/health`.

### Deploy manually

Create **New → Web Service**, connect the repository, and set:

- Runtime: **Node**
- Build command: `npm install --include=dev && npm run build`
- Start command: `npm start`
- Health check path: `/health`
- Environment variables: `NODE_ENV=production` and `FIRECRAWL_API_KEY=<your Firecrawl key>`

Do not add `.env` to Git. Set secrets in Render's Environment page. The application listens on `process.env.PORT` and host `0.0.0.0`, as required for Render web services. The build command explicitly includes dev dependencies because Vite is needed to compile the frontend; the production runtime does not import Vite.

After deployment, verify `https://YOUR-SERVICE.onrender.com/health` and `https://YOUR-SERVICE.onrender.com/api/problem-statement/health`.

Note: browser `localStorage` data remains local to each user's browser; contest links/invitations are not yet backed by shared authentication/database storage. The in-memory metadata/statement cache is per instance and is cleared when the service restarts.

## Data and limitations

- Personal contest data is stored in browser `localStorage`.
- Friend invitations are currently a frontend prototype and are not truly shared across devices without authentication and a database.
- Status tracking is managed in Contest Stack; there is no submission/verdict integration with Codeforces or AtCoder.
- Rank is not a live judge leaderboard.
- Discussion notes are not yet a shared persistent discussion system.
- The Vite middleware serves local development/preview. In production, `server.js` mounts the same API routes through Express and serves the built frontend. A server-side `FIRECRAWL_API_KEY` is strongly recommended for anti-bot protected statement pages.
- Firecrawl and the judge platforms are external dependencies. Their availability, anti-bot policies, rate limits and account/credit requirements are outside this app's control.

## Useful commands

```bash
npm run check:server
npm run setup:crawler
npm run test:crawler
npm run build
npm run preview
```
