import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import PriceChart from '../components/PriceChart'
import DepthChart from '../components/DepthChart'
import RarityBadge from '../components/RarityBadge'
import VariationBadge from '../components/VariationBadge'
import { usePrices } from '../hooks/usePrices'
import { useDepth } from '../hooks/useDepth'
import { useEditionCards } from '../hooks/useEditionCards'
import { useIndex } from '../hooks/useIndex'
import { formatBRL } from '../lib/format'
import { useEditions } from '../hooks/useEditions'

export default function Card() {
  const { riftbound_id = '' } = useParams<{ riftbound_id: string }>()
  const id = decodeURIComponent(riftbound_id)
  const editionCode = id.split('-')[0]

  const { data: cards } = useEditionCards(editionCode)
  const { data: prices } = usePrices(editionCode)
  const { data: depth } = useDepth(editionCode)
  const { data: index } = useIndex()
  const { data: editions } = useEditions()

  const card = cards?.find(c => c.riftbound_id === id)

  const activePriceEntry = useMemo(
    () => prices?.find(p => p.riftbound_id === id),
    [prices, id],
  )

  const activeDepthEntry = useMemo(
    () => depth?.find(d => d.riftbound_id === id),
    [depth, id],
  )

  const indexEntry = index?.find(e => e.riftbound_id === id)

  const editionName = editions?.find(e => e.code.toLowerCase() === editionCode)?.name ?? editionCode.toUpperCase()
  const base = import.meta.env.BASE_URL

  if (!card) {
    return (
      <Layout>
        <div className="py-20 text-center text-zinc-500">
          {cards ? 'Carta não encontrada.' : 'Carregando...'}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Card image */}
        <div>
          <div className="rounded-xl overflow-hidden border border-surface-600 shadow-2xl">
            <img
              src={`${base}${card.image_uri}`}
              alt={card.name}
              className="w-full aspect-[744/1039] object-cover"
            />
          </div>
        </div>

        {/* Card info */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  to={`/edition/${editionCode}`}
                  className="text-xs text-zinc-500 hover:text-gold-400 transition-colors uppercase tracking-widest font-semibold"
                >
                  {editionCode.toUpperCase()} · {editionName} · #{card.number}
                </Link>
                <h1 className="mt-1 text-3xl font-bold text-zinc-100">{card.name}</h1>
              </div>
              <RarityBadge rarity={card.rarity} />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-sm text-zinc-400 bg-surface-700 px-2 py-0.5 rounded">
                {card.type}
              </span>
              {card.domain.map(d => (
                <span key={d} className="text-xs text-gold-400 bg-gold-400/10 px-2 py-0.5 rounded border border-gold-500/20">
                  {d}
                </span>
              ))}
              {card.tags.map(t => (
                <span key={t} className="text-xs text-zinc-500 bg-surface-700 px-2 py-0.5 rounded">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Price */}
          {indexEntry && (
            <div className="p-4 rounded-xl bg-surface-800 border border-surface-600">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Preço mínimo</p>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-zinc-100">
                  {formatBRL(indexEntry.min_price)}
                </span>
                <div className="flex gap-2 pb-1">
                  <VariationBadge value={indexEntry.variation_7d} />
                  <span className="text-xs text-zinc-600 self-center">7d</span>
                  <VariationBadge value={indexEntry.variation_30d} />
                  <span className="text-xs text-zinc-600 self-center">30d</span>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {(card.energy !== null || card.power !== null || card.might !== null) && (
            <div className="flex gap-4">
              {card.energy !== null && (
                <div className="text-center p-3 rounded-lg bg-surface-800 border border-surface-600 min-w-[60px]">
                  <p className="text-xs text-zinc-500">Energia</p>
                  <p className="text-xl font-bold text-zinc-100">{card.energy}</p>
                </div>
              )}
              {card.power !== null && (
                <div className="text-center p-3 rounded-lg bg-surface-800 border border-surface-600 min-w-[60px]">
                  <p className="text-xs text-zinc-500">Power</p>
                  <p className="text-xl font-bold text-zinc-100">{card.power}</p>
                </div>
              )}
              {card.might !== null && (
                <div className="text-center p-3 rounded-lg bg-surface-800 border border-surface-600 min-w-[60px]">
                  <p className="text-xs text-zinc-500">Might</p>
                  <p className="text-xl font-bold text-zinc-100">{card.might}</p>
                </div>
              )}
            </div>
          )}

          {/* Card text */}
          {card.card_text && (
            <div className="p-4 rounded-xl bg-surface-800 border border-surface-600">
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                {card.card_text}
              </p>
              {card.flavour && (
                <p className="mt-3 text-xs text-zinc-500 italic border-t border-surface-600 pt-3">
                  {card.flavour}
                </p>
              )}
            </div>
          )}

          {card.artist && (
            <p className="text-xs text-zinc-600">Arte: {card.artist}</p>
          )}

          {/* Price chart */}
          {activePriceEntry && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Histórico de Preço (30d)
              </h2>
              <div className="p-4 rounded-xl bg-surface-800 border border-surface-600">
                <PriceChart series={activePriceEntry.series} />
              </div>
            </div>
          )}

          {/* Depth chart */}
          {activeDepthEntry && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Profundidade de Mercado
              </h2>
              <div className="p-4 rounded-xl bg-surface-800 border border-surface-600">
                <DepthChart entry={activeDepthEntry} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
