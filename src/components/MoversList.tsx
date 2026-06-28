import { Link } from 'react-router-dom'
import type { IndexEntry } from '../types'
import { formatBRL, formatVariation, variationColor } from '../lib/format'

interface Props {
  entries: IndexEntry[]
}

function imageUri(riftbound_id: string) {
  const edition = riftbound_id.split('-')[0]
  return `images/${edition}/${riftbound_id}.png`
}

export default function MoversList({ entries }: Props) {
  const base = import.meta.env.BASE_URL
  return (
    <div className="space-y-1">
      {entries.map(entry => (
        <Link
          key={entry.riftbound_id}
          to={`/card/${encodeURIComponent(entry.riftbound_id)}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-700/50 hover:bg-surface-700 border border-surface-600/50 hover:border-surface-500 transition-all group"
        >
          <img
            src={`${base}${imageUri(entry.riftbound_id)}`}
            alt={entry.name}
            className="w-8 rounded shrink-0 aspect-[744/1039] object-cover"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-gold-300 transition-colors">
              {entry.name}
            </p>
            <p className="text-xs text-zinc-500">{entry.edition_code}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-zinc-400">{formatBRL(entry.min_price)}</span>
            <span className={`text-sm font-bold tabular-nums w-14 text-right ${variationColor(entry.variation_7d)}`}>
              {formatVariation(entry.variation_7d)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
