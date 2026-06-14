import { useState, useEffect } from "react";

interface Card {
  slug: string;
  name: string;
  edition_code: string;
  card_number: string;
  price_min: number | null;
  price_avg: number | null;
  price_max: number | null;
  change_7d: number | null;
}

interface Props {
  dataUrl: string;
  base: string;
}

function formatBRL(value: number | null) {
  if (value == null) return <span className="text-[var(--color-muted)]">—</span>;
  return `R$ ${value.toFixed(2)}`;
}

function Change({ value }: { value: number | null }) {
  if (value == null) return <span className="text-[var(--color-muted)]">—</span>;
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        positive
          ? "bg-emerald-400/10 text-emerald-400"
          : "bg-red-400/10 text-red-400"
      }`}
    >
      {positive ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function CardThumb({
  base,
  edition_code,
  card_number,
  name,
}: {
  base: string;
  edition_code: string;
  card_number: string;
  name: string;
}) {
  const src = `${base}assets/${edition_code}/${card_number}.webp`;
  return (
    <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md shadow-md ring-1 ring-white/10">
      <img
        src={src}
        alt={name}
        className="h-full w-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

export default function PriceTable({ dataUrl, base }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [sort, setSort] = useState<{ key: keyof Card; dir: 1 | -1 }>({
    key: "price_avg",
    dir: -1,
  });

  useEffect(() => {
    fetch(dataUrl)
      .then((r) => r.json())
      .then(setCards);
  }, [dataUrl]);

  function toggleSort(key: keyof Card) {
    setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : -1 }));
  }

  const sorted = [...cards].sort((a, b) => {
    const av = a[sort.key] ?? -Infinity;
    const bv = b[sort.key] ?? -Infinity;
    return av < bv ? sort.dir : av > bv ? -sort.dir : 0;
  });

  function SortIcon({ col }: { col: keyof Card }) {
    if (sort.key !== col)
      return <span className="opacity-20 text-[10px]">↕</span>;
    return (
      <span className="text-[var(--color-brand-light)] text-[10px]">
        {sort.dir === -1 ? "▼" : "▲"}
      </span>
    );
  }

  const th = (label: string, col: keyof Card) => (
    <th
      key={col}
      onClick={() => toggleSort(col)}
      className="cursor-pointer select-none px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)] hover:text-[var(--color-brand-light)] transition-colors"
    >
      <span className="flex items-center gap-1.5">
        {label} <SortIcon col={col} />
      </span>
    </th>
  );

  if (!cards.length) {
    return (
      <div className="flex h-40 items-center justify-center text-[var(--color-muted)]">
        Carregando...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <th className="w-16 px-4 py-3" />
            {th("Carta", "name")}
            {th("Edição", "edition_code")}
            {th("Mín", "price_min")}
            {th("Médio", "price_avg")}
            {th("Máx", "price_max")}
            {th("7d", "change_7d")}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {sorted.map((card) => (
            <tr
              key={`${card.edition_code}-${card.card_number}`}
              className="group cursor-pointer bg-[var(--color-surface)] transition-colors hover:bg-[var(--color-surface-2)]"
              onClick={() =>
                (window.location.href = `${base}cards/${card.slug}`)
              }
            >
              <td className="px-4 py-3">
                <div className="transition-transform duration-200 group-hover:scale-105">
                  <CardThumb
                    base={base}
                    edition_code={card.edition_code}
                    card_number={card.card_number}
                    name={card.name}
                  />
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="font-semibold text-white group-hover:text-[var(--color-brand-light)] transition-colors">
                  {card.name}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-surface-3)] px-2 py-1 font-mono text-xs text-[var(--color-muted)]">
                  <span className="text-[var(--color-brand-light)] font-semibold">
                    {card.edition_code}
                  </span>
                  <span className="opacity-40">·</span>
                  {card.card_number}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-[var(--color-muted)]">
                {formatBRL(card.price_min)}
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-base font-bold text-white">
                  {formatBRL(card.price_avg)}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-[var(--color-muted)]">
                {formatBRL(card.price_max)}
              </td>
              <td className="px-4 py-3">
                <Change value={card.change_7d} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
