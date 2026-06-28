export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatVariation(v: number | null): string {
  if (v === null) return '—'
  if (v === 0) return '0%'
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
}

export function variationColor(v: number | null): string {
  if (v === null || v === 0) return 'text-zinc-500'
  return v > 0 ? 'text-emerald-400' : 'text-red-400'
}

export function rarityColor(rarity: string): string {
  switch (rarity) {
    case 'Common': return 'text-zinc-400 border-zinc-600'
    case 'Uncommon': return 'text-emerald-400 border-emerald-700'
    case 'Rare': return 'text-blue-400 border-blue-700'
    case 'Epic': return 'text-purple-400 border-purple-700'
    case 'Showcase': return 'text-gold-400 border-gold-500'
    case 'Promo': return 'text-red-400 border-red-700'
    default: return 'text-zinc-400 border-zinc-600'
  }
}
