import { Link } from 'react-router-dom'
import type { CardData, IndexEntry } from '../types'
import { formatBRL } from '../lib/format'
import VariationBadge from './VariationBadge'

interface Props {
  card: CardData
  price?: IndexEntry
}

export default function CardTile({ card, price }: Props) {
  const base = import.meta.env.BASE_URL

  return (
    <Link
      to={`/card/${encodeURIComponent(card.riftbound_id)}`}
      className="group block rounded-xl overflow-hidden bg-surface-800 border border-surface-600 hover:border-gold-500/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold-400/5"
    >
      <div className="aspect-[744/1039] bg-surface-700 overflow-hidden">
        <img
          src={`${base}${card.image_uri}`}
          alt={card.name}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          loading="lazy"
        />
      </div>

      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold text-zinc-100 leading-tight line-clamp-1">
          {card.name}
        </p>
        <p className="text-xs text-zinc-500">{card.type}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-bold text-zinc-100">
            {price ? formatBRL(price.min_price) : '—'}
          </span>
          {price && <VariationBadge value={price.variation_7d} size="sm" />}
        </div>
      </div>
    </Link>
  )
}
