import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import type { DepthEntry } from '../types'
import { formatBRL } from '../lib/format'

export default function DepthChart({ entry }: { entry: DepthEntry }) {
  const data = entry.prices.map((price, i) => ({
    price,
    cumQty: entry.quantities.slice(0, i + 1).reduce((a, b) => a + b, 0),
  }))

  if (!data.length) return <p className="text-zinc-500 text-sm py-8 text-center">Sem dados</p>

  // Adiciona ponto inicial em qty=0 para o gráfico começar na origem
  const chartData = [{ price: data[0].price, cumQty: 0 }, ...data]

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="depthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c9a227" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#c9a227" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#24242f" />
        <XAxis
          dataKey="cumQty"
          type="number"
          tick={{ fill: '#71717a', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          dataKey="price"
          type="number"
          domain={['dataMin', 'dataMax']}
          tick={{ fill: '#71717a', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `R$${Number(v).toFixed(2)}`}
          width={52}
        />
        <Tooltip
          contentStyle={{ background: '#1a1a24', border: '1px solid #2e2e3a', borderRadius: 8 }}
          labelFormatter={v => `${v} unidades`}
          formatter={(v: number) => [formatBRL(v), 'Preço']}
        />
        <Area
          type="stepAfter"
          dataKey="price"
          stroke="#c9a227"
          strokeWidth={2}
          fill="url(#depthGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
