# FEAT-01 — Depth Cut Analysis Page

## Status

In Progress

---

## Overview

Add a new page (`/#/depth`) that lets the user input a depth cut value **X** and instantly see all card variants ranked by **% price increase** when the X cheapest available units are absorbed from the market.

The goal is to answer: *"Which cards would appreciate the most if X copies were bought up right now?"*

No new JSON export is needed — the page reuses the existing `data/{edition}/depth.json` files already shipped by the ligaprice backend.

---

## Algorithm

For each card variant (one entry in any `depth.json`):

1. **Base price** — the price of the cheapest listing with `qty > 0`.
2. **Walk** through `prices[i]` / `quantities[i]` in order (already sorted ASC by price).
   - Skip listings where `quantities[i] === 0` (sold out, contribute no supply).
   - Accumulate `cumulativeQty += quantities[i]`.
3. **Price at depth X** — the `prices[i]` of the first listing reached when `cumulativeQty >= X`.
4. **% change** — `(priceAtX - basePrice) / basePrice * 100`.
5. If the card's total available supply < X, mark it as **"mercado insuficiente"** and exclude it from the ranking (or show it separately at the bottom).

```ts
function priceAtDepth(
  prices: number[],
  quantities: number[],
  x: number,
): number | null {
  let cumQty = 0
  for (let i = 0; i < prices.length; i++) {
    if (quantities[i] === 0) continue
    cumQty += quantities[i]
    if (cumQty >= x) return prices[i]
  }
  return null // insufficient supply
}

function basePrice(prices: number[], quantities: number[]): number | null {
  for (let i = 0; i < prices.length; i++) {
    if (quantities[i] > 0) return prices[i]
  }
  return null
}
```

---

## Data Source

Reuses **all existing** `data/{edition}/depth.json` files — no new backend work required.

| Edition | Entries |
|---------|---------|
| `ogn`   | 346     |
| `unl`   | 278     |
| `sfd`   | 282     |
| `opp`   | 74      |
| `ogs`   | 24      |
| `pr`    | 7       |
| `jdg`   | 0       |
| **Total** | **~1011** |

Load all depth files in parallel on first visit to the page; cache in a module-level variable so navigation away and back doesn't re-fetch.

To resolve card names, join on `riftbound_id` with the global `data/index.json` (already loaded by other pages).

---

## Route

```
/#/depth
```

Add to `createHashRouter` in `src/lib/routes.ts`:
```ts
{ path: "/depth", element: <Depth /> }
```

Add a nav link "Análise de Profundidade" (or "Profundidade") alongside the existing navigation items in `Layout`.

---

## Page Layout

```
┌─────────────────────────────────────────────────────┐
│  Análise de Profundidade                            │
│  Qual o impacto no preço se X unidades forem        │
│  compradas agora?                                   │
│                                                     │
│  Corte X:  [────●───────────]  10   (slider 1–300)  │
│                                                     │
│  Filtros: [ Todas as Edições ▾ ] [ Foil ▾ ] [ Idioma ▾ ] │
│  ☐ Ocultar cartas com supply insuficiente           │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ #  Carta         Ed.  Base   @X    Variação   │   │
│  │ 1  Arena Kingpin UNL  R$0,18 R$0,45  +150%   │   │
│  │ 2  ...                                       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Controls

| Control | Details |
|---|---|
| **Slider X** | Range 1–300, default 10. Also accepts typed number input beside it. Debounce 150 ms so the table doesn't recompute on every keystroke. |
| **Edition filter** | Multi-select. Default: all editions. |
| **Foil filter** | Dropdown: Todos / Foil / Normal. Default: Todos. |
| **Language filter** | Dropdown: Todos / en / zh. Default: Todos. |
| **Ocultar supply insuficiente** | Checkbox. Default: checked (cleaner ranking). |

### Table

Columns:
1. **#** — rank position (1-indexed)
2. **Carta** — card name (from `index.json`) + riftbound_id as subtitle; clicking navigates to `/#/card/:riftbound_id`
3. **Ed.** — edition badge (e.g. `UNL`)
4. **Foil** — foil indicator icon (only shown when "Todos" is selected)
5. **Base** — cheapest current listing (R$ format)
6. **@ X** — price after absorbing X units (R$ format)
7. **Variação** — `VariationBadge` with % change, always positive here (green)

Sort: descending by **Variação** by default. Allow clicking column headers to re-sort.

Cards with insufficient supply are shown at the bottom with a gray "—" in the `@ X` and `Variação` columns when the checkbox is unchecked; hidden when checked.

---

## New Files

| File | Purpose |
|---|---|
| `src/pages/Depth.tsx` | Page component — controls + table |
| `src/hooks/useAllDepth.ts` | Fetches all `depth.json` files in parallel, merges into one array, caches in module variable |

### `useAllDepth.ts` sketch

```ts
// src/hooks/useAllDepth.ts
import useSWR from 'swr'

const EDITIONS = ['ogn', 'unl', 'sfd', 'opp', 'ogs', 'pr', 'jdg']

type DepthEntry = {
  riftbound_id: string
  foil: boolean
  language: string
  date: string
  prices: number[]
  quantities: number[]
}

let cached: DepthEntry[] | null = null

async function fetchAllDepth(): Promise<DepthEntry[]> {
  if (cached) return cached
  const results = await Promise.all(
    EDITIONS.map(ed =>
      fetch(`${import.meta.env.BASE_URL}data/${ed}/depth.json`)
        .then(r => r.json())
        .catch(() => [])
    )
  )
  cached = results.flat()
  return cached
}

export function useAllDepth() {
  return useSWR<DepthEntry[]>('all-depth', fetchAllDepth)
}
```

---

## Existing Files to Modify

| File | Change |
|---|---|
| `src/lib/routes.ts` | Add `{ path: "/depth", element: <Depth /> }` |
| `src/components/Layout.tsx` | Add "Profundidade" nav link pointing to `/#/depth` |

---

## Reused Components

- `VariationBadge` — for the % change column
- `Layout` — page wrapper
- `useIndex` — to resolve `riftbound_id` → card name + edition
- `format.ts` — `formatPrice()` for R$ display

---

## Performance Notes

- ~1011 entries × 2 arrays each is trivially small. All sorting and filtering runs in-memory, no pagination needed.
- The `priceAtDepth` computation for all entries at a given X is O(n × avg_listings_per_card) — well under 1 ms on any modern device.
- Debounce the slider at 150 ms to avoid redundant renders while dragging.
- No virtualisation needed for ~1011 rows (browser handles it fine).

---

## Out of Scope

- Pre-computing depth curves at multiple X values — unnecessary given front-end performance.
- Exporting the ranking as CSV — future feature if requested.
- Historical comparison (e.g., "depth analysis 7 days ago") — out of scope; depth is a today-snapshot.
