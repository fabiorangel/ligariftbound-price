import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import RarityBadge from '../components/RarityBadge'
import { getSearchIndex, getAllCards } from '../lib/searchIndex'
import type { CardData } from '../types'

const EDITION_CODES = ['OGN', 'UNL', 'SFD', 'OGS', 'OPP', 'PR', 'JDG']
const TYPES = ['Unit', 'Spell', 'Gear', 'Rune', 'Battlefield', 'Legend']
const ALL_DOMAINS = ['Body', 'Calm', 'Chaos', 'Colorless', 'Fury', 'Mind', 'Order']
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Showcase', 'Promo']

const PAGE_SIZE = 48

function toggleFilter(item: string, current: string[], all: string[]): string[] {
  if (current.length === 0) return all.filter(o => o !== item)
  if (current.includes(item)) {
    const next = current.filter(o => o !== item)
    return next.length === 0 ? [] : next
  }
  const next = [...current, item]
  return next.length === all.length ? [] : next
}

function FilterDropdown({
  label, options, selected, onToggle, onOnly,
}: {
  label: string; options: string[]; selected: string[]
  onToggle: (v: string) => void; onOnly: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allSelected = selected.length === 0
  const isChecked = (opt: string) => allSelected || selected.includes(opt)
  const active = !allSelected
  const displayLabel = allSelected
    ? label
    : selected.length === 1
    ? selected[0]
    : `${selected[0]} +${selected.length - 1}`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`text-sm px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-2 ${
          active
            ? 'bg-gold-400/20 border-gold-400/50 text-gold-400'
            : 'border-surface-500 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200'
        }`}
      >
        {displayLabel}
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-surface-800 border border-surface-600 rounded-xl p-1.5 z-20 min-w-[160px] shadow-xl">
          {options.map(opt => {
            const checked = isChecked(opt)
            return (
              <div key={opt} className="group/row flex items-center rounded-lg hover:bg-surface-700">
                <button
                  onClick={() => onToggle(opt)}
                  className={`flex-1 text-left text-sm px-3 py-1.5 flex items-center gap-2.5 transition-colors ${
                    checked ? 'text-gold-400' : 'text-zinc-300 group-hover/row:text-zinc-100'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                    checked ? 'bg-gold-400 border-gold-400' : 'border-zinc-500'
                  }`}>
                    {checked && (
                      <svg className="w-2.5 h-2.5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  {opt}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onOnly(opt) }}
                  className="opacity-0 group-hover/row:opacity-100 text-[11px] text-zinc-500 hover:text-gold-400 hover:border-gold-400/50 border border-zinc-600 rounded px-1.5 py-0.5 mr-2 transition-all"
                >
                  only
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const base = import.meta.env.BASE_URL

  const q = params.get('q') ?? ''
  const filterEditions = params.get('editions')?.split(',').filter(Boolean) ?? []
  const filterTypes = params.get('types')?.split(',').filter(Boolean) ?? []
  const filterDomains = params.get('domains')?.split(',').filter(Boolean) ?? []
  const filterRarities = params.get('rarities')?.split(',').filter(Boolean) ?? []

  const [localQuery, setLocalQuery] = useState(q)
  const [allResults, setAllResults] = useState<CardData[]>([])
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Sync URL → local input when navigating back/forward
  useEffect(() => { setLocalQuery(q) }, [q])

  // Debounced live search: update URL q after 300ms of no typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setParams(prev => {
        const next = new URLSearchParams(prev)
        if (localQuery.trim()) next.set('q', localQuery.trim())
        else next.delete('q')
        return next
      }, { replace: true })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [localQuery])

  const editionsKey = filterEditions.join(',')
  const typesKey = filterTypes.join(',')
  const domainsKey = filterDomains.join(',')
  const raritiesKey = filterRarities.join(',')

  useEffect(() => {
    setLoading(true)
    setDisplayCount(PAGE_SIZE)
    ;(async () => {
      const allCards = await getAllCards()
      let candidates: CardData[]

      if (q.trim()) {
        const idx = await getSearchIndex()
        const searchResults = idx.search(q.trim()) as unknown as { riftbound_id: string }[]
        const rankMap = new Map(searchResults.map((r, i) => [r.riftbound_id, i]))
        candidates = allCards
          .filter(c => rankMap.has(c.riftbound_id))
          .sort((a, b) => rankMap.get(a.riftbound_id)! - rankMap.get(b.riftbound_id)!)
      } else {
        candidates = allCards
      }

      if (filterEditions.length > 0)
        candidates = candidates.filter(c => filterEditions.includes(c.edition_code))
      if (filterTypes.length > 0)
        candidates = candidates.filter(c => filterTypes.includes(c.type))
      if (filterDomains.length > 0)
        candidates = candidates.filter(c => c.domain.some(d => filterDomains.includes(d)))
      if (filterRarities.length > 0)
        candidates = candidates.filter(c => filterRarities.includes(c.rarity))

      setAllResults(candidates)
      setLoading(false)
    })()
  }, [q, editionsKey, typesKey, domainsKey, raritiesKey])

  // Infinite scroll: load more when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setDisplayCount(n => n + PAGE_SIZE) },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading])

  function updateParams(updates: Record<string, string | null>) {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [key, val] of Object.entries(updates)) {
        if (!val) next.delete(key)
        else next.set(key, val)
      }
      return next
    }, { replace: true })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ q: localQuery.trim() || null })
  }

  const toggleEdition = (code: string) =>
    updateParams({ editions: toggleFilter(code, filterEditions, EDITION_CODES).join(',') || null })
  const toggleType = (t: string) =>
    updateParams({ types: toggleFilter(t, filterTypes, TYPES).join(',') || null })
  const toggleDomain = (d: string) =>
    updateParams({ domains: toggleFilter(d, filterDomains, ALL_DOMAINS).join(',') || null })
  const toggleRarity = (r: string) =>
    updateParams({ rarities: toggleFilter(r, filterRarities, RARITIES).join(',') || null })

  const onlyEdition = (code: string) => updateParams({ editions: code })
  const onlyType = (t: string) => updateParams({ types: t })
  const onlyDomain = (d: string) => updateParams({ domains: d })
  const onlyRarity = (r: string) => updateParams({ rarities: r })

  const hasFilters =
    filterEditions.length > 0 || filterTypes.length > 0 ||
    filterDomains.length > 0 || filterRarities.length > 0
  const results = allResults.slice(0, displayCount)
  const hasMore = displayCount < allResults.length

  return (
    <Layout>
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={inputRef}
            value={localQuery}
            onChange={e => setLocalQuery(e.target.value)}
            placeholder="Buscar cartas…"
            className="w-full bg-surface-800 border border-surface-500 rounded-xl pl-9 pr-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-gold-400 transition-colors"
          />
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <FilterDropdown label="Edição"   options={EDITION_CODES} selected={filterEditions} onToggle={toggleEdition} onOnly={onlyEdition} />
        <FilterDropdown label="Tipo"     options={TYPES}         selected={filterTypes}    onToggle={toggleType}    onOnly={onlyType}    />
        <FilterDropdown label="Domain"   options={ALL_DOMAINS}   selected={filterDomains}  onToggle={toggleDomain}  onOnly={onlyDomain}  />
        <FilterDropdown label="Raridade" options={RARITIES}      selected={filterRarities} onToggle={toggleRarity}  onOnly={onlyRarity}  />

        {hasFilters && (
          <button
            onClick={() => updateParams({ editions: null, types: null, domains: null, rarities: null })}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors ml-1"
          >
            Limpar
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-zinc-500 py-10 text-center">Carregando…</p>
      ) : allResults.length === 0 ? (
        <p className="text-zinc-500 py-10 text-center">Nenhuma carta encontrada.</p>
      ) : (
        <>
          <p className="text-sm text-zinc-500 mb-4">
            {allResults.length} cartas
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map(r => (
              <Link
                key={r.riftbound_id}
                to={`/card/${encodeURIComponent(r.riftbound_id)}`}
                className="group block rounded-xl overflow-hidden bg-surface-800 border border-surface-600 hover:border-gold-500/50 transition-all hover:-translate-y-0.5"
              >
                <div className="aspect-[744/1039] bg-surface-700 overflow-hidden">
                  <img
                    src={`${base}${r.image_uri}`}
                    alt={r.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-sm font-semibold text-zinc-100 line-clamp-1">{r.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{r.edition_code}</span>
                    <RarityBadge rarity={r.rarity} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {hasMore && <div ref={sentinelRef} className="h-16" />}
        </>
      )}
    </Layout>
  )
}
