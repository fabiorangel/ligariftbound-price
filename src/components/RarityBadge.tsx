import { rarityColor } from '../lib/format'

export default function RarityBadge({ rarity }: { rarity: string }) {
  return (
    <span className={`text-xs font-medium border rounded px-1.5 py-0.5 ${rarityColor(rarity)}`}>
      {rarity}
    </span>
  )
}
