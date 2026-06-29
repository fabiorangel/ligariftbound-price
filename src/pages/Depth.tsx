import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAllDepth } from '../hooks/useAllDepth'
import { useIndex } from '../hooks/useIndex'
import { useEditions } from '../hooks/useEditions'
import { formatBRL, formatVariation, variationColor } from '../lib/format'

function getBasePrice(prices: number[], quantities: number[]): number | null {
  for (let i = 0; i < prices.length; i++) {
    if (quantities[i] > 0) return prices[i]
  }
  return null
}

function getPriceAtDepth(prices: number[], quantities: number[], x: number): number | null {
  let cumQty = 0
  for (let i = 0; i < prices.length; i++) {
    if (quantities[i] === 0) continue
    cumQty += quantities[i]
    if (cumQty >= x) return prices[i]
  }
  return null
}

function imageUri(riftbound_id: string) {
  const edition = riftbound_id.split('-')[0]
  return `images/${edition}/${riftbound_id}.png`
}

type SortCol = 'pct' | 'base' | 'atX'
type SortDir = 'asc' | 'desc'

export default function Depth() {
  const { data: depth } = useAllDepth()
  const { data: index } = useIndex()
  const { data: editions } = useEditions()

  const [xInput, setXInput] = useState(10)
  const [x, setX] = useState(10)
  const [editionFilter, setEditionFilter] = useState('')
  const [hideInsufficient, setHideInsufficient] = useState(true)
  const [sortCol, setSortCol] = useState<SortCol>('pct')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    const t = setTimeout(() => setX(xInput), 150)
    return () => clearTimeout(t)
  }, [xInput])

  const indexMap = useMemo(() => {
    if (!index) return new Map<string, { name: string; edition_code: string }>()
    return new Map(index.map(e => [e.riftbound_id, { name: e.name, edition_code: e.edition_code }]))
  }, [index])

  const rows = useMemo(() => {
    if (!depth) return []
    return depth
      .filter(entry => {
        if (!editionFilter) return true
        return indexMap.get(entry.riftbound_id)?.edition_code === editionFilter
      })
      .map(entry => {
        const base = getBasePrice(entry.prices, entry.quantities)
        const atX = getPriceAtDepth(entry.prices, entry.quantities, x)
        const pct = base !== null && atX !== null ? ((atX - base) / base) * 100 : null
        const meta = indexMap.get(entry.riftbound_id)
        return { entry, base, atX, pct, meta }
      })
      .filter(r => !hideInsufficient || r.pct !== null)
      .sort((a, b) => {
        const dir = sortDir === 'desc' ? -1 : 1
        if (sortCol === 'pct') {
          if (a.pct === null && b.pct === null) return 0
          if (a.pct === null) return 1
          if (b.pct === null) return -1
          return dir * (a.pct - b.pct)
        }
        if (sortCol === 'base') {
          return dir * ((a.base ?? Infinity) - (b.base ?? Infinity))
        }
        return dir * ((a.atX ?? Infinity) - (b.atX ?? Infinity))
      })
  }, [depth, indexMap, x, editionFilter, hideInsufficient, sortCol, sortDir])

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  function sortIndicator(col: SortCol) {
    if (sortCol !== col) return null
    return sortDir === 'desc' ? ' ↓' : ' ↑'
  }

  const loading = !depth || !index

  return (
    <Layout>
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <Link to="/" className="text-zinc-500 hover:text-gold-400 transition-colors text-sm">
          ← Home
        </Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-xl font-bold text-zinc-100">Análise de Profundidade</h1>
        {!loading && (
          <span className="ml-auto text-sm text-zinc-500">{rows.length} cartas</span>
        )}
      </div>

      <p className="text-zinc-500 text-sm mb-5 max-w-xl">
        Qual seria o preço de cada carta se{' '}
        <span className="text-zinc-300 font-medium">{x} unidade{x !== 1 ? 's' : ''}</span>{' '}
        das mais baratas fossem compradas agora? Cartas ordenadas por maior valorização.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-5 p-4 bg-surface-800 rounded-xl border border-surface-600">
        <div className="flex items-center gap-3 flex-1 min-w-52">
          <label className="text-sm text-zinc-400 shrink-0 font-medium">Corte X</label>
          <input
            type="range"
            min={1}
            max={300}
            value={xInput}
            onChange={e => setXInput(Number(e.target.value))}
            className="flex-1 accent-gold-400"
          />
          <input
            type="number"
            min={1}
            max={300}
            value={xInput}
            onChange={e => setXInput(Math.max(1, Math.min(300, Number(e.target.value) || 1)))}
            className="w-16 bg-surface-700 border border-surface-500 rounded px-2 py-1 text-sm text-zinc-100 text-center focus:outline-none focus:border-gold-400"
          />
        </div>

        <select
          value={editionFilter}
          onChange={e => setEditionFilter(e.target.value)}
          className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-gold-400"
        >
          <option value="">Todas as Edições</option>
          {(editions ?? []).map(ed => (
            <option key={ed.code} value={ed.code}>
              {ed.name} ({ed.code})
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideInsufficient}
            onChange={e => setHideInsufficient(e.target.checked)}
            className="accent-gold-400"
          />
          Ocultar supply insuficiente
        </label>
      </div>

      {loading ? (
        <p className="text-zinc-600 text-sm py-10 text-center">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-zinc-600 text-sm py-10 text-center">Nenhuma carta encontrada.</p>
      ) : (
        <div className="space-y-1">
          {/* Column headers */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 text-xs text-zinc-600 uppercase tracking-wide">
            <span className="w-8 shrink-0 text-center">#</span>
            <span className="w-8 shrink-0" />
            <span className="flex-1">Carta</span>
            <button
              onClick={() => toggleSort('base')}
              className={`w-24 text-right transition-colors hover:text-zinc-400 ${sortCol === 'base' ? 'text-gold-400' : ''}`}
            >
              Base{sortIndicator('base')}
            </button>
            <button
              onClick={() => toggleSort('atX')}
              className={`w-24 text-right transition-colors hover:text-zinc-400 ${sortCol === 'atX' ? 'text-gold-400' : ''}`}
            >
              @ {x}{sortIndicator('atX')}
            </button>
            <button
              onClick={() => toggleSort('pct')}
              className={`w-20 text-right transition-colors hover:text-zinc-400 ${sortCol === 'pct' ? 'text-gold-400' : ''}`}
            >
              Variação{sortIndicator('pct')}
            </button>
          </div>

          {rows.map((row, i) => (
            <Link
              key={row.entry.riftbound_id}
              to={`/card/${encodeURIComponent(row.entry.riftbound_id)}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-700/50 hover:bg-surface-700 border border-surface-600/50 hover:border-surface-500 transition-all group"
            >
              <span className="w-8 shrink-0 text-center text-sm text-zinc-600 tabular-nums">
                {i + 1}
              </span>
              <img
                src={`${import.meta.env.BASE_URL}${imageUri(row.entry.riftbound_id)}`}
                alt={row.meta?.name ?? row.entry.riftbound_id}
                className="w-8 shrink-0 rounded aspect-[744/1039] object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-gold-300 transition-colors">
                  {row.meta?.name ?? row.entry.riftbound_id}
                </p>
                <p className="text-xs text-zinc-500">{row.meta?.edition_code ?? '—'}</p>
              </div>
              <span className="hidden sm:block w-24 text-right text-sm text-zinc-400 tabular-nums">
                {row.base !== null ? formatBRL(row.base) : '—'}
              </span>
              <span className="hidden sm:block w-24 text-right text-sm text-zinc-400 tabular-nums">
                {row.atX !== null ? formatBRL(row.atX) : '—'}
              </span>
              <span
                className={`w-20 text-right text-sm font-bold tabular-nums ${variationColor(row.pct)}`}
              >
                {formatVariation(row.pct)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  )
}
