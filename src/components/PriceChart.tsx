import { useEffect, useRef, useState } from "react";

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

function formatBRL(v: number | null) {
  return v != null ? `R$ ${v.toFixed(2)}` : "—";
}

export default function PriceChart({ code, slug, dataUrl, cardsUrl, base }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!chartRef.current || history.length === 0) return;

    import("lightweight-charts").then(({ createChart, ColorType, LineStyle }) => {
      if (!chartRef.current) return;
      chartRef.current.innerHTML = "";

      const chart = createChart(chartRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "#1a1a24" },
          textColor: "#8888aa",
        },
        grid: {
          vertLines: { color: "#2e2e42" },
          horzLines: { color: "#2e2e42" },
        },
        crosshair: { vertLine: { color: "#7c3aed" }, horzLine: { color: "#7c3aed" } },
        rightPriceScale: { borderColor: "#2e2e42" },
        timeScale: { borderColor: "#2e2e42", timeVisible: true },
        width: chartRef.current.clientWidth,
        height: 320,
      });

      const avg = chart.addLineSeries({
        color: "#a78bfa",
        lineWidth: 2,
        title: "Médio",
      });
      const min = chart.addLineSeries({
        color: "#34d399",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "Mín",
      });
      const max = chart.addLineSeries({
        color: "#f87171",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "Máx",
      });

      const toPoint = (p: HistoryPoint, key: keyof HistoryPoint) => ({
        time: p.date as string,
        value: (p[key] ?? 0) as number,
      });

      avg.setData(history.filter((p) => p.price_avg != null).map((p) => toPoint(p, "price_avg")));
      min.setData(history.filter((p) => p.price_min != null).map((p) => toPoint(p, "price_min")));
      max.setData(history.filter((p) => p.price_max != null).map((p) => toPoint(p, "price_max")));

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        chart.applyOptions({ width: chartRef.current!.clientWidth });
      });
      ro.observe(chartRef.current);
      return () => ro.disconnect();
    });
  }, [history]);

  const imgSrc = meta
    ? `${base}assets/${meta.edition_code}/${meta.card_number}.webp`
    : null;

  const positive = meta?.pct_change_7d != null && meta.pct_change_7d >= 0;

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

      <div
        ref={chartRef}
        className="w-full overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-xl"
        style={{ minHeight: 320 }}
      />

      {history.length === 0 && (
        <div className="flex h-80 items-center justify-center rounded-2xl border border-[var(--color-border)] text-[var(--color-muted)]">
          Sem dados de histórico ainda.
        </div>
      )}
    </div>
  );
}
