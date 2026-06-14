# SPEC — ligariftbound-price

Static site for tracking TCG card prices from the [LigaRiftbound](https://www.ligariftbound.com.br) marketplace.  
Data is produced by the [ligaprice](https://github.com/fabiorangel/ligaprice) crawler (runs hourly; gold layer aggregated daily at 02:00 UTC) and exported as static JSON files + card images to this repo, which GitHub Pages serves directly — no backend, no API.

---

## Architecture

```
ligaprice crawler (PostgreSQL + Temporal)
  → DailyAggregationWorkflow (cron 02:00 UTC)
    → gold layer tables
      → export_and_push_json activity
        → JSON files + card images pushed to this repo
          → GitHub Pages
            → this Astro site reads them at runtime via fetch()
```

The site is a **fully static Astro build**. All data fetching happens client-side at page load using `fetch()` calls to the JSON endpoints served by GitHub Pages.

---

## Tech Stack

| Tool | Role |
|---|---|
| **Astro 6** | Static site generator — pages, routing, build |
| **React 19** | Interactive components (`client:load`) |
| **Tailwind CSS v4** | Utility-first styling via `@astrojs/tailwind` |
| **lightweight-charts v5** | Price charts (line series, step series) |
| **Fuse.js** | Client-side fuzzy search over `cards.json` |
| **TypeScript** | Strict mode — all components are `.tsx` |

Deploy: GitHub Actions → `astro build` → GitHub Pages  
Base URL: `https://fabiorangel.github.io/ligariftbound-price`  
Config: `astro.config.mjs` → `site` + `base` fields

---

## Project Structure

```
src/
├── components/
│   ├── CardSearch.tsx     fuzzy search input, filters card list in real-time
│   ├── PriceTable.tsx     sortable table of all cards with thumbnail + prices
│   ├── PriceChart.tsx     time-series line chart (min/avg/max) via lightweight-charts
│   ├── MoversList.tsx     top 10 gainers + top 10 losers (7d)
│   └── DepthChart.tsx     [FEAT-08] step-function supply curve (price depth)
├── layouts/
│   └── Base.astro         HTML shell, nav header, footer
├── pages/
│   ├── index.astro        Card catalogue (CardSearch + PriceTable)
│   ├── movers.astro       Movers page (MoversList)
│   └── cards/
│       └── [slug].astro   Card detail (PriceChart + DepthChart)
└── styles/
    └── global.css         Tailwind v4 theme variables, scrollbar reset

public/
├── assets/
│   └── {EDITION}/
│       └── {card_number}.webp   Card images — pushed by ligaprice export
└── data/
    ├── cards.json
    ├── prices/
    │   └── {card_id}.json
    ├── market/
    │   └── latest.json
    ├── movers/
    │   └── latest.json
    └── depth/
        └── {card_id}.json       [FEAT-08]
```

---

## Design Tokens (CSS variables)

Defined in `src/styles/global.css` via `@theme`:

| Variable | Value | Usage |
|---|---|---|
| `--color-brand` | `#7c3aed` | Accent (violet) |
| `--color-brand-light` | `#a78bfa` | Hover, labels |
| `--color-surface` | `#0d0d12` | Page background |
| `--color-surface-2` | `#16161f` | Card / table background |
| `--color-surface-3` | `#1f1f2e` | Elevated elements |
| `--color-border` | `#272738` | All borders |
| `--color-text` | `#e2e2f0` | Body text |
| `--color-muted` | `#7070a0` | Secondary text |
| `--font-sans` | Inter | Body font |
| `--font-mono` | JetBrains Mono | Prices, codes |

Chart colors (inline in components):
- Price avg: `#a78bfa` (brand light)
- Price min: `#34d399` (emerald)
- Price max: `#f87171` (red)
- Depth fill: `#7c3aed` at 20% opacity

---

## Pages

### `/` — Card Catalogue (`index.astro`)

- `CardSearch` (client:load): fuzzy search via Fuse.js over `cards.json`. Filters the `PriceTable` in real-time.
- `PriceTable` (client:load): sortable table. Columns: thumbnail, name, edition, min, avg, 7d%, trend badge. Click row → navigate to `/cards/{slug}`.
- Data: `{base}data/cards.json`

### `/movers` — Movers (`movers.astro`)

- `MoversList` (client:load): two columns — top 10 gainers / top 10 losers over 7d.
- Data: `{base}data/movers/latest.json`
- **Note:** movers payload only has `card_id` and `name`. To navigate to a card detail, cross-reference `card_id` with `cards.json` to get the `slug`.

### `/cards/[slug]` — Card Detail (`cards/[slug].astro`)

Static paths generated from `public/data/cards.json` at build time (`getStaticPaths`). The `slug` field on each card entry is the URL segment.

- `PriceChart` (client:load): 30-day history. Three line series: avg (solid violet), min (dashed green), max (dashed red). Metadata panel above: card image, edition badge, price stats, 7d% badge.
- `DepthChart` (client:load) **[FEAT-08]**: step-function supply curve. See FEAT-08 section below.
- Data:
  - `{base}data/cards.json` — card metadata + latest prices
  - `{base}data/prices/{card.id}.json` — 30-day history ← **uses numeric id, not slug**
  - `{base}data/depth/{card.id}.json` **[FEAT-08]** — ask-side depth snapshot

### Card images

Images are at `{base}assets/{edition_code}/{card_number}.webp`. The `image_path` field in `cards.json` already contains the relative path (e.g. `"assets/ARC/068A.webp"`), so the full URL is simply:

```ts
const imageUrl = `${base}${card.image_path}`;
```

---

## JSON Data Contracts

All files live under `public/data/` in this repo. Written by ligaprice's `export_and_push_json` activity and committed daily. The **authoritative field-level reference** is [`docs/json-export.md`](docs/json-export.md) in the ligaprice repo.

### `data/cards.json`

Array of all cards with the latest price snapshot and trend signal.

```ts
interface CardSummary {
  id: number;                        // numeric — needed to build prices/ and depth/ URLs
  name: string;                      // display name, e.g. "Vi, Destructive"
  slug: string;                      // URL segment, e.g. "Vi+-+Destructive"
  edition_code: string;              // e.g. "ARC"
  card_number: string;               // e.g. "068A" — leading zeros preserved
  image_path: string | null;         // e.g. "assets/ARC/068A.webp" — prefix with {base}
  latest_price_avg: number | null;   // BRL — average ask today
  latest_price_min: number | null;   // BRL — lowest ask today
  trend: "up" | "down" | "stable" | null;
  pct_change_7d: number | null;      // percentage change vs 7 days ago
  as_of: string | null;             // "YYYY-MM-DD" of the data
}

type CardsPayload = CardSummary[];
```

### `data/prices/{card_id}.json`

Per-card 30-day price history. One file per card, identified by numeric `id` (not slug).

```ts
interface PricePoint {
  date: string;                 // "YYYY-MM-DD", oldest first
  price_min: number | null;
  price_avg: number | null;
  price_max: number | null;
  active_listings: number;
  avg_7d: number | null;        // rolling 7-day average of price_avg
  delta_7d: number | null;      // price_avg today − price_avg 7 days ago (BRL)
  pct_change_7d: number | null; // percentage change vs 7 days ago
}

interface PriceHistory {
  card: {
    id: number;
    name: string;
    edition_code: string;
    card_number: string;
  };
  history: PricePoint[];        // sorted ascending by date, max 30 entries
}
```

`avg_7d`, `delta_7d` and `pct_change_7d` are `null` in early entries where fewer than 7 days of history exist.

### `data/movers/latest.json`

Top 10 gainers and losers over the past 7 days.

```ts
interface Mover {
  card_id: number;              // cross-reference with cards.json for slug/image
  name: string | null;
  pct_change_7d: number;        // positive = gainer, negative = loser
}

interface MoversPayload {
  date: string | null;          // "YYYY-MM-DD"
  top_gainers: Mover[];         // sorted desc by pct_change_7d, max 10
  top_losers: Mover[];          // sorted asc by pct_change_7d, max 10
}
```

To navigate from a mover to its detail page, look up `card_id` in the already-loaded `cards.json` to get the `slug`.

### `data/market/latest.json`

Market-wide summary for the most recent date.

```ts
interface MarketSnapshot {
  date: string;                 // "YYYY-MM-DD"
  cards_with_listings: number;
  median_price: number | null;  // median of all cards' price_avg (BRL)
  mean_price: number | null;    // mean of all cards' price_avg (BRL)
  total_listings: number;
}
```

### `data/depth/{card_id}.json` — [FEAT-08, not yet implemented]

Ask-side order book depth snapshot for one card. Aggregates all editions. Regenerated daily from the most recent crawl's `SellerOffer` rows.

```ts
interface DepthLevel {
  price: number;           // BRL — unit price at this level
  qty: number;             // quantity available at this exact price (all sellers/editions)
  cumulative_qty: number;  // running total from cheapest level upward
}

interface DepthSnapshot {
  card_id: number;
  card_name: string;
  as_of: string;           // "YYYY-MM-DD"
  total_available: number; // sum of all qty values
  levels: DepthLevel[];    // sorted ascending by price; empty array if no offers
}
```

**Interpretation:** `levels[N].price` is the price per card after the `levels[N-1].cumulative_qty` cheapest units are absorbed. The steeper the staircase, the higher the price squeeze potential.

---

## FEAT-08 — Price Depth Chart

### Concept

Each card has multiple sellers listing different quantities at different prices. The depth chart answers: *"If demand increases and buyers absorb the cheapest listings, how fast does the price rise?"*

- **High potential:** few cheap units, then a big jump → easy to squeeze.
- **Low potential:** many cheap units → price is anchored, hard to move.

### `DepthChart` Component (`src/components/DepthChart.tsx`)

Props:
```ts
interface Props {
  cardId: number;
  dataUrl: string;   // e.g. `${base}data/depth/1.json`
}
```

Rendering:
- Fetches `dataUrl` on mount.
- If `levels.length === 0`: show muted placeholder "Sem ofertas disponíveis hoje."
- Otherwise: render a step-line chart using `lightweight-charts`.
  - Chart background / grid colors: same dark palette as `PriceChart`.
  - X axis: cumulative quantity (label: "Unidades acumuladas").
  - Y axis: price in BRL (label: "Preço (R$)").
  - Series: step-line (`LineType.WithSteps` or equivalent in v5).
  - Color: `#7c3aed` (brand violet) with 20% fill area below the line.
  - Crosshair tooltip: "R$X,XX — Y unidades até este preço".
- Below chart: one-sentence summary:
  > *"Comprar as {N} unidades mais baratas elevaria o preço para R$X,XX (+Y%). Total disponível: {total} unidades."*
  - `N` = `levels[0].cumulative_qty`
  - `X,XX` = `levels[1].price`
  - `Y%` = `((levels[1].price - levels[0].price) / levels[0].price * 100).toFixed(1)`
  - If only one price level exists, show only "Total disponível: {total} unidades."

### Integration in `[slug].astro`

```astro
<DepthChart
  client:load
  cardId={card.id}
  dataUrl={`${base}data/depth/${card.id}.json`}
/>
```

Place below the `PriceChart` block with a section heading "Profundidade de preço".

---

## Coding Conventions

- All source identifiers in **English** (variable names, function names, type names, file names).
- User-facing strings in **Portuguese (pt-BR)** — prices, labels, descriptions in the UI.
- TypeScript strict mode — no `any`, no implicit `undefined`.
- No comments unless the WHY is non-obvious.
- Components are function components. No class components.
- `client:load` for all interactive components (they all need browser APIs or fetch).
- Format prices as `R$ X,XX` — use `.toFixed(2)` with manual `R$` prefix (not `Intl.NumberFormat`).
- Do not add new dependencies without a concrete reason — the existing stack (Astro, React, Tailwind, lightweight-charts, Fuse.js) covers all current needs.

---

## Development Setup

```bash
cd ligariftbound-price
npm install
npm run dev       # dev server at localhost:4321
npm run build     # production build → dist/
npm run preview   # preview dist/ locally
```

`getStaticPaths` in `[slug].astro` reads `public/data/cards.json` at build time — this file must exist before running `npm run build`. The existing file in the repo can be used for development.

> **Note:** the sample files currently in `public/data/` use older field names (pre-FEAT-09). Treat `SPEC.md` and `docs/json-export.md` as the authoritative contracts, not the existing sample files.

---

## Deploy (GitHub Actions → GitHub Pages)

The repo uses a GitHub Actions workflow that:
1. Runs `npm run build` (Astro SSG → `dist/`).
2. Publishes `dist/` to GitHub Pages.

Triggered by:
- Push to `main` (when ligaprice pushes new JSON + images daily).
- Manual `workflow_dispatch`.

ligaprice's `export_and_push_json` activity commits and pushes:
- `public/data/` — all JSON files (overwritten daily)
- `public/assets/` — card images (only new files appended; existing unchanged)

---

## Relationship with ligaprice

| ligaprice writes | path in this repo | consumed by |
|---|---|---|
| `cards.json` | `public/data/cards.json` | `index.astro`, `[slug].astro`, `getStaticPaths` |
| `prices/{id}.json` | `public/data/prices/{id}.json` | `PriceChart.tsx` |
| `movers/latest.json` | `public/data/movers/latest.json` | `MoversList.tsx` |
| `market/latest.json` | `public/data/market/latest.json` | *(not yet wired — future)* |
| `depth/{id}.json` | `public/data/depth/{id}.json` | `DepthChart.tsx` [FEAT-08] |
| card images | `public/assets/{EDITION}/{card}.webp` | `PriceTable.tsx`, `PriceChart.tsx` |

---

## V1 Scope

In scope:
- Card catalogue with search and sort
- 30-day price history chart per card
- Top gainers / losers (7d)
- Price depth chart per card [FEAT-08]

Out of scope for V1:
- Server-side rendering or API routes
- User accounts, watchlists, alerts
- Mobile app
- Historical depth snapshots (depth is always "today's snapshot")
- Market summary page (data available, page not wired)
