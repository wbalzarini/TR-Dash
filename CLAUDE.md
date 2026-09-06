# Project: Trident Island

A private dashboard for a family vacation home in the Thousand Islands, on the
St. Lawrence River. One screen answers "how are things at the island right now?"
— weather, wind, pressure, river level and Thousand Islands Bridge border waits.
Phone first, no accounts, no database.

## Stack
- Frontend: Next.js (App Router) + React + TypeScript + Tailwind CSS v4 — lives in `web/`
- Charts: Recharts. Icons: Lucide.
- Data: Open-Meteo (weather), CHS IWLS (river level), NOAA CO-OPS + USGS
  (river temperature),
  CBSA + U.S. CBP (border waits). All called server-side only, from
  `web/lib/providers/`.
- Hosting: Vercel, root directory = `web/`, deploys from `main`

## Commands
Run these from `web/`:
- `npm install`
- `npm run dev` — local dev server on :3000
- `npm run build` — production build; must pass before any PR
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint`

## Rules
- Never commit directly to `main`. One branch per feature: `feat/<short-name>`.
- Run the production build locally before pushing. A failing build = failing deploy.
- Never hardcode API keys or coordinates. Read from environment variables via
  `web/lib/config.ts`; list every variable in `.env.example`.
- No data source key may reach the browser. The browser only ever calls our own
  `/api/*` routes — never an external provider directly.
- Don't add dependencies without saying why in the PR description.
- Ask before changing folder structure or deployment config.
- Keep it small. This is a status board, not a weather service: no auth, no
  database, no push notifications unless someone asks.

## Data contract
- The browser fetches `GET /api/dashboard` and nothing else. `/api/weather`,
  `/api/river` and `/api/border` exist for debugging one source at a time.
- Response shape is `DashboardResponse` in `web/lib/types.ts`.
- Every section is a `Section<T>`: either `{status:"ok", data, fetchedAt, stale}`
  or `{status:"unavailable", error, fetchedAt}`. One dead feed degrades one card
  and never the page.
- `web/lib/providers/*.ts` are the only files that know an external API exists.
  Swapping a provider means rewriting one `fetchX` to return the same type.
- Units are canonical on the wire — °F, mph, hPa, metres, inches — and converted
  at the UI edge in `web/lib/units.ts` from the reader's settings.

## Non-negotiables
- Never invent a reading. If a source fails and there is no cached value, the
  card says "temporarily unavailable".
- Never present stale data as current. Every value on screen carries the time it
  was *observed*, not the time we fetched it, and goes to "Data may be stale"
  past the thresholds in `web/lib/config.ts`.
- Use official government sources for river and border data. Don't scrape a
  third-party site when an official feed exists.
