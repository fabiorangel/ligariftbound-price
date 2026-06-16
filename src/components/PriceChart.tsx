import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface HistoryPoint {
  date: string;
  price_min: number | null;
  price_avg: number | null;
  price_max: number | null;
}

interface PriceHistory {
  card: {
    code: string;
    name: string;
    edition_code: string;
    card_number: string;
  };
  history: HistoryPoint[];
}

interface CardMeta {
  code: string;
  slug: string;
  name: string;
  edition_code: string;
  card_number: string;
  latest_price_avg: number | null;
  pct_change_7d: number | null;
}

interface Props {
  code: string;
  slug: string;
  dataUrl: string;
  cardsUrl: string;
  base: string;
}

function formatBRL(v: number | null | undefined) {
  return v != null ? `R$ ${v.toFixed(2)}` : "—";
}

function formatDateShort(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm shadow-2xl">
      <div className="mb-2 font-mono text-xs text-[var(--color-muted)]">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span style={{ color: p.color }}>●</span>
          <span className="text-[var(--color-muted)]">{p.name}:</span>
          <span className="font-mono font-bold" style={{ color: p.color }}>
            {formatBRL(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PriceChart({ code, slug, dataUrl, cardsUrl, base }: Props) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [meta, setMeta] = useState<CardMeta | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(dataUrl).then((r) => r.json()) as Promise<PriceHistory>,
      fetch(cardsUrl).then((r) => r.json()) as Promise<CardMeta[]>,
    ]).then(([priceData, cards]) => {
      setHistory(priceData.history ?? []);
      setMeta(cards.find((c) => c.code === code) ?? null);
    }).catch(() => {});
  }, [dataUrl, cardsUrl, code]);

  const imgSrc = meta
    ? `${base}assets/${meta.edition_code}/${meta.card_number}.webp`
    : null;

  const positive = meta?.pct_change_7d != null && meta.pct_change_7d >= 0;

  const chartData = history.map((p) => ({
    date: formatDateShort(p.date),
    Médio: p.price_avg,
    Mínimo: p.price_min,
    Máximo: p.price_max,
  }));

  return (
    <div>
      <a
        href={base}
        className="mb-6 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-white transition-all"
      >
        ← Todos os preços
      </a>

      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        {imgSrc && (
          <div className="relative h-64 w-44 shrink-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 sm:h-72 sm:w-52">
            <img
              src={imgSrc}
              alt={meta?.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        )}

        <div className="flex flex-1 flex-col justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-md bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-xs">
              <span className="text-[var(--color-brand-light)] font-semibold">
                {meta?.edition_code}
              </span>
              <span className="opacity-40">·</span>
              <span className="text-[var(--color-muted)]">{meta?.card_number}</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">{meta?.name ?? slug}</h1>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { label: "Mínimo", value: history.at(-1)?.price_min ?? null, color: "text-emerald-400" },
              { label: "Médio atual", value: meta?.latest_price_avg ?? null, color: "text-white" },
              { label: "Máximo", value: history.at(-1)?.price_max ?? null, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3"
              >
                <div className="text-xs text-[var(--color-muted)]">{label}</div>
                <div className={`mt-1 font-mono text-lg font-bold ${color}`}>
                  {formatBRL(value)}
                </div>
              </div>
            ))}
          </div>

          {meta?.pct_change_7d != null && (
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
                  positive
                    ? "bg-emerald-400/10 text-emerald-400"
                    : "bg-red-400/10 text-red-400"
                }`}
              >
                {positive ? "▲" : "▼"} {Math.abs(meta.pct_change_7d).toFixed(1)}% nos últimos 7 dias
              </span>
            </div>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="flex h-80 items-center justify-center rounded-2xl border border-[var(--color-border)] text-[var(--color-muted)]">
          Sem dados de histórico ainda.
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-6 shadow-xl">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e2e42" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#8888aa", fontSize: 11 }}
                axisLine={{ stroke: "#2e2e42" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#8888aa", fontSize: 11 }}
                tickFormatter={(v) => `R$${Number(v).toFixed(0)}`}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#7c3aed", strokeWidth: 1, strokeDasharray: "4 2" }} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 16, color: "#8888aa" }}
              />
              <Line
                type="monotone"
                dataKey="Médio"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: "#a78bfa", strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="Mínimo"
                stroke="#34d399"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 4, fill: "#34d399", strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="Máximo"
                stroke="#f87171"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 4, fill: "#f87171", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
