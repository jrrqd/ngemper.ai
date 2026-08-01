# RFC: ngemper.ai

| Field | Value |
|---|---|
| Status | Proposed |
| Product | ngemper.ai |
| PRD | [`PRD.md`](./PRD.md) |
| Author | workshop build |
| Date | 2026-08-01 |
| Target | ~3h MVP → Netlify static deploy |

This RFC locks **how** we build what the PRD defines: stack, data model, compose rules, Maps integration, URL schema, file layout, and clock-budget cut lines.

---

## 1. Summary

Ship a **static Astro + TypeScript** site that:

1. Reads curated JSON corridors + feeder legs from the repo.
2. Composes a plan for any origin×destination pair (seeded corridor or Jakarta feeder + hub corridor).
3. Ranks 2–3 route alternatives (default: cheapest IDR).
4. Renders ranked cards, vs-flying strip, selected-route milestones, Google Maps Embed, border checklist, and limited video embeds.
5. Persists selection via query-string share URL.

No backend, no booking APIs, no pathfinding graph.

---

## 2. Goals & non-goals

### Goals

- Implement every PRD acceptance criterion with curated data.
- Keep runtime client-light: almost all logic is pure TypeScript modules, unit-tested with Vitest.
- Deploy as a static site on Netlify with one public env var for Maps Embed.
- Preserve an honest “estimates / not for booking” story in UI and data badges.

### Non-goals (from PRD, restated for engineering)

- No Node server, SSR data fetching, or edge functions for MVP.
- No Maps JavaScript API, Static Maps API, or custom polylines.
- No scraping, live prices, auth, or database.
- No scenic third alternative if the clock dies after two solid routes per corridor.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Astro pages (SSG)                                      │
│  index.astro  → planner shell                           │
│  Client island (vanilla TS) for interactivity           │
└────────────┬────────────────────────────────────────────┘
             │ import
┌────────────▼────────────────────────────────────────────┐
│  Pure domain modules (no DOM)                           │
│  composePlan · rankRoutes · totals · shareUrl · mapsUrl │
└────────────┬────────────────────────────────────────────┘
             │ import
┌────────────▼────────────────────────────────────────────┐
│  Static data                                            │
│  src/data/cities.ts · feeders.ts · corridors/*.json     │
│  public/snapshots/*                                     │
└─────────────────────────────────────────────────────────┘
```

**Pattern:** Astro for shell + CSS; one small client script island for picker / sort / select / copy. Domain logic stays framework-free so Vitest can smoke-test ranking and feeder composition without a browser.

**Why not Next.js / React SPA?** Workshop materials and PRD already lean Astro + TS + vanilla CSS. Static output maps cleanly to Netlify; less client JS means embeds + Maps iframe stay the heavy parts, not the framework.

---

## 4. Stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Astro 5.x** | Static `output: 'static'` |
| Language | **TypeScript** (strict) | Shared types in `src/types.ts` |
| Styling | **Vanilla CSS** in `src/styles/` | No Tailwind / UI kit — fewer deps, full visual control |
| Interactivity | **Vanilla TS** client island | No React/Vue island for MVP |
| Unit tests | **Vitest** | Domain modules only |
| Lint | **ESLint** + `astro check` | CI-local / pre-deploy |
| Hosting | **Netlify** | `publish = dist`, Node 22 build image |
| Maps | **Google Maps Embed API** | iframe `src` built at runtime from milestone coords |
| Video | YouTube / TikTok **oEmbed-style iframes** | Curated URLs in JSON; first 3 milestones only |

### Dependency policy

- Prefer zero runtime npm deps beyond Astro.
- Allowed: `vitest`, TypeScript, ESLint tooling as **devDependencies**.
- Forbidden for MVP: React, Tailwind, map SDKs, scraping libs, state libraries.

### Env

| Var | Where | Purpose |
|---|---|---|
| `PUBLIC_GOOGLE_MAPS_EMBED_KEY` | Netlify + local `.env` | Maps Embed iframe key (public by design; restrict by HTTP referrer in Google Cloud Console) |

Never commit `.env`. Commit `.env.example` with the key name only.

---

## 5. Information architecture (UI)

Single page, top → bottom:

1. **Brand + one-liner** — “ngemper.ai — ranked overland routes for SEA”
2. **Planner controls** — Origin select · Destination select · Plan button · Cheapest | Fastest toggle
3. **Vs-flying strip** (after Plan) — carrier · duration · price (`flight avg` badge)
4. **Ranked route list** (hero) — 2–3 cards; #1 gets “Best value” when sort=cheapest; each shows totals + “Save Rp X vs flying”
5. **Selected route detail**
   - Google Maps Embed (checkpoints)
   - Ordered milestone cards (mode, duration, price, badges, border prep)
   - Embeds on milestones index `0..2` if `snapshot.type === 'embed'`; else static card
6. **Share** — copy button for current URL
7. **Footer** — `Estimates · curated Aug 2026 · not for booking`

Mobile: single column, no horizontal scroll at **360px**.

---

## 6. Data model

### 6.1 Cities

```ts
export type CityId =
  | 'bogor' | 'jakarta' | 'bandung'
  | 'yogyakarta' | 'surabaya' | 'bekasi'
  | 'bangkok' | 'kuala-lumpur' | 'singapore';

export type City = {
  id: CityId;
  label: string;       // display, native spelling OK
  role: 'origin' | 'destination' | 'both';
  // Jakarta is origin+hub; destinations are destination-only
};
```

**Origins (picker):** bogor, jakarta, bandung, yogyakarta, surabaya, bekasi  
**Destinations (picker):** bangkok, kuala-lumpur, singapore

### 6.2 Milestone & route

```ts
export type LegType = 'feeder' | 'transfer' | 'transit';
export type Snapshot =
  | { type: 'embed'; provider: 'youtube' | 'tiktok'; url: string }
  | { type: 'static'; image: string; creator: string; url: string };

export type BorderPrep = {
  badge: 'Cross-border · passport required';
  checklist: string[]; // 2–4 short items
};

export type Milestone = {
  id: string;
  from: string;
  to: string;
  mode: string;            // "KRL Commuterline" | "Bus" | "Ferry" | "Grab/taxi" | …
  legType: LegType;
  durationMin: number;
  priceIdr: number;
  estimate: boolean;       // true for feeders + Grab/taxi transfers
  crossBorder: boolean;
  borderPrep?: BorderPrep; // required if crossBorder
  snapshot: Snapshot;
  map: { lat: number; lng: number }; // checkpoint for Embed
};

export type RouteAlternative = {
  id: string;              // "cheap-overland" | "faster-hybrid" | "scenic"
  label: string;           // "Cheapest overland" | "Faster hybrid" | "Scenic"
  milestones: Milestone[];
};

export type FlightAlternative = {
  carrier: string;
  durationMin: number;
  priceIdr: number;
  source: string;          // "Traveloka avg, Aug 2026"
};

export type Corridor = {
  id: string;              // "bogor-bangkok"
  origin: CityId;
  destination: CityId;
  flightAlternative: FlightAlternative;
  routes: RouteAlternative[]; // 2 required, 3rd scenic optional
};

export type FeederLeg = Milestone & {
  legType: 'feeder';
  estimate: true;
  origin: CityId;          // non-Jakarta origin
  hub: 'jakarta';
};
```

### 6.3 Seeded corridors (files)

| File | Corridor | Min routes |
|---|---|---|
| `src/data/corridors/bogor-bangkok.json` | Bogor → Bangkok | 2 (prefer 3) |
| `src/data/corridors/jakarta-kuala-lumpur.json` | Jakarta → KL | 2 |
| `src/data/corridors/jakarta-singapore.json` | Jakarta → Singapore | 2 |

### 6.4 Feeders

`src/data/feeders.json` — one feeder milestone per non-Jakarta origin → Jakarta:

| Origin | Suggested mode | Notes |
|---|---|---|
| Bogor | KRL Commuterline | Can also be used when composing Bogor→KL / Bogor→Singapore |
| Bekasi | KRL Commuterline | |
| Bandung | Train / travel bus | rough estimate |
| Yogyakarta | Train | rough estimate |
| Surabaya | Train | rough estimate |

All feeders: `estimate: true`, `legType: 'feeder'`.

### 6.5 Money constants

```ts
// src/data/fx.ts
export const FX_NOTE = 'approx';
export const CURATED_AS_OF = 'Aug 2026';
// All corridor prices already stored in IDR — no runtime FX conversion in MVP.
// If a source quote is in MYR/THB/SGD, convert once at curation time and store IDR.
```

---

## 7. Compose & rank algorithms

### 7.1 `composePlan(origin, destination): Plan`

```
Plan = {
  origin, destination,
  composed: boolean,
  flightAlternative,
  routes: RouteAlternative[]  // milestones already prefixed if composed
}
```

**Rules:**

1. If `origin === destination` → throw / UI validation error (disabled in picker).
2. Look up corridor `id = `${origin}-${destination}``.
3. **Hit (seeded):** return corridor routes + flight as-is. `composed = false`.
4. **Miss:**
   - Require `origin !== 'jakarta'`.
   - Load feeder for `origin → jakarta`.
   - Resolve hub corridor:
     - If destination is bangkok and we only seeded `bogor-bangkok` + jakarta corridors:
       - Prefer `jakarta-${destination}` when present (`jakarta-kuala-lumpur`, `jakarta-singapore`).
       - For **Bangkok** from non-Bogor origins: use **`jakarta` synthesis**: take `bogor-bangkok` routes and **drop** a leading Bogor→Jakarta feeder-like leg if present, **or** maintain a dedicated `jakarta-bangkok.json` corridor.
5. **Decision (locked):** add `src/data/corridors/jakarta-bangkok.json` as a fourth seeded hub corridor (derived from Bogor→Bangkok without the Bogor leg). Origins compose as: `feeder(origin→Jakarta) + jakarta-{destination}` for all non-Jakarta origins. Bogor→Bangkok remains the **demo hero** fully seeded file; Jakarta→Bangkok is the hub template for compose.

**Compose transform:**

```ts
function attachFeeder(feeder: FeederLeg, routes: RouteAlternative[]): RouteAlternative[] {
  return routes.map(r => ({
    ...r,
    id: r.id, // keep stable ids for share URL
    milestones: [{ ...feeder, id: `${feeder.origin}-jakarta-feeder` }, ...r.milestones],
  }));
}
```

Flight alternative for composed plans = hub corridor’s `flightAlternative` (same destination). Optionally bump duration by feeder time for honesty — **locked: add feeder `durationMin` to flight strip? No.** Flight is airport-to-airport curated average from origin metro; keep flight stub from hub corridor; show feeder estimate only on overland cards. Save-delta uses overland totals including feeder.

### 7.2 Totals

```ts
totalPriceIdr(route) = sum(m.priceIdr)
totalDurationMin(route) = sum(m.durationMin)
saveVsFlying(route, flight) = flight.priceIdr - totalPriceIdr(route) // may be negative; UI still renders
```

### 7.3 `rankRoutes(routes, sort: 'cheapest' | 'fastest')`

- `cheapest`: ascending `totalPriceIdr` (stable tie-break by `id`)
- `fastest`: ascending `totalDurationMin` (stable tie-break by `id`)
- “Best value” badge only when `sort === 'cheapest'` and index === 0

Default sort on Plan click: **cheapest**.

### 7.4 Scenic cut line

- **Ship target:** 3 routes on Bogor→Bangkok (cheap / hybrid / scenic); 2 on other corridors.
- **Clock cut:** if behind at T+90m, drop scenic everywhere; keep ≥2 routes on all corridors. PRD still passes.

---

## 8. Google Maps Embed

### 8.1 URL builder

Use Embed API **place** or **directions**-style multi-stop via path of coordinates.

**Locked approach:** build a Directions embed URL with origin = first milestone `map`, destination = last milestone `map`, and waypoints = intermediate milestone coords (max ~8–10; our routes stay under that).

```
https://www.google.com/maps/embed/v1/directions
  ?key=PUBLIC_GOOGLE_MAPS_EMBED_KEY
  &origin={lat},{lng}
  &destination={lat},{lng}
  &waypoints={lat},{lng}|{lat},{lng}|…
  &mode=driving
```

Notes:

- `mode=driving` is a visualization compromise (trains/ferries won’t follow rails). Acceptable for MVP checkpoint visibility; do not claim turn-by-turn transit directions.
- If key missing: render a clearly labeled placeholder panel — “Map unavailable — set PUBLIC_GOOGLE_MAPS_EMBED_KEY” (satisfies PRD error path).

### 8.2 Key setup (pre-deploy checklist)

1. Google Cloud project → enable **Maps Embed API**.
2. Create API key → Application restriction: **HTTP referrers**.
3. Allow `http://localhost:*` and `https://<netlify-site>.netlify.app/*` (plus custom domain if any).
4. Netlify → Site settings → Environment variables → `PUBLIC_GOOGLE_MAPS_EMBED_KEY`.
5. Local: copy `.env.example` → `.env`.

No Static Maps fallback in MVP (PRD chose Embed-only). Placeholder covers missing key.

---

## 9. Snapshots (embeds)

- Only render `<iframe>` for milestones of the **selected** route where `index < 3` and `snapshot.type === 'embed'`.
- YouTube: `https://www.youtube.com/embed/{id}` derived from curated URL.
- TikTok: official embed URL as stored (curate final iframe `src` in JSON to avoid brittle parsing).
- Remaining milestones: static `<img>` + creator handle + external link.
- Lazy-load iframes (`loading="lazy"`) to protect demo Wi-Fi.

---

## 10. Share URL schema

```
/?origin=bogor&destination=bangkok&route=cheap-overland&sort=cheapest
```

| Param | Required | Default |
|---|---|---|
| `origin` | for restore | — |
| `destination` | for restore | — |
| `route` | selected alternative id | first ranked after sort |
| `sort` | `cheapest` \| `fastest` | `cheapest` |

**On load:** if params valid → auto-run `composePlan`, apply sort, select route. Invalid combo → show picker with error toast, no crash.

**Copy button:** `navigator.clipboard.writeText(location.href)` with fallback `textarea` + `execCommand('copy')`.

---

## 11. Cross-border UI

If `milestone.crossBorder`:

- Show badge text from `borderPrep.badge`.
- Render checklist as a short bullet list under the milestone meta.
- Data must include `borderPrep`; Vitest fixture asserts this invariant for any `crossBorder: true` milestone in seeded JSON.

---

## 12. File layout

```
ngemper.ai/
├── PRD.md
├── RFC.md
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── netlify.toml
├── .env.example
├── public/
│   └── snapshots/          # static milestone images
├── src/
│   ├── types.ts
│   ├── data/
│   │   ├── cities.ts
│   │   ├── fx.ts
│   │   ├── feeders.json
│   │   └── corridors/
│   │       ├── bogor-bangkok.json
│   │       ├── jakarta-bangkok.json
│   │       ├── jakarta-kuala-lumpur.json
│   │       └── jakarta-singapore.json
│   ├── lib/
│   │   ├── composePlan.ts
│   │   ├── rankRoutes.ts
│   │   ├── totals.ts
│   │   ├── shareUrl.ts
│   │   ├── mapsEmbedUrl.ts
│   │   └── format.ts          # IDR, duration labels
│   ├── styles/
│   │   └── global.css
│   ├── scripts/
│   │   └── planner.ts         # client island
│   ├── components/            # Astro components (presentational)
│   │   ├── CityPicker.astro
│   │   ├── FlightStrip.astro
│   │   ├── RouteCard.astro
│   │   ├── MilestoneList.astro
│   │   ├── RouteMap.astro
│   │   ├── ShareButton.astro
│   │   └── SiteFooter.astro
│   └── pages/
│       └── index.astro
└── tests/
    ├── composePlan.test.ts
    ├── rankRoutes.test.ts
    └── totals.test.ts
```

---

## 13. Deploy

`netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

Scripts:

- `npm run dev` — Astro dev server
- `npm run build` — `astro check && vitest run && astro build`
- `npm run test` — `vitest run`
- `npm run lint` — eslint + `astro check`

Deploy path: GitHub repo → Netlify “Import from Git” → set `PUBLIC_GOOGLE_MAPS_EMBED_KEY` → deploy.

---

## 14. Testing (MVP smoke)

Must exist before claim “done”:

| Test | Asserts |
|---|---|
| `rankRoutes` cheapest | lowest `totalPriceIdr` first |
| `rankRoutes` fastest | lowest `totalDurationMin` first |
| `composePlan` Jakarta→KL | seeded, `composed=false`, ≥2 routes |
| `composePlan` Bandung→Bangkok | feeder prepended, `composed=true`, feeder `estimate=true` |
| `composePlan` Bogor→Bangkok | seeded hero corridor |
| corridor JSON invariant | every `crossBorder` milestone has `borderPrep` |
| transfer invariant | `legType==='transfer'` ⇒ `estimate===true` |

No Playwright/e2e required for workshop scoring if unit smoke + manual demo pass.

---

## 15. Clock budget (~3h)

| Block | Time | Deliverable |
|---|---|---|
| Scaffold Astro + lint/test + CSS tokens | 25m | empty shell deploys |
| Types + cities + feeders + 1 corridor JSON | 35m | compose/rank tests green |
| Remaining corridors + jakarta-bangkok hub | 30m | all pairs compose |
| Planner UI + ranked cards + flight strip | 40m | core loop demoable |
| Milestone detail + border + embeds | 25m | App screenshots strong |
| Maps Embed + env + placeholder | 15m | map or honest error |
| Share URL + footer badges + polish | 15m | acceptance sweep |
| Netlify deploy + README | 15m | submit URL |

**Slip order (cut first):** scenic routes → TikTok (YouTube-only) → visual polish. Never cut: ranking, compose, honesty badges, share URL, vs-flying.

---

## 16. Cursor agent setup (workshop edge)

To score Rules / Skills / Hooks:

| Artifact | Purpose |
|---|---|
| `.cursor/rules/project.mdc` | Always Apply: stack, IDR-only, no scrape, Embed-only Maps, estimate badges |
| `.cursor/rules/data.mdc` | `src/data/**`: JSON schema invariants for milestones |
| Skill: tidy-tdd (from meetup) | Red → Green for `composePlan` / `rankRoutes` |
| Hook (optional): block unexpected `npm install <new pkg>` | enforce minimal deps |

---

## 17. Open questions — resolved in this RFC

| PRD open item | Decision |
|---|---|
| Exact stack + versions | Astro 5 + TS strict + vanilla CSS + Vitest + Netlify |
| Milestone lists / prices | Curated into 4 corridor JSON files + feeders (content authored during build; schema locked here) |
| Maps key + Netlify wiring | `PUBLIC_GOOGLE_MAPS_EMBED_KEY`, referrer-restricted |
| Scenic in MVP? | Yes for Bogor→Bangkok if time; cuttable after 2 routes |
| Static map fallback | No — placeholder panel if key missing |
| Bangkok compose hub | Add `jakarta-bangkok.json` so all origins funnel cleanly |

---

## 18. Approval

Approve this RFC to proceed to implementation (scaffold → tests → UI → deploy).

**Next after approval:** implementation plan / direct build starting with Astro scaffold + `composePlan` / `rankRoutes` tests.
