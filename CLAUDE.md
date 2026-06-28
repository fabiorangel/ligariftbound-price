# ligariftbound-price — CLAUDE.md

## Project Overview

Static price tracker site for [LigaRiftbound](https://ligariftbound.com.br) — a Brazilian
TCG marketplace for the Riftbound card game. All data is pre-computed and exported as
JSON files by the **ligaprice** backend (private repo). This repo has zero backend — it
is a pure static site deployed on GitHub Pages.

**Data pipeline (handled by ligaprice, not this repo):**
```
LigaRiftbound → Crawl → Silver (Postgres) → Aggregate → Gold → Export JSON → this repo
```

New JSON files are pushed to this repo daily by the ligaprice worker after each
aggregate run. GitHub Actions deploys the site automatically on every push to `main`.

---

## Tech Stack

| Decision | Value |
|---|---|
| Framework | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS v3 |
| UI components | shadcn/ui |
| Charts | Recharts |
| Routing | React Router v6 (hash routing — required for GitHub Pages) |
| Data fetching | Native `fetch` + `useSWR` for caching |
| Package manager | npm |
| Deploy | GitHub Pages via GitHub Actions |

**Why hash routing:** GitHub Pages serves a 404 for unknown paths (e.g. `/edition/unl`).
Hash routing (`/#/edition/unl`) avoids this entirely — no server config needed.

**Why Recharts:** Best React-native chart library. Composable, responsive, and handles
financial line charts and area charts well out of the box.

---

## Data Files

All JSON files live under `data/` and are fetched at runtime by the front-end.
There is no build-time data processing — fetch and render.

### `data/index.json`

**Purpose:** Global index of all card variants across all editions. Used for the home
page movers and any global search/sort.

**Structure:**
```json
[
  {
    "riftbound_id": "unl-001-219",
    "name": "Arena Kingpin",
    "edition_code": "UNL",
    "foil": false,
    "language": "en",
    "min_price": 0.45,
    "variation_7d": 12.5,
    "variation_30d": -3.2
  }
]
```

- One entry per `(riftbound_id, foil, language)` combination
- `min_price` — cheapest listed price today
- `variation_7d` / `variation_30d` — % change vs 7 or 30 days ago; `null` if
  insufficient history
- ~6000–8000 entries total; load once, sort in memory for movers

**Usage:** Sort by `variation_7d` descending → top gainers; ascending → top losers.

---

### `data/{edition_code}/cards.json`

**Purpose:** Card definitions for one edition. Load when user navigates to an edition
or card page.

**Edition codes (lowercase in filenames):** `ogn`, `unl`, `sfd`, `opp`, `ogs`, `pr`, `jdg`

**Structure:**
```json
[
  {
    "riftbound_id": "unl-001-219",
    "name": "Arena Kingpin",
    "number": "001",
    "edition_code": "UNL",
    "image_uri": "images/unl/unl-001-219.png"
  }
]
```

- `image_uri` — path relative to repo root; prepend `/` or base URL to use as `<img src>`
- `number` — collector number, zero-padded to 3 digits
- One entry per unique card (not per variant — foil/language variants are in prices/depth)

---

### `data/{edition_code}/prices.json`

**Purpose:** 30-day price time series per card variant. Load on card detail page.

**Structure:**
```json
[
  {
    "riftbound_id": "unl-001-219",
    "foil": false,
    "language": "en",
    "variation_7d": 12.5,
    "variation_30d": -3.2,
    "series": [
      { "date": "2026-05-29", "min_price": 0.22 },
      { "date": "2026-05-30", "min_price": 0.20 }
    ]
  }
]
```

- One entry per `(riftbound_id, foil, language)`
- `series` sorted by date ascending (oldest first) — ready for charting
- Up to 30 entries in `series` (rolling window)
- `variation_7d` / `variation_30d` pre-computed — same as in index.json

**Usage:** Filter by `riftbound_id` to get all variants of a card. Pass `series` directly
to Recharts `<LineChart data={series}>`.

---

### `data/{edition_code}/depth.json`

**Purpose:** Market depth snapshot — all seller listings for the most recent crawl date.
Used for the depth chart on the card detail page.

**Structure:**
```json
[
  {
    "riftbound_id": "unl-001-219",
    "foil": false,
    "language": "en",
    "date": "2026-06-28",
    "prices": [0.20, 0.20, 0.23, 0.45, 1.00],
    "quantities": [30, 30, 2, 6, 30]
  }
]
```

- `prices[i]` and `quantities[i]` are parallel arrays — same seller, sorted by price ASC
- `quantities` can be 0 (listing exists but sold out), 2, 6, or 30
- To build a **cumulative depth chart**: compute cumulative sum of quantities at each price
  point and render as a step area chart

**Depth chart recipe:**
```ts
const depthData = entry.prices.map((price, i) => ({
  price,
  cumQty: entry.quantities.slice(0, i + 1).reduce((a, b) => a + b, 0),
}))
// render as <AreaChart> with x=price, y=cumQty, type="stepAfter"
```

---

## Site Pages

### `/` — Home

- **Hero:** site name, brief description
- **Top Movers:** two columns — top 5 gainers and top 5 losers by `variation_7d`
  (source: `index.json`)
- **Editions:** grid of edition cards with name, card count, and a link to the edition page

### `/#/edition/:code` — Edition Page

- Header: edition name + card count
- Filters: foil toggle, language selector (en/zh), name search
- **Card grid:** responsive grid of `<CardTile>` components
  - Card image (`image_uri`)
  - Card name
  - Min price (from `index.json`, filtered by riftbound_id + current foil/language)
  - Variation badge (green/red %)
- Source: `cards.json` + `index.json` (joined on `riftbound_id`)

### `/#/card/:riftbound_id` — Card Detail Page

- Card image (large)
- Card name, edition, collector number
- Variant tabs: foil/non-foil × en/zh (only show tabs that have data)
- **Price history chart:** 30-day line chart (Recharts `<LineChart>`)
  - x: date, y: min_price
  - Source: `prices.json` filtered by riftbound_id + selected variant
- **Market depth chart:** cumulative step area chart (Recharts `<AreaChart>`)
  - x: price, y: cumulative quantity
  - Source: `depth.json` filtered by riftbound_id + selected variant
- Variation badges: 7d and 30d % change

---

## Component Breakdown

```
src/
  components/
    CardTile.tsx         # card image + name + price + variation badge
    VariationBadge.tsx   # green/red % pill
    PriceChart.tsx       # Recharts line chart for price series
    DepthChart.tsx       # Recharts area chart for market depth
    EditionCard.tsx      # edition overview tile for home page
    MoversList.tsx       # top gainers/losers list
  pages/
    Home.tsx
    Edition.tsx
    Card.tsx
  hooks/
    useIndex.ts          # fetch + cache data/index.json
    useEdition.ts        # fetch + cache data/{code}/cards.json
    usePrices.ts         # fetch + cache data/{code}/prices.json
    useDepth.ts          # fetch + cache data/{code}/depth.json
  lib/
    routes.ts            # route definitions
    format.ts            # price formatting, variation display
```

---

## Routing

Use `createHashRouter` from React Router v6:

```ts
const router = createHashRouter([
  { path: "/", element: <Home /> },
  { path: "/edition/:code", element: <Edition /> },
  { path: "/card/:riftbound_id", element: <Card /> },
])
```

`riftbound_id` values contain special characters (`*` for signature cards, `a` for
alternate art). URL-encode when building links:
```ts
encodeURIComponent("unl-229*-219") // → "unl-229*-219" (* is safe in path segments)
```

---

## Image Paths

Images live at `images/{edition_code}/{riftbound_id}.png` relative to repo root.
In the Vite app, reference them as:

```tsx
<img src={`/${card.image_uri}`} alt={card.name} />
```

If the repo is deployed at a sub-path (e.g. `fabiorangel.github.io/ligariftbound-price`),
configure `base` in `vite.config.ts` and use `import.meta.env.BASE_URL` as prefix.

---

## Development Workflow

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## GitHub Actions Deploy

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## Design Guidelines

- **Dark theme** — card games feel better dark; use Tailwind's `dark:` classes or set
  `darkMode: 'class'` with a forced dark root
- **Card images are 744×1039px PNG** — display at consistent aspect ratio (e.g. `aspect-[744/1039]`)
- **Foil cards** — consider a subtle shimmer/gradient overlay to distinguish foil variants
- **Variation badges:** green for positive, red for negative, gray for null/zero
- **Price format:** Brazilian Real — use `R$ 0,45` formatting (`.toLocaleString('pt-BR', ...)`)

---

## Key Constraints

- **Zero backend** — all data is in JSON files; no API calls except fetching those files
- **No build-time data** — do not import JSON at build time; always `fetch()` at runtime
  so that daily data updates (pushed by ligaprice) are reflected without rebuilding
- **GitHub Pages** — static hosting only; hash routing required; configure `base` in
  vite.config.ts to match the repo name if deployed at a sub-path
