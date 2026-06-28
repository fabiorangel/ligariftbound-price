import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import type { PriceSeries } from '../types'
import { formatBRL } from '../lib/format'

export default function PriceChart({ series }: { series: PriceSeries[] }) {
  if (!series.length) return <p className="text-zinc-500 text-sm py-8 text-center">Sem dados</p>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#24242f" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#71717a', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={d => d.slice(5)}
        />
        <YAxis
          tick={{ fill: '#71717a', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `R$${v.toFixed(0)}`}
          width={40}
        />
        <Tooltip
          contentStyle={{ background: '#1a1a24', border: '1px solid #2e2e3a', borderRadius: 8 }}
          labelStyle={{ color: '#a1a1aa', fontSize: 12 }}
          formatter={(v: number) => [formatBRL(v), 'Preço mínimo']}
        />
        <Line
          type="monotone"
          dataKey="min_price"
          stroke="#c9a227"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#c9a227', stroke: '#0a0a0f' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
