# Trident Island

**The Island Command Center** — a private dashboard for our place on the
St. Lawrence River. Open it on a phone and, in about three seconds, know how
warm it is, how hard it's blowing and from where, whether the glass is rising or
falling, where the river is sitting, and how long the bridge will take.

## What's on it

| Card | Shows |
| --- | --- |
| Current weather | Temperature, condition, feels-like, today's high/low, sunrise/sunset |
| Wind | Sustained, gusts, and direction on a compass dial |
| Barometric pressure | Current reading, 3-hour tendency, 24-hour sparkline |
| Conditions | Humidity, dew point, chance of rain, cloud cover, visibility |
| St. Lawrence River | Water level and water temperature, each with its own trend, timestamp and gauge, plus a 24-hour/7-day level chart |
| Getting to the Island | Thousand Islands Bridge waits, both directions, colour-coded |
| Hourly | Next 24 hours — temperature, precipitation, wind |
| 7-day forecast | Tap a day for wind, gusts, UV, precipitation totals |
| 24-hour trends | Interactive chart: temperature, wind, gusts, precipitation, pressure |

Plus **Boat Mode** (the ship icon in the header): the six numbers that matter on
the water, at a size you can read outdoors.

## Run it locally

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. **It works with no configuration and no API keys** —
every data source is a free public government or open-data feed.

To change the location or pin a river station, copy `.env.example` to
`web/.env.local` and edit it.

## Data sources

All three are called from server-side route handlers, never from the browser.

| | Source | Notes |
| --- | --- | --- |
| Weather | [Open-Meteo](https://open-meteo.com/) | No key required |
| River level | [CHS IWLS](https://api-iwls.dfo-mpo.gc.ca/swagger-ui.html) — Canadian Hydrographic Service / Government of Canada | Observed water levels (`wlo`) |
| River temperature | [NOAA CO-OPS](https://tidesandcurrents.noaa.gov/stationhome.html?id=8311062), falling back to [USGS](https://waterservices.usgs.gov/docs/instantaneous-values/) | Station 8311062 (Alexandria Bay); USGS parameter `00010` |
| U.S. → Canada | [CBSA border wait times](https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html) | Official CSV feed |
| Canada → U.S. | [U.S. CBP Border Wait Times](https://bwt.cbp.gov/) | Official JSON feed, port 0708 (Alexandria Bay) |

The crossing is **Thousand Islands Bridge — Lansdowne, ON ↔ Alexandria Bay, NY**,
which is not the same as the other crossings in the area.

### Picking the river station

By default the app asks IWLS for its station list and uses the closest operating
water-level station to your coordinates — for the default location that's
**Brockville (station 14400)**, about 36 km downriver. The card always names the
station and its distance, because a level only means something if you know where
it was measured.

To pin a different one, set `RIVER_STATION_CODE` (a CHS station code, browsable
at [tides.gc.ca/en/stations](https://tides.gc.ca/en/stations)) or
`RIVER_STATION_ID` (an IWLS UUID).

### Picking the temperature gauge

Water temperature comes from different agencies than the level — CHS publishes
levels here, NOAA and USGS publish temperature — so the two halves of the card
are fetched, timestamped and failed independently, and each names its gauge.

Two sources are tried in order and the first usable reading wins:

1. **NOAA CO-OPS station 8311062**, Alexandria Bay NY (NDBC `ALXN6`) — about
   5 km from the island, sampled every six minutes, published in °F.
2. **USGS** parameter `00010` — the gauges at Alexandria Bay (`04260800`) and
   Ogdensburg (`04264000`), then a search for any nearby gauge reporting
   temperature. That search **prefers a site whose name mentions "St. Lawrence"
   over a closer one**, because the nearest thermometer may sit on a creek and a
   creek's temperature is not the river's.

Two agencies rather than one because a single river-temperature feed is a single
point of failure, and these sensors are pulled seasonally. Set
`WATER_TEMP_SOURCES` to reorder or narrow the chain. When every source misses,
the card prints what each one said rather than just "unavailable".

## Configuration

Everything tunable lives in [`.env.example`](.env.example) and is read in one
place, `web/lib/config.ts`. Nothing else in the app touches `process.env`.

```
TRIDENT_LATITUDE=44.35234       # the property
TRIDENT_LONGITUDE=-75.99996
RIVER_STATION_CODE=             # blank = use the nearest CHS gauge
WATER_TEMP_SOURCES=noaa,usgs    # order to try the temperature sources
BORDER_CBSA_LOCATION=Thousand Islands Bridge
BORDER_CBP_PORT_NUMBER=0708
```

No source needs an API key today. `WEATHER_API_KEY`, `RIVER_API_KEY` and
`BORDER_API_KEY` are reserved so a keyed provider can be dropped in later
without touching application logic. They are server-side only — never prefix any
variable with `NEXT_PUBLIC_`.

## How it handles bad data

This is the part that matters, because government feeds go down.

- **Each source fails independently.** A dead river API leaves one card reading
  "temporarily unavailable" and the rest of the dashboard untouched. The two
  border directions come from two different governments and fail separately too.
- **The last good value is kept.** If a refresh fails, the previous reading stays
  on screen flagged `Data may be stale` with its age — never blanked, never
  passed off as current.
- **Timestamps are the observation's, not ours.** "Updated 6 minutes ago" means
  the agency published it six minutes ago, not that we fetched it then.
- **Nothing is ever invented.** If a feed returns a shape we can't read, the card
  says so instead of guessing a number.
- **Failures are logged server-side** as `[trident] upstream failure source=…`,
  which shows up in Vercel's runtime logs.

Upstream responses are cached in-process — 10 minutes for weather and border, 20
for the river level, 30 for water temperature — so the external APIs aren't
hammered.

## Layout

```
web/
  app/
    page.tsx              # the dashboard
    settings/page.tsx     # units, refresh interval, alert thresholds
    api/dashboard/        # the one route the browser calls
    api/{weather,river,water-temp,border}/  # one source at a time, for debugging
  lib/
    config.ts             # every env var, read once
    types.ts              # the whole client/server contract
    cache.ts              # TTL cache with last-known-good fallback
    providers/            # the only files that know an external API exists
    alerts.ts             # alert rules — pure functions, ready for push later
    units.ts, time.ts     # conversion and formatting
  components/
    cards/ charts/ ui/
```

## Settings

Units (°F/°C, mph/km-h/kts/m-s, inHg/hPa/mmHg, feet/metres), refresh interval,
preferred border direction, and alert thresholds. Stored in the browser's
localStorage — no accounts, nothing sent to the server. Defaults are °F, mph,
inHg, feet.

## Alerts

`lib/alerts.ts` evaluates high wind, heavy rain, temperature extremes, rapid
river change, border delays and severe weather against your thresholds, and
shows a banner. It's a pure function of the dashboard payload, so the same rules
can run server-side and become push notifications without rewriting them.

## Deploying to Vercel

Import the repo, then set **Root Directory** to `web/` — that's the usual cause
of a Next.js project failing to build on Vercel. The framework preset is
auto-detected.

Add any variables you've customised from `.env.example` under Environment
Variables for both Production and Preview. The app runs correctly with none of
them set.

Pushes to `main` deploy to production; every PR gets a preview URL.
