# Contest Stack — Project Workflow & Requirements

**Project:** Contest Stack  
**Current package version:** `2.1.1`  
**Document status:** Product and technical reference  
**Last updated:** 25 November 2026  
**Specification updated:** Problem statements are loaded through a server-side crawler and rendered inside Contest Stack, with an official-page fallback.

**Current implementation:** React + Vite frontend, browser-local persistence, Vite server middleware for Codeforces/AtCoder metadata and a server-side problem-statement crawler (Firecrawl Cloud managed proxy, local Playwright fallback, then direct server HTML).

---

## 1. Product overview

Contest Stack is a personal competitive-programming practice workspace. It lets a user create scheduled or immediate practice contests using Codeforces or AtCoder problems, enter a contest room, read problem statements in an in-app native viewer, open original judge pages when needed, track unsolved and upsolved problems, invite friends, and review activity on a profile heatmap.

The contest room follows familiar online-judge workflows (problem list, statement reader, status, rank, discussion and preferences) while keeping Contest Stack's own dark/lavender visual identity. Problem statements are fetched by the local server crawler and rendered as sanitized HTML inside Contest Stack. The official judge page remains available as a fallback link; the entire judge website is never embedded in an iframe.

### Product goals

1. Make it easy to generate practice contests from real Codeforces and AtCoder problem catalogues.
2. Keep contest creation flexible: problem IDs are optional, target rating is optional, and the number of problems is independent from the selected source indices.
3. Keep the contest problem list and sanitized statement accessible inside Contest Stack; retain the official judge page as a fallback link.
4. Make it easy to revisit missed problems after a contest and distinguish unsolved from upsolved work.
5. Support private practice sessions with friends through an invitation link or contest code and password.
6. Show a profile-level view of contest consistency and practice history.

---

## 2. Users, roles and account assumptions

### Current roles

- **Host:** Creates and configures a contest, controls problem visibility before the contest starts, edits an upcoming contest, and creates invitations.
- **Participant:** Joins a private contest using its invitation code/link and password, enters the contest room, and views its problems.
- **Personal workspace owner:** Uses the current single-user workspace and profile.

### Current account model

The current implementation is a single-browser personal workspace. There is no authentication system or shared database yet. Contest records, invitation details, participant names and workspace name are stored in the browser. A second user on another device cannot reliably access the same invitation or contest until a shared backend and authentication are implemented.

### Production requirement

For real multi-user use, add authenticated user accounts, workspace membership, server-side contest ownership, participant membership, database-backed invitations and authorization checks. The frontend must not be trusted to enforce host/participant permissions by itself.

---

## 3. Navigation and pages

### 3.1 Main navigation

A horizontal top navigation bar contains:

- Contest Stack logo/brand.
- **Contest stack** navigation item.
- **My profile** navigation item.
- Workspace control on the right.

The workspace control opens a menu where the user can rename the personal workspace and navigate to the profile. Workspace name is currently stored in browser localStorage.

### 3.2 Contest Stack dashboard

The dashboard contains:

- Page title and short description.
- **Join contest** action.
- **New contest** action.
- Summary cards for total contests, unsolved problems and upsolved problems.
- Contest search.
- Platform filter: All platforms, Codeforces, AtCoder.
- Contest filters: All contests, Unsolved, Upsolved, Recent and Old.
- Contest cards sorted newest-created first.

The summary/filter ledger should remain at the top of the contest browsing experience while the list scrolls. Counts are derived from the contest records.

### 3.3 Contest room

The contest room contains a contest header, progress indicator, start/end information, duration, target level and participant count. Its navigation tabs are:

- Overview
- Problem
- Status
- Rank
- Discuss
- Preference
- Clone action

The default active section is **Problem**.

### 3.4 Profile

The profile contains:

- Personal workspace/profile header.
- Contest and problem summary statistics.
- Activity heatmap covering approximately the previous 12 months.
- Contest history with platform, division, problem count and upcoming/completed state.

The current profile is a local personal profile, not an authenticated public profile.

---

## 4. Contest creation workflow

### 4.1 Required fields

A contest requires:

1. Contest title.
2. Platform.
3. Contest duration.
4. Valid start and end timestamps, unless Immediate start is enabled.
5. A generated or manually specified problem set.

The end time must be later than the start time. In scheduled mode, the UI derives the end time from start time plus duration when the start time or duration changes, while still displaying both timestamps.

### 4.2 Platform options

**Codeforces** contest/division options:

- Div. 1
- Div. 2
- Div. 3
- Div. 4
- Educational
- Global Round

**AtCoder** contest type options:

- ABC
- ARC
- AGC
- AHC

### 4.3 Age filter

- **Recent:** Problems whose source contest timestamp is within the last 365 days.
- **Old:** Problems whose source contest timestamp is more than 365 days old.

A problem without a usable contest timestamp cannot match either age filter in the current generator.

### 4.4 Optional target rating

Target level is not mandatory. The default is **Any difficulty**. When Any is selected, the generator does not filter by rating band.

Current Codeforces target bands:

| Target level | Codeforces problem rating range |
|---|---:|
| Newbie | 800–1199 |
| Pupil | 1200–1399 |
| Specialist | 1400–1599 |
| Expert | 1600–1899 |
| Candidate Master | 1900–2099 |
| Master | 2100–2299 |
| International Master | 2300–2399 |
| Grandmaster | 2400+ |

AtCoder uses AtCoder Problems' estimated difficulty. The current implementation maps it into wider approximate bands; these are not equivalent to Codeforces ratings:

| Target level | Approximate AtCoder difficulty range |
|---|---:|
| Newbie | below 400 |
| Pupil | 400–799 |
| Specialist | 800–1199 |
| Expert | 1200–1599 |
| Candidate Master | 1600–1999 |
| Master | 2000–2399 |
| International Master | 2400–2799 |
| Grandmaster | 2800+ |

These AtCoder bands are a practical filter approximation, not an official rank conversion.

### 4.5 Problem count and source-position filters

- Number of problems is selectable from **1 to 12**.
- Source-position filters are optional: A, B, C, D, E, F and further supported capital-letter positions.
- Selecting no source positions means any available source index can be used.
- Selecting A and B means the random pool is restricted to source problems whose original index is A or B.
- The number of problems remains independent of the selected positions.

**Example:** 6 problems + selected source positions A and B means generate six unique problems drawn from the eligible A/B source-position pool. It does not mean generate only two problems.

Every selected problem is then assigned a sequential Contest Stack label: A, B, C, D, E, F… The source index is separate metadata. For example, the generated contest's Problem A could be source problem CF B, and Problem B could also be source problem CF A.

### 4.6 Optional manual problem IDs

The user can enter a specific problem ID into a problem slot. Manual IDs:

- Are optional; all fields can be left blank.
- Lock the entered problem into the generated contest.
- Count toward the requested problem count.
- Must not be duplicated in the same contest.
- Must be valid for the selected platform.
- Leave the generator to fill the remaining problem count with random matching problems.

Current accepted formats:

- Codeforces: contest ID plus problem index, e.g. `1890A` or `2275B`.
- AtCoder: contest/task form such as `abc382_a` or `abc382-a`.

The current form provides manual ID fields mapped to capital-letter positions. Manual IDs are inserted as fixed questions; selected source-position filters apply to the random catalogue pool.

### 4.7 Problem visibility

The option **Show problem info during contest** is enabled by default.

- **ON:** Participants can see the sequential problem labels, source indices, IDs and problem links.
- **OFF:** The problem identities are hidden while the contest is active; the app shows generic Problem A/Problem B labels. The identities are revealed once the contest ends.

The current implementation performs this hiding in the frontend. A production multi-user backend must also withhold hidden problem IDs from participant API responses; hiding data only in the UI is not secure.

### 4.8 Immediate start and schedule

**Immediate start ON:**

- The contest start timestamp is set to the current time when the host submits the form.
- End time is calculated as current time plus selected duration.
- Scheduled date/time inputs are disabled.

**Immediate start OFF:**

- Host chooses start date/time.
- End date/time is calculated from duration and validated.
- The contest remains Upcoming until the start timestamp.

### 4.9 Create result

When the host submits:

1. Validate title, duration, date/time and manual IDs.
2. Load the matching platform catalogue if random problems are needed.
3. Apply platform, division/type, Recent/Old, optional target level and optional source-index filters.
4. Add manual problems as fixed items.
5. Randomly choose unique remaining problems without duplicates.
6. Assign sequential Contest Stack labels A, B, C… in the final problem order.
7. Save the contest to browser storage.
8. Return to the dashboard and show the new contest at the top.

If too few problems match the filters, show a clear error explaining how many more problems are available and which filters should be relaxed. Do not silently create a smaller contest.

---

## 5. Contest lifecycle and editing

### 5.1 Derived contest states

Contest state is calculated from the current time and saved timestamps:

- **Upcoming:** Current time is before `startAt`.
- **In progress:** Current time is at or after `startAt` and before `endAt`.
- **Ended:** Current time is at or after `endAt`.

The card refreshes the state periodically; the room timer refreshes every second.

### 5.2 Edit upcoming contest

The host can edit a contest only before its start time. The edit action is not available once the contest has started.

Editable settings include title, platform, division/type, age, target level, problem count, selected source positions, manual IDs, duration, start/end time and problem visibility.

Important edit behavior:

- Changing only title, dates, duration or visibility preserves the existing problem set.
- Changing problem-generation settings regenerates the problem set.
- If the generated problem set changes, old unsolved/upsolved tracking is reset to avoid attaching old results to different questions.
- If the problem set remains the same, existing results are preserved.

### 5.3 Clone contest

Clone creates a new contest based on the current one:

- New contest ID and copied title with `(Copy)` suffix.
- Same platform, division, filters and problem set.
- New start time approximately 10 minutes after cloning.
- Same duration.
- Empty participants, invitation, unsolved and upsolved lists.
- New creation timestamp.

### 5.4 End-of-contest results

After the contest ends, each problem can be classified as:

- **Solved:** Solved during the contest (the default state when it is not in either tracked list).
- **Unsolved:** Not solved during the contest and still needs review.
- **Upsolved:** Solved after the contest ended during later practice.

Unsolved and upsolved counts appear in the contest card and dashboard ledger. A problem should be in only one result category at a time.

---

## 6. Friend invitations and joining

### 6.1 Host invitation flow

1. Host opens **Invite friends** on a contest card.
2. Contest Stack creates or reuses an invitation code.
3. Host sets or edits a password.
4. Host saves the invitation.
5. After saving, host can copy the contest code, invite link and password separately.
6. Host shares the link/code and password with friends.

The invite link uses a `?join=CODE` query parameter. The password is intentionally not embedded in the URL and must be shared separately.

### 6.2 Participant join flow

1. Participant opens the invitation link or chooses **Join contest**.
2. The code is prefilled when opened via a link.
3. Participant enters contest code, password and display name.
4. App verifies the code/password against the invitation record.
5. Participant name is added to the contest participant list.
6. Participant can enter the contest room.

### 6.3 Current prototype limitation

Invitations and participants are stored in localStorage. A join request can only find an invitation saved in the same browser profile. It does not provide real cross-device or cross-user joining.

### 6.4 Production invitation requirements

- Persist invitations and memberships in a shared database.
- Store a secure password hash rather than plaintext.
- Use cryptographically secure random invitation codes.
- Support revoking or rotating an invitation.
- Add expiry and optional participant limits.
- Enforce authorization and prevent unauthorized host actions.
- Rate-limit code/password attempts.
- Do not expose the password in frontend-readable contest objects.

---

## 7. Contest room workflow

### 7.1 Overview

Displays contest title, state, duration, number of problems, unsolved count and upsolved count. Visible problem entries link directly to the official judge page in a new tab.

### 7.2 Problem

The Problem page contains a left-side ordered problem rail and a native statement panel. Selecting a problem requests its official task URL through the server-side statement crawler. The server extracts only the statement container, sanitizes its HTML, and returns it to the client. The full judge website is never embedded. An **Open original** link remains available when a participant needs the official page or the crawler is blocked.

The list includes:

- Sequential capital labels A, B, C… in Contest Stack order.
- Source platform and source problem index.
- Problem name and ID when problem identities are visible.
- A native in-app statement reader with samples, constraints, notes and source formatting where provided.
- A direct official-judge link as fallback.
- No full-page iframe.

### 7.3 Status

Shows local per-problem progress. The current implementation does not send submissions to Codeforces or AtCoder and does not receive real judge verdicts. Status is based on the host's local Solved/Unsolved/Upsolved tracking.

### 7.4 Rank

Currently displays the host and joined participant names. It is not a live score/rank table. A real ranking requires participant submission data or a Contest Stack scoring model and shared backend.

### 7.5 Discuss

Currently allows the current browser user to write notes while the room is open. Notes are held in component state and are not persisted or shared. A production version should save discussion posts in a database and associate each post with a user and contest.

### 7.6 Preference

Shows the contest's problem-identity visibility setting, timer duration, platform and division/type.

---

## 8. Problem catalogue and generation integrations

### 8.1 Codeforces metadata

The generator uses the public Codeforces API through the local Vite middleware:

- `problemset.problems`
- `contest.list?gym=false`

The problemset API supplies problem IDs, original index, name, rating, tags and contest ID. Contest list supplies contest names and start timestamps. Contest names are used for division filtering; contest timestamps are used for Recent/Old filtering.

Official API documentation: https://codeforces.com/apiHelp

The generator pauses between API calls to respect Codeforces rate limits. Catalogue responses are cached in memory during the current server/browser session.

### 8.2 AtCoder metadata

The generator uses AtCoder Problems public datasets:

- `problems.json`
- `contests.json`
- `problem-models.json`

The datasets provide problem/task IDs, contest IDs, task indices, contest timestamps and estimated difficulty. AtCoder Problems documentation: https://github.com/kenkoooo/AtCoderProblems/blob/main/doc/api.md

The application waits between dataset accesses. Estimated difficulty is used for the optional approximate target filter.

### 8.3 Metadata versus judge page content

Catalogue APIs provide metadata and difficulty, not the full problem statement. Contest Stack constructs a canonical official task URL from a validated problem ID. The server-side crawler then attempts to retrieve that page and extract only the problem statement. The client never sends an arbitrary URL to the server.

---

## 9. Server-side problem-statement crawler

### 9.1 Crawler order

1. **Firecrawl Cloud (recommended for protected pages):** when `FIRECRAWL_API_KEY` is set in the server environment, POST to `https://api.firecrawl.dev/v2/scrape` with `formats: ["rawHtml"]` and `proxy: "auto"`. Firecrawl documents that auto proxy retries with enhanced proxy when the basic proxy fails. The server tries the Codeforces official page and its official mirror.
2. **Local Playwright browser:** if Firecrawl is not configured or fails, use local Chrome/Chromium via Playwright to visit allowed canonical problem URLs and read the known statement container.
3. **Basic server HTML request:** final fallback for pages that permit normal HTTP requests.
4. If all sources fail, show a clear diagnostic and an **Open original** link. Never leave an infinite loading state.

Firecrawl's API requires a server-side Bearer key. Never expose the key as a `VITE_` variable or put it in client code.

### 9.2 URL allowlist and extraction

- Codeforces IDs must match `contestId + problemIndex`, for example `2275B`; the server derives `https://codeforces.com/contest/2275/problem/B`.
- AtCoder IDs must match a supported contest/task shape, for example `ABC361-C`; the server derives `https://atcoder.jp/contests/abc361/tasks/abc361_c?lang=en`.
- The API accepts platform and problem ID, not an arbitrary URL, to avoid turning the endpoint into an SSRF proxy.
- Codeforces statement selector: `.problem-statement`.
- AtCoder statement selector: `#task-statement .lang-en`, with `#task-statement` fallback.
- Strip scripts, styles, forms, iframes, embeds and event attributes. Sanitize HTML on the server with an allowlist before rendering. Resolve relative images and links against the official task URL.
- Cache successful statements for six hours and deduplicate concurrent requests for the same task.
- Bound Firecrawl, Playwright and HTTP request durations. Return explicit HTTP/error diagnostics instead of an endless loading state.
- Do not attempt to defeat access controls. A server crawler avoids browser CORS restrictions, but the target judge can still return 403. Firecrawl's managed enhanced proxy may improve success; it is optional and may consume account credits.

### 9.3 Local development setup

```bash
npm install
cp .env.example .env
# Set FIRECRAWL_API_KEY=fc-your-key-here in .env
npm run setup:crawler
```

Copy `.env.example` to `.env` and add `FIRECRAWL_API_KEY` to enable Firecrawl Cloud. Start Vite after editing `.env`. The crawler health route is `/api/problem-statement/health`.

### 9.4 Original page fallback

The statement panel includes a canonical official-judge link. It opens in a new browser tab with `target="_blank"` and `rel="noopener noreferrer"`. The Contest Stack tab and contest timer remain available.

## 10. Main data model

The current contest record is stored as a JavaScript object. A typical record contains:

```json
{
  "id": "contest-unique-id",
  "title": "Div. 2 practice",
  "platform": "Codeforces",
  "division": "Div. 2",
  "era": "Recent",
  "level": "Any",
  "immediate": false,
  "showProblemInfo": true,
  "startAt": "2026-11-25T10:00:00.000Z",
  "endAt": "2026-11-25T12:00:00.000Z",
  "duration": 120,
  "requestedProblemCount": 6,
  "problemCount": 6,
  "selectedSlots": ["A", "B"],
  "generationMode": "filtered-random",
  "manualProblems": [],
  "problems": ["2275B", "2195B"],
  "letters": ["A", "B"],
  "problemDetails": [
    {
      "id": "2275B",
      "index": "B",
      "slot": "B",
      "name": "Did Not Go to Print",
      "rating": 1200,
      "tags": [],
      "url": "https://codeforces.com/contest/2275/problem/B",
      "manual": false
    }
  ],
  "unsolved": [],
  "upsolved": [],
  "participants": [],
  "invitation": {
    "code": "ABC123",
    "password": "example-only",
    "createdAt": "2026-11-25T09:00:00.000Z"
  },
  "createdAt": "2026-11-25T09:00:00.000Z"
}
```

The JSON is an illustrative shape, not a production security recommendation. In production, invitation secrets must not be stored in readable client-side contest objects.

### Important field meanings

- `requestedProblemCount`: number requested by the host.
- `problemCount`: actual number in the saved problem set.
- `selectedSlots`: optional original source indices used to filter random problems.
- `letters`: sequential Contest Stack display labels.
- `problemDetails`: platform source data needed to display problem metadata and build official judge links.
- `unsolved`: IDs currently classified as unsolved.
- `upsolved`: IDs currently classified as upsolved.
- Solved is currently the default state when a problem ID is in neither list.
- `participants`: display names in the current prototype.

---

## 11. Browser storage and state

Current storage keys:

| Key | Purpose |
|---|---|
| `contest-stack-v2` | Contest records |
| `contest-stack-v1` | Legacy contest records used during migration |
| `contest-stack-workspace-name` | Workspace display name |

On startup, the app reads `contest-stack-v2`. If absent, it attempts to read `contest-stack-v1`, normalizes the contest labels and migrates the previous hidden-problem default to visible. Contest changes are written to localStorage.

**Limitations:** localStorage is browser/device-specific, user-editable and not suitable as the source of truth for a secure multiplayer product. It can be cleared by the user and does not synchronize across devices.

---

## 12. Current implementation status

This section distinguishes the current code from production requirements.

| Feature | Current status | Notes |
|---|---|---|
| Responsive dark/lavender UI | Implemented | React/CSS layout with horizontal top navigation |
| Contest dashboard and filters | Implemented | Local contest records; summary ledger and search |
| Create Codeforces/AtCoder contest | Implemented | Metadata fetched through Vite middleware |
| Recent/Old filter | Implemented | Uses source contest timestamp for generation |
| Optional target rating | Implemented | Any difficulty is the default |
| Optional A/B/C… source-index filter | Implemented | Filters the source pool; count remains independent |
| Manual problem IDs | Implemented | Fixed IDs mixed with randomly generated problems |
| Immediate and scheduled contests | Implemented | Start/end timestamps and duration |
| Upcoming contest edit | Implemented | Cannot edit after contest has started |
| Default problem-info visibility | Implemented | ON by default; frontend reveal after end |
| Enter contest and timer | Implemented | Timer is derived from saved start/end timestamps |
| Native statement viewer | Implemented in the current source | Server crawler with Firecrawl Cloud (optional), Playwright and direct HTML fallback; official link remains available |
| CF/AtCoder catalogue proxy | Implemented | Vite server/preview middleware |
| Invite code and password UI | Implemented locally | No cross-device sharing until backend is added |
| Participant display list | Implemented locally | Names only; not authenticated accounts |
| Unsolved/Upsolved tracking | Implemented locally | Host-managed state; no automatic judge verdict integration |
| Profile heatmap | Implemented locally | Derived from local contest completion and upsolved records |
| Workspace rename | Implemented locally | Browser storage only |
| Status tab | Partial | Local tracking only; no external submissions/verdicts |
| Rank tab | Partial | Displays host and participant names; not a live score table |
| Discuss tab | Partial | Notes live in component state and are not persisted/shared |
| Authentication | Not implemented | Required for a real multi-user product |
| Shared backend/database | Not implemented | Required for cross-device contests and invitations |
| Live contest synchronization | Not implemented | Participants do not see real-time shared state yet |
| Real submission integration | Not implemented | No code submission or judge verdict retrieval |
| Production metadata API deployment | Not implemented | Vite metadata middleware must be moved to deployed backend/serverless routes |
| Secure server-side hidden problem data | Not implemented | Current visibility toggle is a UI-level prototype feature |

---

## 13. Production requirements and recommended architecture

### 13.1 Backend and database

Introduce a backend service and persistent database. Suggested core entities:

- Users
- Workspaces
- Workspace members
- Contests
- Contest problems
- Contest participants
- Contest invitations
- Problem status records
- Discussion posts
- Activity events
- Cached catalogue metadata

The backend must own contest creation, invitation verification, membership, contest permissions, hidden problem access and shared results.

### 13.2 Authentication and authorization

Requirements:

- Registration/login and secure sessions.
- Host and participant roles per contest.
- Only the host can edit or delete their upcoming contest.
- Participants can only access contests they created or joined.
- Hidden problem IDs must be excluded from participant responses while the contest is active when the host enables hiding.
- Invitation passwords must be hashed server-side.
- Validate all incoming data on the server.
- Apply rate limits to login, join and metadata endpoints.

### 13.3 Multi-user synchronization

Requirements:

- Joining from different browsers/devices.
- Shared participant list.
- Server-authoritative contest start/end state.
- Shared problem status and results where appropriate.
- Shared discussion posts.
- A defined score/ranking model before implementing live Rank.
- Optional WebSocket or server-sent events for real-time participant and status updates.

### 13.4 Original problem navigation

No problem page-fetching backend is required. The frontend opens validated official Codeforces and AtCoder URLs directly. Keep URL construction centralized in `src/utils/problemUrl.js`; do not introduce an arbitrary-URL proxy.


### 13.5 Heatmap/activity model

For a production profile, store timestamped activity events rather than infer activity from contest dates. Suggested event types:

- Contest created.
- Contest started/completed.
- Problem solved during contest.
- Problem upsolved after contest.
- Practice session/problem attempt.

The heatmap should count clearly defined events per local calendar day and should use a consistent timezone policy.

---

## 14. Non-functional requirements

### Responsive design

- Desktop: full horizontal navigation, contest dashboard and ordered problem list.
- Tablet: compact navigation and flexible dashboard columns.
- Mobile: stacked cards, horizontally scrollable contest tabs, collapsible problem rail and readable problem page tables/code blocks.
- Avoid horizontal page overflow; wide examples/tables should scroll within the problem page panel.

### Performance

- Cache problem metadata.
- - Avoid downloading full catalogue datasets repeatedly in one session.
- Prefer cached sanitized statement content; keep the official judge link as a fallback when crawling is blocked.
- Keep per-source request timeouts and an overall request deadline.

### Reliability

- No infinite loading state.
- Show actionable errors when problem catalogues are unavailable and a clear disabled state when a problem URL cannot be resolved.
- Offer retry and original judge page links.
- Do not create incomplete contests when the requested problem count cannot be met.
- Preserve the current contest problem set when editing non-generation fields.

### Security

- Never execute crawled HTML or scripts.
- Validate generated problem URLs against official Codeforces and AtCoder hosts.
- Do not expose secrets, passwords or hidden problem data to unauthorized clients.
- Do not trust localStorage for authorization or shared state.

### Accessibility

- Keyboard-accessible navigation and dialogs.
- Visible focus states.
- Proper labels for inputs and switches.
- Descriptive button labels and accessible modal titles.
- Sufficient text/background contrast.

---

## 15. Repository structure

```text
contest-stack/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── .env.example
├── .gitignore
├── PROJECT_WORKFLOW_AND_REQUIREMENTS.md
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── data.js
    ├── styles.css
    ├── components/
    │   ├── Sidebar.jsx
    │   ├── NewContestModal.jsx
    │   ├── ContestCard.jsx
    │   ├── ContestRoom.jsx
    │   ├── InviteContestModal.jsx
    │   ├── JoinContestModal.jsx
    │   ├── ProfilePage.jsx
    │   └── Heatmap.jsx
    ├── services/
    │   ├── problemGenerator.js
    │   └── problemStatement.js
    └── utils/
        └── contest.js
```

### File responsibilities

- `App.jsx`: top-level navigation state, dashboard state, filters, contest CRUD and local persistence.
- `data.js`: seed contests and rating-level labels.
- `Sidebar.jsx`: top navigation and workspace menu/name.
- `NewContestModal.jsx`: contest creation/edit form and generator orchestration.
- `ContestCard.jsx`: dashboard card, status, problem tags and post-contest result controls.
- `ContestRoom.jsx`: contest timer, tabs, problem rail, native statement viewer, official links and room interactions.
- `InviteContestModal.jsx`: create/save/copy local invitation credentials.
- `JoinContestModal.jsx`: collect invitation code, password and display name.
- `ProfilePage.jsx`: local profile statistics and history.
- `Heatmap.jsx`: last-year activity grid derived from contest records.
- `problemGenerator.js`: Codeforces/AtCoder catalogue loading, filters, rating bands and random selection.
- `vite.config.js`: cached Codeforces/AtCoder metadata routes, statement crawler endpoint, HTML sanitization, Firecrawl managed proxy integration and Playwright fallback.
- `src/services/problemStatement.js`: bounded client request and crawler timeout handling.
- `scripts/test-crawler.mjs`: Codeforces and AtCoder crawler smoke tests.
- `styles.css`: responsive visual system and component layout.

---

## 16. Local setup and developer workflow

### Prerequisites

- Node.js 18.17 or later (Cheerio is pinned to 1.0.0 for this compatibility target).
- npm.
- Internet access for Codeforces/AtCoder catalogues and problem pages. Install Playwright Chromium with `npm run setup:crawler`. Configure `FIRECRAWL_API_KEY` in `.env` to enable Firecrawl Cloud managed proxy crawling; otherwise 403 may persist.

### Install and run

From the project root:

```bash
npm install
cp .env.example .env
# Set FIRECRAWL_API_KEY=fc-your-key-here in .env
npm run setup:crawler
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`. Keep the terminal and Vite server running while using the site.

### Verify the statement crawler

Open `/api/problem-statement/health` and confirm `firecrawlConfigured: true`. Test Codeforces with `/api/problem-statement?platform=Codeforces&id=2275B` and AtCoder with `/api/problem-statement?platform=AtCoder&id=ABC361-C`. Run `npm run test:crawler` in a second terminal. Open a contest room and select a problem; the native statement panel should show loading, success or a bounded error with an **Open original** link.

### Check source syntax

```bash
npm run check:server
```

This checks the Vite metadata and crawler middleware syntax, problem generator, URL resolver and crawler smoke-test script syntax.

### Production build and local preview

```bash
npm run build
npm run preview
```

The current metadata middleware is registered for Vite development and preview servers. A static deployment without a Node/serverless backend will not include the catalogue proxy routes.

### Debugging common problems

**`vite: command not found`**  
`npm install` did not complete. Fix npm permissions/cache if needed, then rerun `npm install`.

**`ERR_CONNECTION_REFUSED` on localhost**  
The Vite server is not running or the browser is using the wrong port. Start `npm run dev` and use the exact URL shown in the terminal.

**Invite code not found on another device**  
Expected in the current localStorage prototype. Cross-device invitations require the shared backend described above.

---

## 17. Acceptance criteria

A release should satisfy these observable workflows:

### Contest creation

- [ ] User can create a Codeforces contest using each supported division option.
- [ ] User can create an AtCoder contest using ABC, ARC, AGC or AHC.
- [ ] User can set a problem count from 1 to 12.
- [ ] User can leave all source positions unselected and receive problems from any eligible index.
- [ ] User can select A/B and receive the requested total count drawn from source A/B problems.
- [ ] User can enter one or more fixed IDs and have the generator fill the remaining count.
- [ ] User can leave target rating as Any.
- [ ] Recent and Old filters are applied using source contest timestamps.
- [ ] Invalid IDs, duplicate IDs, invalid time ranges and insufficient problem pools produce clear errors.
- [ ] Problem labels are sequential capital letters in Contest Stack, independent from source indices.

### Contest lifecycle

- [ ] Scheduled contests show Upcoming before the start time.
- [ ] Contest becomes In progress at the start timestamp.
- [ ] Contest becomes Ended at the end timestamp.
- [ ] Immediate start sets start to creation/submission time and derives end from duration.
- [ ] Host can edit only before the contest starts.
- [ ] Non-generation edits preserve the current problem set.
- [ ] Generation-setting edits regenerate the problem set and reset old result tracking only when the problem set changes.

### Visibility and problem room

- [ ] Problem information is visible by default.
- [ ] If the host disables visibility, participant-facing IDs are hidden until contest end.
- [ ] Selecting a problem fetches its statement through `/api/problem-statement`.
- [ ] The local Playwright browser fallback works after Chromium is installed.
- [ ] The project displays whether Firecrawl is configured; protected Codeforces pages use managed Firecrawl proxy when a key is present.
- [ ] Crawler smoke tests can be run for Codeforces 2275B and AtCoder ABC361-C.
- [ ] Firecrawl Cloud is used when `FIRECRAWL_API_KEY` is configured.
- [ ] Returned statement HTML is sanitized before it is rendered.
- [ ] Previous/Next and left-side problem navigation work.
- [ ] No full-page judge website iframe is rendered inside Contest Stack.
- [ ] The official judge link remains available as a fallback.

### Invitations and results

- [ ] Host can save an invitation with code and password.
- [ ] Host can copy invite link, code and password separately.
- [ ] Join form accepts code, password and display name.
- [ ] Wrong code/password produce clear errors.
- [ ] Ended contests expose Solved, Unsolved and Upsolved controls.
- [ ] Dashboard counts reflect the saved problem result categories.

### Profile and responsive UI

- [ ] Profile shows contest counts, problem totals, history and heatmap.
- [ ] Main navigation works on desktop and mobile widths.
- [ ] Workspace menu opens and workspace rename persists in the current browser.
- [ ] No essential action is hidden or non-functional on mobile.

---

## 18. Recommended implementation roadmap

### Phase 1 — Stabilize the current prototype

- Complete real-browser tests for creation, editing, entering and original problem navigation.
- Validate all responsive layouts and keyboard flows.
- Add persistence/export/import backups for local contest data.

### Phase 2 — Multi-user foundation

- Add backend API and database.
- Add user authentication and workspace membership.
- Move contest CRUD and invitations from localStorage to the backend.
- Implement secure join and participant membership.
- Enforce hidden problem information at the API layer.

### Phase 3 — Shared contest experience

- Synchronize contest state and participant list.
- Persist problem status and discussion posts.
- Define and implement ranking/scoring rules.
- Add user profiles and cross-device activity history.

### Phase 4 — Judge integrations

- Evaluate official submission/status integrations and their authentication/rate-limit policies.
- Add submission links or authorized submission tracking where permitted.
- Monitor upstream source availability and review API rate limits when needed.

### Phase 5 — Production deployment

- Deploy frontend and backend/serverless routes.
- Configure secrets and rate limits server-side.
- Add database backups and migration strategy.
- Add monitoring for metadata API and database health.
- Publish privacy, retention and acceptable-use policies.

---

## 19. External references

- Codeforces API documentation: https://codeforces.com/apiHelp
- AtCoder Problems API documentation: https://github.com/kenkoooo/AtCoderProblems/blob/main/doc/api.md
- Vite documentation: https://vite.dev/guide/
- React documentation: https://react.dev/learn

External judge websites control their own availability and access. Keep canonical URL generation centralized and limit outbound navigation to official judge domains.

---

## 20. Product principles to preserve

1. Keep Contest Stack's independent dark/lavender visual identity; do not copy another judge's visual design wholesale.
2. Use Codeforces and AtCoder as problem/catalogue sources, not as embedded full-page experiences.
3. Load the problem statement with the server-side crawler; verify Firecrawl Cloud is configured for protected pages, confirm the sanitized native statement appears, and keep the original-page fallback available.
4. Keep problem count independent from selected source positions.
5. Keep target rating optional; Any difficulty must remain a valid default.
6. Use capital-letter labels A, B, C… consistently in the Contest Stack contest order.
7. Make problem visibility ON by default, with an explicit host option to hide identities.
8. Do not silently discard a user's existing problem set when they edit unrelated contest fields.
9. Never claim multi-user, live ranking or judge-submission functionality until it is backed by server-side services.
10. Keep metadata requests cached, rate-limited and observable.
