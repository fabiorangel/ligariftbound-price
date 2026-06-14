import { useEffect, useState } from "react";

interface MarketSnapshot {
  date: string;
  cards_with_listings: number;
  median_price: number | null;
  mean_price: number | null;
  total_listings: number;
}

interface Props {
  dataUrl: string;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-4">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        {label}
      </span>
      <span className="font-mono text-2xl font-bold text-white">{value}</span>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-4">
      <div className="h-2.5 w-24 rounded bg-[var(--color-surface-3)] mb-3" />
      <div className="h-7 w-32 rounded bg-[var(--color-surface-3)]" />
    </div>
  );
}

export default function MarketStats({ dataUrl }: Props) {
  const [data, setData] = useState<MarketSnapshot | null>(null);

  useEffect(() => {
    fetch(dataUrl)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [dataUrl]);

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <StatSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Cartas listadas" value={data.cards_with_listings.toLocaleString("pt-BR")} />
      <Stat
        label="Preço mediano"
        value={data.median_price != null ? `R$ ${data.median_price.toFixed(2)}` : "—"}
      />
      <Stat
        label="Preço médio"
        value={data.mean_price != null ? `R$ ${data.mean_price.toFixed(2)}` : "—"}
      />
      <Stat label="Total de anúncios" value={data.total_listings.toLocaleString("pt-BR")} />
    </div>
  );
}
