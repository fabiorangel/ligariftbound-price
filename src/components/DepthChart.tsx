import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface DepthLevel {
  price: number;
  qty: number;
  cumulative_qty: number;
}

interface DepthSnapshot {
  code: string;
  card_name: string;
  as_of: string;
  total_available: number;
  levels: DepthLevel[];
}

interface Props {
  dataUrl: string;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { qty, price } = payload[0].payload;
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm shadow-2xl">
      <div className="font-mono text-lg font-bold text-white">
        R$ {price.toFixed(2)}
      </div>
      <div className="mt-1 text-xs text-[var(--color-muted)]">
        {qty} unidades acumuladas
      </div>
    </div>
  );
}

export default function DepthChart({ dataUrl }: Props) {
  const [snapshot, setSnapshot] = useState<DepthSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(dataUrl)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<DepthSnapshot>;
      })
      .then(setSnapshot)
      .catch(() => setError(true));
  }, [dataUrl]);

  if (error || (snapshot && snapshot.levels.length === 0)) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-[var(--color-border)] text-[var(--color-muted)] text-sm">
        Sem ofertas disponíveis hoje.
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-[var(--color-border)] text-[var(--color-muted)] text-sm">
        Carregando...
      </div>
    );
  }

  const chartData = snapshot.levels.map((l) => ({
    qty: l.cumulative_qty,
    price: l.price,
  }));

  const levels = snapshot.levels;
  const summary = (() => {
    if (levels.length < 2) {
      return `Total disponível: ${snapshot.total_available} unidades.`;
    }
    const first = levels[0];
    const second = levels[1];
    const jumpPct = (((second.price - first.price) / first.price) * 100).toFixed(1);
    return `Comprar as ${first.cumulative_qty} unidades mais baratas elevaria o preço para R$ ${second.price.toFixed(2)} (+${jumpPct}%). Total disponível: ${snapshot.total_available} unidades.`;
  })();

  return (
    <div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-6 shadow-xl">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 4, right: 24, bottom: 20, left: 8 }}>
            <defs>
              <linearGradient id="depthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e2e42" />
            <XAxis
              dataKey="qty"
              tick={{ fill: "#8888aa", fontSize: 11 }}
              axisLine={{ stroke: "#2e2e42" }}
              tickLine={false}
              label={{
                value: "unidades acumuladas",
                position: "insideBottom",
                fill: "#555570",
                fontSize: 10,
                dy: 18,
              }}
            />
            <YAxis
              tick={{ fill: "#8888aa", fontSize: 11 }}
              tickFormatter={(v) => `R$${Number(v).toFixed(0)}`}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#7c3aed", strokeWidth: 1, strokeDasharray: "4 2" }} />
            <Area
              type="stepAfter"
              dataKey="price"
              stroke="#7c3aed"
              strokeWidth={2}
              fill="url(#depthFill)"
              dot={false}
              activeDot={{ r: 5, fill: "#7c3aed", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-[var(--color-muted)]">{summary}</p>
    </div>
  );
}
