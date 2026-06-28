import { formatVariation, variationColor } from '../lib/format'

interface Props {
  value: number | null
  size?: 'sm' | 'md'
}

export default function VariationBadge({ value, size = 'md' }: Props) {
  const color = variationColor(value)
  const text = formatVariation(value)
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'

  return (
    <span className={`inline-block rounded font-medium tabular-nums ${sizeClass} ${color}`}>
      {text}
    </span>
  )
}
