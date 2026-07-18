# SpaceShare — Frontend (Web)

The web app for **SpaceShare**, an on-demand workspace marketplace for Nigeria. Covers Seeker search/booking, Host listing management, and the Corporate Admin dashboard.

Full product context lives in the PRD (see `spaceshare-docs` repo). This README covers setup only.

---

## Tech Stack

- **HTML, CSS, and JavaScript** (no framework)
- **Google Maps** integration for location search
- Hosted on **Vercel**

---

## Prerequisites

- Node.js v20+ (used for local dev tooling/build scripts only, not a framework runtime)
- npm
- Git

---

## Getting Started

```bash
git clone https://github.com/spaceshare-group8/spaceshare-frontend.git
cd spaceshare-frontend
npm install
cp .env.example .env
```

Fill in `.env` (or your build tool's equivalent config — confirm the exact mechanism with your Frontend Lead, since plain JS projects vary in how env values get injected at build time):

```
API_BASE_URL=http://localhost:4000
GOOGLE_MAPS_API_KEY=
PAYSTACK_PUBLIC_KEY=
```

Run locally:

```bash
npm run dev
```

> Confirm the exact dev-server command and port with your Frontend Lead — this depends on the specific build tool/setup they choose (e.g. Vite as a bundler, or a simple static server) since the project isn't using a framework CLI to standardize this.

---

## Project Structure

```
src/
  pages/           # route-level screens (Search, Listing Detail, Booking, Dashboard...) — plain HTML files or templated views
  styles/          # CSS, organized by page/component
  scripts/         # JavaScript, one file per feature area (auth, search, booking, corporate, admin)
  api/             # fetch()-based API client functions, one file per backend module
  components/      # reusable HTML/CSS/JS snippets (cards, modals, nav)
```

---

## Working Against the API Before It's Ready

Don't wait for Backend to finish an endpoint. Build against the documented contract (PRD Section 16) using mock JSON responses in `src/api/`, then swap the mock for the real `fetch()` call once it's live — same function signature, so nothing else in the app needs to change.

---

## Branching & PRs

- `main` is always deployable and auto-deploys to Vercel on merge, with a **preview URL generated for every pull request** — use this to get Design/PM feedback before merging.
- Create a feature branch per Jira ticket: `feature/SEARCH-2-results-screen`
- Open a PR into `main`, get at least 1 review, then merge.
- Do not push directly to `main`.

---

## Performance Notes (please follow — this is part of the product's value proposition)

SpaceShare is built for users on unreliable, low-bandwidth connections. Since there's no framework handling this for you, it's especially important to:

- Compress and lazy-load images, especially listing photos
- Keep JavaScript files small and load only what each page needs — avoid pulling in heavy third-party libraries for small conveniences
- Cache recent search results in memory (a simple JS object/localStorage-free in-memory cache) so navigating back doesn't re-fetch everything

---

## Deployment

Frontend is hosted on **Vercel**, connected to this repo's `main` branch. Every merge to `main` triggers an automatic redeploy. Environment variables are set in the Vercel dashboard under **Settings → Environment Variables**.
