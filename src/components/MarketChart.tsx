import { useEffect, useRef, useState } from "react";

interface HistoryPoint {
  date: string;
  median_price: number;
  mean_price: number;
  cards_with_listings: number;
}

interface Props {
  dataUrl: string;
}

export default function MarketChart({ dataUrl }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    fetch(dataUrl)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<HistoryPoint[]>;
      })
      .then(setHistory)
      .catch(() => setUnavailable(true));
  }, [dataUrl]);

  useEffect(() => {
    if (!chartRef.current || !history || history.length === 0) return;

    import("lightweight-charts").then(({ createChart, ColorType }) => {
      if (!chartRef.current) return;
      chartRef.current.innerHTML = "";

      const chart = createChart(chartRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "#16161f" },
          textColor: "#8888aa",
        },
        grid: {
          vertLines: { color: "#2e2e42" },
          horzLines: { color: "#2e2e42" },
        },
        crosshair: { vertLine: { color: "#7c3aed" }, horzLine: { color: "#7c3aed" } },
        rightPriceScale: { borderColor: "#2e2e42" },
        timeScale: { borderColor: "#2e2e42", timeVisible: false },
        width: chartRef.current.clientWidth,
        height: 200,
      });

      const median = chart.addLineSeries({
        color: "#34d399",
        lineWidth: 2,
        title: "Mediana",
      });
      const mean = chart.addLineSeries({
        color: "#a78bfa",
        lineWidth: 2,
        title: "Média",
      });

      median.setData(history.map((p) => ({ time: p.date as string, value: p.median_price })));
      mean.setData(history.map((p) => ({ time: p.date as string, value: p.mean_price })));

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        chart.applyOptions({ width: chartRef.current!.clientWidth });
      });
      ro.observe(chartRef.current);
      return () => ro.disconnect();
    });
  }, [history]);

  if (unavailable) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-[var(--color-border)] text-sm text-[var(--color-muted)]">
        Evolução histórica disponível em breve.
      </div>
    );
  }

  if (!history) {
    return (
      <div className="h-[200px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] animate-pulse" />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-[var(--color-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full bg-emerald-400" />
          Mediana
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full bg-[var(--color-brand-light)]" />
          Média
        </span>
      </div>
      <div
        ref={chartRef}
        className="w-full overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-xl"
        style={{ minHeight: 200 }}
      />
    </div>
  );
}
