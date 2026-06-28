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
| Search | MiniSearch |
| Routing | React Router v6 (hash routing — required for GitHub Pages) |
| Data fetching | Native `fetch` + `useSWR` for caching |
| Package manager | npm |
| Deploy | GitHub Pages via GitHub Actions |

**Why hash routing:** GitHub Pages serves a 404 for unknown paths (e.g. `/edition/unl`).
Hash routing (`/#/edition/unl`) avoids this entirely — no server config needed.

**Why Recharts:** Best React-native chart library. Composable, responsive, and handles
financial line charts and area charts well out of the box.

**Why MiniSearch:** Lightweight full-text search that runs entirely in the browser.
Supports field weights, fuzzy matching, and filtering — ideal for indexing all card
fields without a backend.

---

## Data Files

All JSON files live under `data/` and are fetched at runtime by the front-end.
There is no build-time data processing — fetch and render.

### `data/index.json`

**Purpose:** Global index of all card variants across all editions. Used for the home
page movers, global search, and cross-edition sorting.

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
- `variation_7d` / `variation_30d` — % change vs 7 or 30 days ago; `null` if insufficient history
- ~6000–8000 entries total; load once, sort in memory for movers

**Usage:** Sort by `variation_7d` descending → top gainers; ascending → top losers.
Join with `cards.json` on `riftbound_id` to get card details for display.

---

### `data/{edition_code}/cards.json`

**Purpose:** Full card definitions for one edition — all fields from the card catalog.
This is the primary source for search indexing and card detail pages.

**Edition codes (lowercase in filenames):** `ogn`, `unl`, `sfd`, `opp`, `ogs`, `pr`, `jdg`

**Structure:**
```json
[
  {
    "riftbound_id": "unl-001-219",
    "name": "Arena Kingpin",
    "number": "001",
    "edition_code": "UNL",
    "image_uri": "images/unl/unl-001-219.png",
    "type": "Unit",
    "rarity": "Rare",
    "energy": 3,
    "power": 4,
    "might": 2,
    "artist": "Jane Doe",
    "flavour": "Born from fire, tempered in victory.",
    "domain": ["Fire", "Order"],
    "supertype": null,
    "tags": ["Warrior", "Champion"],
    "card_text": "When Arena Kingpin attacks, deal 1 damage to target unit.",
    "overnumbered": false,
    "alternate_art": false
  }
]
```

**Field reference:**

| Field | Type | Description |
|---|---|---|
| `riftbound_id` | string | Unique card ID — `{edition}-{number}-{set_id}` |
| `name` | string | Card name |
| `number` | string | Collector number, zero-padded to 3 digits |
| `edition_code` | string | Edition code (uppercase, e.g. `UNL`) |
| `image_uri` | string | Path relative to repo root → use as `/{image_uri}` |
| `type` | string | `Unit`, `Spell`, `Gear`, `Rune`, `Battlefield`, or `Legend` |
| `rarity` | string | `Common`, `Uncommon`, `Rare`, `Epic`, `Showcase`, or `Promo` |
| `energy` | int\|null | Energy cost |
| `power` | int\|null | Power stat (Units only) |
| `might` | int\|null | Might stat (Units only) |
| `artist` | string\|null | Illustration artist |
| `flavour` | string\|null | Flavour text |
| `domain` | string[] | Domains (e.g. `["Fire", "Order"]`), may be empty |
| `supertype` | string\|null | Supertype if any |
| `tags` | string[] | Tags/subtypes, may be empty |
| `card_text` | string\|null | Full card text / ability description |
| `overnumbered` | boolean | True if card number exceeds set size |
| `alternate_art` | boolean | True if this is an alternate art version |

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
- `variation_7d` / `variation_30d` pre-computed

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
  (source: `index.json`, sort in memory)
- **Editions:** grid of edition cards with name, card count, link to edition page

### `/#/edition/:code` — Edition Page

- Header: edition name + card count
- Filters: foil toggle, language selector (en/zh), type filter, rarity filter, name search
- **Card grid:** responsive grid of `<CardTile>` components
  - Card image (`image_uri`)
  - Card name, type badge, rarity badge
  - Min price + variation badge (from `index.json`, joined on `riftbound_id`)
- Source: `cards.json` + `index.json` (joined on `riftbound_id`)

### `/#/card/:riftbound_id` — Card Detail Page

- Card image (large, `aspect-[744/1039]`)
- Card name, edition, collector number, type, rarity
- Full card text, flavour text, stats (energy/power/might), domains, tags, artist
- Variant tabs: foil/non-foil × en/zh (only show tabs that have price data)
- **Price history chart:** 30-day line chart (Recharts `<LineChart>`)
  - x: date, y: min_price
  - Source: `prices.json` filtered by riftbound_id + selected variant
- **Market depth chart:** cumulative step area chart (Recharts `<AreaChart>`)
  - x: price, y: cumulative quantity
  - Source: `depth.json` filtered by riftbound_id + selected variant
- Variation badges: 7d and 30d % change

### `/#/search?q=` — Search Page

- Full-text search across all card fields using MiniSearch
- Search index built from all `cards.json` files on first load, cached in memory
- Results show card tiles with edition badge; click → card detail page
- See **Search** section below for index configuration

---

## Search

Use **MiniSearch** for client-side full-text search across all card fields.

```ts
import MiniSearch from 'minisearch'

const search = new MiniSearch({
  fields: ['name', 'card_text', 'flavour', 'tags', 'domain', 'type', 'rarity',
           'supertype', 'artist'],
  storeFields: ['riftbound_id', 'name', 'edition_code', 'image_uri', 'type',
                'rarity', 'number'],
  searchOptions: {
    boost: { name: 3, card_text: 2, tags: 2, domain: 1.5 },
    fuzzy: 0.2,
    prefix: true,
  },
})
```

**Building the index:** Fetch all `cards.json` files in parallel on first app load.
Store the built index in a module-level variable (not React state) so it persists
across navigation without rebuilding.

```ts
// lib/searchIndex.ts
let index: MiniSearch | null = null

export async function getSearchIndex(): Promise<MiniSearch> {
  if (index) return index
  const editions = ['ogn', 'unl', 'sfd', 'opp', 'ogs', 'pr', 'jdg']
  const allCards = (await Promise.all(
    editions.map(ed => fetch(`/data/${ed}/cards.json`).then(r => r.json()))
  )).flat()
  index = new MiniSearch({ ... })
  index.addAll(allCards)
  return index
}
```

**Array fields** (`tags`, `domain`): MiniSearch handles arrays natively when you join
them as strings before indexing, or use `extractField`:
```ts
extractField: (doc, field) =>
  Array.isArray(doc[field]) ? doc[field].join(' ') : doc[field]
```

---

## Component Breakdown

```
src/
  components/
    CardTile.tsx         # card image + name + price + variation badge
    VariationBadge.tsx   # green/red/gray % pill
    RarityBadge.tsx      # color-coded rarity label
    PriceChart.tsx       # Recharts line chart for price series
    DepthChart.tsx       # Recharts area chart for market depth
    EditionCard.tsx      # edition overview tile for home page
    MoversList.tsx       # top gainers/losers list
    SearchBar.tsx        # global search input with keyboard shortcut (Cmd+K)
  pages/
    Home.tsx
    Edition.tsx
    Card.tsx
    Search.tsx
  hooks/
    useIndex.ts          # fetch + cache data/index.json
    useEditionCards.ts   # fetch + cache data/{code}/cards.json
    usePrices.ts         # fetch + cache data/{code}/prices.json
    useDepth.ts          # fetch + cache data/{code}/depth.json
  lib/
    searchIndex.ts       # MiniSearch singleton — build once, reuse
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
  { path: "/search", element: <Search /> },
])
```

`riftbound_id` values may contain `*` (signature cards) and `a`/`b` suffixes
(alternate art). These are safe in URL path segments but use `encodeURIComponent`
when building query strings.

---

## Image Paths

Images live at `images/{edition_code}/{riftbound_id}.png` relative to repo root.
In the Vite app, reference them as:

```tsx
<img src={`${import.meta.env.BASE_URL}${card.image_uri}`} alt={card.name} />
```

Configure `base` in `vite.config.ts` to match the GitHub Pages deployment path:
```ts
// vite.config.ts
export default defineConfig({
  base: '/ligariftbound-price/',
})
```

---

## Development Workflow

```bash
npm install
npm run dev      # dev server at localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build
```

---

## GitHub Actions Deploy

`.github/workflows/deploy.yml`:

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

**Important:** GitHub Pages must be configured to serve from the `gh-pages` branch
(Settings → Pages → Source: Deploy from branch → `gh-pages`).

---

## Design Guidelines

- **Dark theme** — card games feel better dark; force dark mode at the root element
- **Card images are 744×1039px PNG** — always use `aspect-[744/1039]` to avoid layout shift
- **Foil cards** — subtle shimmer CSS animation (`@keyframes shimmer`) to distinguish foil
- **Variation badges:** green (`text-green-400`) positive, red (`text-red-400`) negative,
  gray (`text-gray-400`) for null/zero
- **Price format:** `R$ 0,45` — use `.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`
- **Rarity colors:** Common → gray, Uncommon → green, Rare → blue, Epic → purple,
  Showcase → gold, Promo → red

---

## Key Constraints

- **Zero backend** — all data is in JSON files; no API calls except fetching those files
- **No build-time data** — always `fetch()` at runtime so daily updates are reflected
  without a rebuild of the site
- **GitHub Pages** — static hosting; hash routing required; `base` must match repo name
- **Search index** — build once on first load, never rebuild during the session
