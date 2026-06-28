import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import CardTile from '../components/CardTile'
import { useEditionCards } from '../hooks/useEditionCards'
import { useIndex } from '../hooks/useIndex'
import { type IndexEntry } from '../types'
import { useEditions } from '../hooks/useEditions'

const TYPES = ['Unit', 'Spell', 'Gear', 'Rune', 'Battlefield', 'Legend']
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Showcase', 'Promo']

export default function Edition() {
  const { code = '' } = useParams<{ code: string }>()
  const { data: cards } = useEditionCards(code)
  const { data: index } = useIndex()
  const { data: editions } = useEditions()

  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [rarity, setRarity] = useState('')

  const edition = editions?.find(e => e.code.toLowerCase() === code)

  const priceMap = useMemo(() => {
    if (!index) return new Map<string, IndexEntry>()
    return new Map(
      index
        .filter(e => e.edition_code === code.toUpperCase())
        .map(e => [e.riftbound_id, e]),
    )
  }, [index, code])

  const filtered = useMemo(() => {
    if (!cards) return []
    return cards.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      if (type && c.type !== type) return false
      if (rarity && c.rarity !== rarity) return false
      return true
    })
  }, [cards, search, type, rarity])

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{code.toUpperCase()}</p>
          <h1 className="text-2xl font-bold text-zinc-100">{edition?.name ?? code.toUpperCase()}</h1>
        </div>
        <p className="text-zinc-500 text-sm">{filtered.length} cartas</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Nome da carta…"
          className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-gold-400 transition-colors"
        />

        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-gold-400 transition-colors"
        >
          <option value="">Todos os tipos</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={rarity}
          onChange={e => setRarity(e.target.value)}
          className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-gold-400 transition-colors"
        >
          <option value="">Todas as raridades</option>
          {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

      </div>

      {/* Grid */}
      {!cards ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-surface-800 border border-surface-600 animate-pulse">
              <div className="aspect-[744/1039] bg-surface-700 rounded-t-xl" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-surface-600 rounded w-3/4" />
                <div className="h-3 bg-surface-600 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(card => (
            <CardTile key={card.riftbound_id} card={card} price={priceMap.get(card.riftbound_id)} />
          ))}
        </div>
      )}
    </Layout>
  )
}
