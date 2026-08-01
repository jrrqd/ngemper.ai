# PRD: ngemper.ai

Workshop artifact for Cursor Hands-on Workshop (PRD → RFC → Build → Review → Deploy → Submit). Sharpened via grill-me.

## Problem

Gas hikes make intercity and regional travel expensive. Flying from cities like Bogor to Bangkok is fast but costly. Indonesian budget travelers planning a first Southeast Asia overland trip do not have a clear way to compare multimodal routes (train, bus, ferry, short taxi/Grab transfers), see ranked alternatives, understand checkpoints on a map, prepare for border crossings, or weigh the trip against flying.

## Product one-liner

**ngemper.ai** recommends ranked overland routes between curated SEA cities so an Indonesian budget traveler can pick the best route — with budget, time, map checkpoints, border prep, and a vs-flying comparison.

## Stage

This workshop deliverable is a **POC only** — prove the core loop (pick cities → ranked overland routes → map / border / vs-flying) with curated data. Not a production commerce product.

### Future monetization (out of scope for POC)

Planned later, not built now:

1. **Affiliate ticket sales** — deep links / referral to booking partners (train, bus, ferry, flight) when the user is ready to buy a leg. POC ships curated outbound **Buy tickets** links on transit milestones as the seam; referral IDs / tracking come later.
2. **Paid AI assistant** — subscription or usage-priced helper for itinerary Q&A, border/visa nuance, and trip tweaks beyond the static recommender.

POC must not implement payments, affiliate tracking, paywalls, or the AI assistant.

## Primary persona

Indonesian budget traveler on a **first SEA overland trip** (not digital nomads, not global freestyle search).

## Core job (hero)

**Which overland route should I take?** Ranked route recommendations are the hero. Vs-flying and snapshots support that decision; they do not lead.

## MVP scope

### Input

- Curated city picker (not free-text). Free-text any-city is **full version later**.
- **Origins:** Bogor, Jakarta, Bandung, Yogyakarta, Surabaya, Bekasi
- **Destinations (seeded corridors):** Bangkok, Kuala Lumpur, Singapore
- **Fully seeded corridors:** Bogor→Bangkok, Jakarta→KL, Jakarta→Singapore
- **Unseeded origin→destination pairs:** auto-compose by prepending a feeder leg into Jakarta, then attaching the Jakarta corridor. Feeder legs labeled **estimate**.

### Ranked recommendations (hero)

- Each plan returns **2–3 alternatives**, most optimal first.
- Alternative shapes: **Cheapest overland** / **Faster hybrid** / **Scenic** (scenic optional if time runs out).
- Default sort: **lowest total IDR cost**. Toggle: **Cheapest** | **Fastest**.
- Badge on #1: "Best value" (when sorted by cheapest).

### Modes

- Train, bus, ferry as primary long-haul modes.
- **Taxi / Grab only as short transfer connectors** between hubs (e.g. port → train station), never as long-haul legs. Always estimate-badged.

### Per selected route

- Ordered milestone cards: mode, duration, price (IDR).
- **Google Maps Embed** iframe showing checkpoints for the selected route (requires API key — see RFC).
- **Cross-border milestones:** badge `Cross-border · passport required` + short fixed checklist (passport, visa note, arrival card if relevant). Not a full immigration database.
- **Snapshots:** YouTube/TikTok embeds on the **first 3 milestones** of the selected route; remaining milestones use static image cards (creator handle + link).
- Share: URL encodes `origin` + `destination` + `selectedRouteId`, with copy button.

### Vs flying (support)

- Compact strip **above** the ranked list: flying cost + duration (curated average).
- **Save-delta** on each route card: "Save Rp X vs flying".

### Language & money

- English UI; Indonesian place and mode names kept native (KRL, etc.).
- All prices in **IDR** at a fixed curated FX rate, labeled **approx**.

### Honesty

- Global footer: "Estimates · curated Aug 2026 · not for booking".
- Per-number badges where relevant: `estimate` / `approx FX` / `flight avg`.

## User stories

1. As an Indonesian budget traveler, I pick origin and destination from curated lists and click Plan, so I can see overland options for my trip.
2. As a budget traveler, I see 2–3 ranked route recommendations with the cheapest first, so I can choose which overland route to take.
3. As a budget traveler, I can re-sort by Fastest, so I can trade money for time.
4. As a budget traveler, I see flying cost/time above the list and a save-delta on each card, so I can judge whether overland is worth it.
5. As a budget traveler, I select a route and see milestone cards (including short Grab/taxi transfers where hubs do not connect), so I understand every checkpoint.
6. As a budget traveler, I see a Google Maps embed of the selected route's checkpoints, so I have geographic visibility.
7. As a budget traveler, I see a cross-border badge and short checklist on border milestones, so I can prepare passport/visa needs.
8. As a budget traveler, I see travel vlog embeds on the first 3 milestones, so the trip feels real.
9. As a budget traveler, I copy a share URL for my selected itinerary, so I can send it to a friend.

## Non-goals

- No real-time booking or payments.
- No affiliate referral tracking, partner SDKs, or monetization paywalls (post-POC). Curated outbound ticket links on transit milestones are allowed as the affiliate seam.
- No paid or free AI assistant in this build (post-POC).
- No live flight or social scraping on day 1 (curated averages / curated embed URLs).
- No accounts or saved trips (URL is persistence).
- No free-text any-city search (v2).
- No full Maps JS API / custom polylines (Embed only).
- No full visa/immigration wiki.
- No hotel/accommodation planning.
- No mobile app / PWA install flow.
- No graph pathfinding engine — hand-curated alternatives + deterministic sort + Jakarta feeder composition.

## Acceptance criteria

- City picker lists the six origins and three destinations; Plan works for all combinations via seed or Jakarta compose.
- Seeded corridors return ≥2 ranked routes; first item is cheapest by total `priceIdr` under default sort.
- Cheapest/Fastest toggle reorders correctly.
- Selected route shows milestones including any short transfer legs; transfer and feeder legs show `estimate` badges.
- Cross-border milestones show badge + checklist.
- Selected route shows Google Maps Embed with checkpoint visibility (or clear error if API key missing).
- First 3 milestones of selected route embed video; rest are static cards.
- Vs-flying strip and per-card save-deltas render from curated flight alternative.
- Share URL restores origin, destination, and selected route.
- Footer + badges present; no horizontal scroll at 360px width.
- Lint green; smoke test covers ranking (cheapest first) and Jakarta feeder composition.

## Constraints

- Scope is **POC** — validate the recommender loop; monetization comes later.
- ~3 hour workshop build on the user's machine.
- Deploy: Netlify (static preferred) or Railway if needed.
- Data: static JSON in repo; no third-party transport APIs for MVP.
- Google Maps Embed API key required before public deploy.
- Stack locked in RFC.

## Demo pitch (3 min)

Gas hike → pick Bogor→Bangkok → ranked routes with save-vs-flying → expand best value → map checkpoints → border badge → play a milestone embed → copy share URL.
