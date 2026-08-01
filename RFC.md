# RFC: ngemper.ai (POC)

| Field | Value |
|---|---|
| Status | Proposed |
| Product | ngemper.ai |
| Stage | **POC** — prove recommender loop; not commerce |
| PRD | [`PRD.md`](./PRD.md) |
| Author | workshop build |
| Date | 2026-08-01 |
| Target | ~3h POC → Netlify static deploy |

This RFC locks **how** we build the PRD POC: stack, data model, compose rules, Maps integration, URL schema, file layout, clock-budget cut lines, and **explicit seams** for post-POC monetization (not implemented now).

---

## 1. Summary

Ship a **static Astro + TypeScript POC** that:

1. Reads curated JSON corridors + feeder legs from the repo.
2. Composes a plan for any origin×destination pair (seeded corridor or Jakarta feeder + hub corridor).
3. Ranks 2–3 route alternatives (default: cheapest IDR).
4. Renders ranked cards, vs-flying strip, selected-route milestones, Google Maps Embed, border checklist, and limited video embeds.
5. Persists selection via query-string share URL.

No backend, no booking, no affiliate tracking, no AI assistant, no pathfinding graph.

**POC success:** judges (and users) can run the core loop end-to-end on a public URL and understand this is estimates-only, not a booking product.

---

## 2. Stage, goals & non-goals

### Stage (from PRD)

This build is a **proof of concept** only — validate “pick cities → ranked overland routes → map / border / vs-flying” with curated data. It is **not** a production commerce product.

### Goals

- Implement every PRD acceptance criterion with curated data.
- Keep runtime client-light: domain logic in pure TypeScript modules, unit-tested with Vitest.
- Deploy as a static site on Netlify with one public env var for Maps Embed.
- Preserve honesty: footer + badges (`estimate` / `approx FX` / `flight avg`); copy must not imply live booking.
- Leave **clean extension points** for post-POC monetization without shipping any of it.

### Non-goals (POC)

From PRD, restated for engineering:

- No payments, paywalls, checkout, or accounts.
- No affiliate referral IDs, partner SDKs, or click tracking. Curated outbound **Buy tickets** links on transit milestones (`ticket?: { url, provider }`) are in scope as the affiliate seam.
- No AI assistant (chat, LLM API, usage metering, or subscription).
- No Node server, SSR data APIs, or edge functions.
- No Maps JavaScript API, Static Maps API, or custom polylines (Embed only).
- No scraping / live transport or flight prices.
- No free-text any-city search, hotels, immigration wiki, or mobile/PWA install flow.
- No graph pathfinding — hand-curated alternatives + deterministic sort + Jakarta feeder composition.
- Scenic third alternative may be cut if the clock dies after two solid routes per corridor.

### Post-POC monetization (documented only — do not build)

PRD future model:

1. **Affiliate ticket sales** — deep links / referral to booking partners per leg (train, bus, ferry, flight).
2. **Paid AI assistant** — subscription or usage-priced Q&A on itinerary, border/visa nuance, trip tweaks.

**Engineering implication for POC:** ship curated outbound ticket CTAs on buyable transit legs (no ref IDs). Leave room for affiliate adapters and AI later without a rewrite. See §17.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Astro pages (SSG) — POC shell                          │
│  index.astro  → planner UI                              │
│  Client island (vanilla TS) for interactivity           │
└────────────┬────────────────────────────────────────────┘
             │ import
┌────────────▼────────────────────────────────────────────┐
│  Pure domain modules (no DOM, no network)               │
│  composePlan · rankRoutes · totals · shareUrl · mapsUrl │
└────────────┬────────────────────────────────────────────┘
             │ import
┌────────────▼────────────────────────────────────────────┐
│  Static curated data                                    │
│  cities · feeders · corridors/*.json · snapshots        │
└─────────────────────────────────────────────────────────┘

Post-POC only (not in tree for POC):
  affiliate adapters · AI assistant service · accounts/billing
```

**Pattern:** Astro for shell + CSS; one small client script island for picker / sort / select / copy. Domain logic stays framework-free so Vitest can smoke-test ranking and feeder composition without a browser.

**Why static Astro for a POC?** Matches workshop stack guidance, deploys cleanly to Netlify, minimizes deps, and keeps the honesty story simple (no “backend that looks like live booking”). Monetization and AI need a backend later — that is intentional post-POC work, not a POC blocker.

---

## 4. Stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Astro 5.x** | `output: 'static'` |
| Language | **TypeScript** (strict) | Shared types in `src/types.ts` |
| Styling | **Vanilla CSS** in `src/styles/` | No Tailwind / UI kit |
| Interactivity | **Vanilla TS** client island | No React/Vue island |
| Unit tests | **Vitest** | Domain modules only |
| Lint | **ESLint** + `astro check` | Pre-deploy gate |
| Hosting | **Netlify** | `publish = dist`, Node 22 |
| Maps | **Google Maps Embed API** | iframe from milestone coords |
| Video | YouTube / TikTok iframes | Curated URLs; first 3 milestones only |

### Dependency policy

- Prefer zero runtime npm deps beyond Astro.
- Allowed: `vitest`, TypeScript, ESLint as **devDependencies**.
- **Forbidden in POC:** React, Tailwind, map SDKs, scraping libs, AI SDKs (`openai`, etc.), analytics/affiliate SDKs, auth/billing libs, state libraries.

### Env

| Var | Where | Purpose |
|---|---|---|
| `PUBLIC_GOOGLE_MAPS_EMBED_KEY` | Netlify + local `.env` | Maps Embed iframe key (public; restrict by HTTP referrer) |

No Stripe/LLM/affiliate env vars in POC. Commit `.env.example` with the Maps key name only — never commit secrets.

---

## 5. Information architecture (UI)

Single page, top → bottom:

1. **Brand + one-liner** — “ngemper.ai — ranked overland routes for SEA”
2. **POC honesty chip** (subtle, near brand or under planner) — “POC · estimates only · not for booking” (reinforces PRD stage; footer still required)
3. **Planner controls** — Origin · Destination · Plan · Cheapest | Fastest toggle
4. **Vs-flying strip** (after Plan) — carrier · duration · price (`flight avg` badge)
5. **Ranked route list** (hero) — 2–3 cards; #1 gets “Best value” when sort=cheapest; totals + “Save Rp X vs flying”
6. **Selected route detail**
   - Google Maps Embed (checkpoints)
   - Milestone cards (mode, duration, price, badges, border prep, optional **Buy tickets ↗**)
   - Embeds on milestones `0..2` if `snapshot.type === 'embed'`; else static card
7. **Share** — copy current URL
8. **Footer** — `Estimates · curated Aug 2026 · not for booking`

**Explicitly absent in POC:** affiliate ref tracking, “Ask AI”, pricing plans, signup.

Mobile: single column; no horizontal scroll at **360px**.

Language: English UI; native Indonesian place/mode names (KRL, etc.). All money **IDR**, labeled **approx**.

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
  label: string;
  role: 'origin' | 'destination' | 'both';
};
```

**Origins:** bogor, jakarta, bandung, yogyakarta, surabaya, bekasi  
**Destinations:** bangkok, kuala-lumpur, singapore

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
  map: { lat: number; lng: number };
  // Affiliate seam — curated URLs now; ref IDs later:
  ticket?: { url: string; provider: string };
  // POST-POC ONLY:
  // affiliate?: { partner: string; deepLinkTemplate: string };
};

export type RouteAlternative = {
  id: string;              // "cheap-overland" | "faster-hybrid" | "scenic"
  label: string;
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
  routes: RouteAlternative[]; // ≥2 required; 3rd scenic optional
};

export type FeederLeg = Milestone & {
  legType: 'feeder';
  estimate: true;
  origin: CityId;
  hub: 'jakarta';
};
```

POC schema may include optional `ticket` on buyable transit milestones. Affiliate ref IDs and AI fields stay post-POC.

### 6.3 Seeded corridors (files)

| File | Corridor | Min routes |
|---|---|---|
| `src/data/corridors/bogor-bangkok.json` | Bogor → Bangkok (demo hero) | 2 (prefer 3) |
| `src/data/corridors/jakarta-bangkok.json` | Jakarta → Bangkok (compose hub) | 2 |
| `src/data/corridors/jakarta-kuala-lumpur.json` | Jakarta → KL | 2 |
| `src/data/corridors/jakarta-singapore.json` | Jakarta → Singapore | 2 |

### 6.4 Feeders

`src/data/feeders.json` — one feeder per non-Jakarta origin → Jakarta:

| Origin | Suggested mode |
|---|---|
| Bogor | KRL Commuterline |
| Bekasi | KRL Commuterline |
| Bandung | Train / travel bus (estimate) |
| Yogyakarta | Train (estimate) |
| Surabaya | Train (estimate) |

All feeders: `estimate: true`, `legType: 'feeder'`.

### 6.5 Money constants

```ts
// src/data/fx.ts
export const FX_NOTE = 'approx';
export const CURATED_AS_OF = 'Aug 2026';
// Prices stored in IDR at curation time — no runtime FX conversion in POC.
```

---

## 7. Compose & rank algorithms

### 7.1 `composePlan(origin, destination): Plan`

```
Plan = {
  origin, destination,
  composed: boolean,
  flightAlternative,
  routes: RouteAlternative[]
}
```

**Rules:**

1. Reject `origin === destination` (picker disables this).
2. Look up corridor `${origin}-${destination}`.
3. **Hit (seeded):** return routes + flight as-is; `composed = false`.
4. **Miss:** require `origin !== 'jakarta'`; load feeder `origin → jakarta`; attach to hub corridor `jakarta-${destination}`; `composed = true`.
5. Hub corridors must exist for bangkok, kuala-lumpur, and singapore (`jakarta-bangkok.json` is mandatory for compose).

```ts
function attachFeeder(feeder: FeederLeg, routes: RouteAlternative[]): RouteAlternative[] {
  return routes.map(r => ({
    ...r,
    milestones: [
      { ...feeder, id: `${feeder.origin}-jakarta-feeder` },
      ...r.milestones,
    ],
  }));
}
```

Flight stub for composed plans = hub corridor’s `flightAlternative`. Do **not** add feeder duration to the flight strip. Save-delta uses overland totals **including** feeder.

### 7.2 Totals

```ts
totalPriceIdr(route) = sum(m.priceIdr)
totalDurationMin(route) = sum(m.durationMin)
saveVsFlying(route, flight) = flight.priceIdr - totalPriceIdr(route) // may be negative
```

### 7.3 `rankRoutes(routes, sort: 'cheapest' | 'fastest')`

- `cheapest`: ascending `totalPriceIdr` (tie-break `id`)
- `fastest`: ascending `totalDurationMin` (tie-break `id`)
- “Best value” badge only when `sort === 'cheapest'` and index === 0

Default on Plan: **cheapest**.

### 7.4 Scenic cut line

- Target: 3 routes on Bogor→Bangkok; ≥2 elsewhere.
- Clock cut at T+90m: drop scenic; keep ≥2 everywhere. POC acceptance still passes.

---

## 8. Google Maps Embed

### 8.1 URL builder

Directions embed; checkpoints from milestone `map` coords:

```
https://www.google.com/maps/embed/v1/directions
  ?key=PUBLIC_GOOGLE_MAPS_EMBED_KEY
  &origin={lat},{lng}
  &destination={lat},{lng}
  &waypoints={lat},{lng}|…
  &mode=driving
```

`mode=driving` is a visualization compromise (not true rail/ferry routing). Do not claim turn-by-turn transit directions.

Missing key → labeled placeholder: “Map unavailable — set PUBLIC_GOOGLE_MAPS_EMBED_KEY”.

### 8.2 Key setup

1. Enable **Maps Embed API**.
2. API key with HTTP referrer restriction: `localhost` + Netlify URL.
3. Netlify env: `PUBLIC_GOOGLE_MAPS_EMBED_KEY`.
4. Local `.env` from `.env.example`.

No Static Maps fallback in POC.

---

## 9. Snapshots (embeds)

- Iframes only on **selected** route, milestones `index < 3` with `snapshot.type === 'embed'`.
- YouTube / TikTok: store final iframe-ready `url` in JSON where practical.
- Rest: static image + creator + link.
- `loading="lazy"` on iframes.

---

## 10. Share URL schema

```
/?origin=bogor&destination=bangkok&route=cheap-overland&sort=cheapest
```

| Param | Role | Default |
|---|---|---|
| `origin` | restore | — |
| `destination` | restore | — |
| `route` | selected alternative id | first after sort |
| `sort` | `cheapest` \| `fastest` | `cheapest` |

Invalid params → picker + soft error; no crash. Copy via `clipboard.writeText` with textarea fallback.

URL is the only persistence (no accounts) — aligns with POC / PRD.

---

## 11. Cross-border UI

If `milestone.crossBorder`:

- Show `borderPrep.badge`.
- Short checklist under milestone meta.
- Vitest: every seeded `crossBorder: true` milestone has `borderPrep`.

This is static prep copy — **not** the future paid AI visa helper.

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
│   └── snapshots/
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
│   │   └── format.ts
│   ├── styles/
│   │   └── global.css
│   ├── scripts/
│   │   └── planner.ts
│   ├── components/
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

**Do not add** in POC: `src/lib/affiliate*`, `src/lib/ai*`, `src/pages/api/*`, billing routes.

---

## 13. Deploy

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

Scripts:

- `npm run dev` — Astro dev
- `npm run build` — `astro check && vitest run && astro build`
- `npm run test` — `vitest run`
- `npm run lint` — eslint + `astro check`

Git → Netlify import → set Maps key → deploy public POC URL.

---

## 14. Testing (POC smoke)

| Test | Asserts |
|---|---|
| `rankRoutes` cheapest | lowest `totalPriceIdr` first |
| `rankRoutes` fastest | lowest `totalDurationMin` first |
| `composePlan` Jakarta→KL | seeded, `composed=false`, ≥2 routes |
| `composePlan` Bandung→Bangkok | feeder prepended, `composed=true`, feeder `estimate=true` |
| `composePlan` Bogor→Bangkok | seeded hero |
| JSON invariant | `crossBorder` ⇒ `borderPrep` |
| transfer invariant | `legType==='transfer'` ⇒ `estimate===true` |

No e2e / Playwright required for workshop if unit smoke + manual demo pass.

---

## 15. Clock budget (~3h)

| Block | Time | Deliverable |
|---|---|---|
| Scaffold Astro + lint/test + CSS tokens | 25m | empty shell deploys |
| Types + cities + feeders + 1 corridor | 35m | compose/rank tests green |
| Remaining corridors + jakarta-bangkok hub | 30m | all pairs compose |
| Planner UI + ranked cards + flight strip | 40m | core loop demoable |
| Milestone detail + border + embeds | 25m | App screenshots strong |
| Maps Embed + env + placeholder | 15m | map or honest error |
| Share URL + POC chip + footer badges | 15m | acceptance sweep |
| Netlify deploy + short README | 15m | submit URL |

**Slip order (cut first):** scenic → TikTok (YouTube-only) → visual polish.  
**Never cut:** ranking, compose, honesty/POC labeling, share URL, vs-flying.  
**Never add under time pressure:** affiliate referral tracking, AI chat, accounts.

---

## 16. Cursor agent setup (workshop)

| Artifact | Purpose |
|---|---|
| `.cursor/rules/project.mdc` | Always Apply: POC scope, Astro+TS, IDR-only, no scrape, Embed-only Maps, no affiliate/AI/payments |
| `.cursor/rules/data.mdc` | `src/data/**` milestone invariants |
| Skill: tidy-tdd | Red → Green for `composePlan` / `rankRoutes` |
| Hook (optional) | Block unexpected new runtime packages |

---

## 17. Monetization seams

| Capability | Attach point | POC status |
|---|---|---|
| Affiliate ticket sales | Per-milestone `ticket` + **Buy tickets ↗** CTA; later `affiliate` metadata + partner adapter | Curated outbound links shipped; no UTM/ref tracking |
| Paid AI assistant | New route/island calling a backend; context = selected `Plan` + milestones | No chat UI, no LLM keys, no paywall |
| Accounts / billing | Auth provider + customer portal | URL share remains only persistence |

When adding referral tracking or AI, revise this RFC (new status/version) first.

---

## 18. Decisions locked vs PRD open items

| Topic | Decision |
|---|---|
| Stage | POC only; honesty chip + footer |
| Monetization | Ticket CTAs (no refs) in POC; affiliate tracking + paid AI later |
| Stack | Astro 5 + TS strict + vanilla CSS + Vitest + Netlify |
| Corridor data | 4 JSON hubs + feeders; schema locked; prices curated at build time |
| Maps | Embed Directions + `PUBLIC_GOOGLE_MAPS_EMBED_KEY`; placeholder if missing |
| Scenic | Preferred on Bogor→Bangkok; cuttable |
| Static map fallback | No |
| Bangkok compose | `jakarta-bangkok.json` required |

---

## 19. Approval

Approve this RFC to implement the **POC** (scaffold → tests → UI → deploy).

**Out of scope until a later RFC:** affiliate referral tracking, paid AI assistant, payments, accounts.
