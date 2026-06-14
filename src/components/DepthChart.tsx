import { useEffect, useRef, useState } from "react";

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

export default function DepthChart({ dataUrl }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!chartRef.current || !snapshot || snapshot.levels.length === 0) return;

    import("lightweight-charts").then(({ createChart, ColorType, LineType }) => {
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
        timeScale: { visible: false },
        width: chartRef.current.clientWidth,
        height: 260,
      });

      const series = chart.addLineSeries({
        color: "#7c3aed",
        lineWidth: 2,
        lineType: LineType.WithSteps,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
        title: "Preço (R$)",
      });

      // lightweight-charts requires time axis; use cumulative_qty as fake time (integer index)
      const data = snapshot.levels.map((l, i) => ({
        time: (i + 1) as unknown as string,
        value: l.price,
        customValues: { cumulative_qty: l.cumulative_qty },
      }));

      series.setData(data);
      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        chart.applyOptions({ width: chartRef.current!.clientWidth });
      });
      ro.observe(chartRef.current);
      return () => ro.disconnect();
    });
  }, [snapshot]);

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
      <div
        ref={chartRef}
        className="w-full overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-xl"
        style={{ minHeight: 260 }}
      />
      <p className="mt-3 text-xs text-[var(--color-muted)]">{summary}</p>
    </div>
  );
}
