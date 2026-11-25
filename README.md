# Contest Stack

Contest Stack is a responsive competitive-programming practice workspace for creating and joining Codeforces/AtCoder practice contests.

**Current version: 2.0.2**

## Problem-opening behavior

Contest Stack does **not** show an in-app statement preview, crawl problem pages, or embed Codeforces/AtCoder in an iframe. In the Problem, Overview and Status tabs, clicking **Open original problem** opens the canonical official judge URL in a new browser tab. The Contest Stack tab remains open, so the timer and contest list stay available.

- Codeforces links use `https://codeforces.com/contest/{contestId}/problem/{index}`.
- AtCoder links use `https://atcoder.jp/contests/{contestId}/tasks/{contestId}_{taskIndex}`.
- Links are validated to use HTTPS and the official platform hostname.
- If a valid URL cannot be built, the action is disabled and shows **Original link unavailable**.

## Run locally

Requirements: Node.js supported by Vite 6 and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). Keep the terminal running while using the site.

Production build and preview:

```bash
npm run build
npm run preview
```

## Problem catalogue sources

Contest Stack uses public metadata sources for random problem generation. These sources provide IDs, names, indices, ratings/difficulty, tags and contest metadata—not problem statements.

### Codeforces

- `problemset.problems`
- `contest.list?gym=false`
- Official API documentation: https://codeforces.com/apiHelp

The local Vite server proxies the allowed API methods to avoid browser CORS issues, tries the official mirror API first, validates the Codeforces `{ status: "OK" }` response envelope and caches successful metadata for 30 minutes. The browser-side generator spaces Codeforces API requests to respect the documented rate limit.

### AtCoder

AtCoder Problems datasets:

- `problems.json`
- `contests.json`
- `problem-models.json`
- Dataset/API documentation: https://github.com/kenkoooo/AtCoderProblems/blob/main/doc/api.md

The Vite server proxies only the known dataset paths and caches responses for 30 minutes. AtCoder datasets are plain JSON arrays/maps; they are not expected to contain a Codeforces-style `status` field.

## Main features

- Responsive dark/lavender interface with horizontal top navigation.
- Contest dashboard with sticky filters and counts.
- Codeforces divisions and AtCoder contest types.
- Recent/Old, optional target difficulty, optional A/B/C… source-position filters, and manual problem IDs.
- Optional target rating (`Any difficulty` is valid).
- Required duration, start time and end time; immediate-start support.
- Capital-letter contest labels A, B, C… independent of the source problem index.
- Upcoming contest editing.
- Problem identities visible by default; host can hide them until contest end.
- Invite friends using a contest link/code/password UI (local prototype behavior; cross-device joining requires a backend).
- Enter contest room with countdown/progress and Overview, Problem, Status, Rank, Discuss and Preference tabs.
- Original judge links open directly in a new tab; no statement preview/crawler/iframe.
- Unsolved/Upsolved tracking and profile activity heatmap.

## Data and limitations

- Personal contest data is stored in browser `localStorage`.
- Friend invitations are currently a frontend prototype and are not truly shared across devices without authentication and a database.
- Status tracking is managed in Contest Stack; there is no submission/verdict integration with Codeforces or AtCoder.
- Rank is not a live judge leaderboard.
- Discussion notes are not yet a shared persistent discussion system.
- Vite metadata proxy routes are for local development/preview. Production deployment needs equivalent backend/serverless routes for `/api/codeforces/*` and `/api/atcoder/resources/*`.

## Useful commands

```bash
npm run check:server
npm run build
npm run preview
```

`check:server` checks Vite middleware and the problem catalogue/URL resolver JavaScript. Full real-browser testing should be performed after installing dependencies.
