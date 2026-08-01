# ngemper.ai

Ranked overland routes for Indonesian budget travelers planning a first SEA trip.

## Quick start

```bash
npm install
cp .env.example .env   # set PUBLIC_GOOGLE_MAPS_EMBED_KEY
npm run dev
```

## Scripts

- `npm run dev` — local Astro server
- `npm test` — Vitest domain smoke tests
- `npm run build` — `astro check` + tests + static `dist/`

## Demo pitch path

1. Open site → Bogor → Bangkok → **Plan**
2. See vs-flying strip + ranked routes (Best value on cheapest #1)
3. Select a route → map checkpoints → border badge → milestone embeds
4. **Copy share URL** → open in a new tab

## Netlify

- Build command: `npm run build`
- Publish: `dist`
- Node: 22
- Env: `PUBLIC_GOOGLE_MAPS_EMBED_KEY` (Maps Embed API, HTTP referrer restricted to `*.netlify.app` + localhost)

## Honesty

Estimates · curated Aug 2026 · not for booking.
