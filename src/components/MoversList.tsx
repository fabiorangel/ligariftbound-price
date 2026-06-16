import { useEffect, useState } from "react";

interface Mover {
  code: string;
  name: string | null;
  pct_change_7d: number;
}

interface MoversPayload {
  date: string | null;
  top_gainers: Mover[];
  top_losers: Mover[];
}

interface CardMeta {
  code: string;
  slug: string;
  edition_code: string;
  card_number: string;
  latest_price_min: number | null;
  pct_change_7d: number | null;
}

interface EnrichedMover {
  code: string;
  name: string;
  slug: string;
  edition_code: string;
  card_number: string;
  price_min_today: number | null;
  price_min_7d_ago: number | null;
  pct_change_7d: number;
}

interface Props {
  dataUrl: string;
  cardsUrl: string;
  base: string;
  limit?: number;
}

function formatBRL(v: number | null) {
  if (v == null) return "—";
  return `R$ ${v.toFixed(2)}`;
}

function enrich(mover: Mover, cardMap: Map<string, CardMeta>): EnrichedMover | null {
  const card = cardMap.get(mover.code);
  if (!card) return null;
  const price_min_today = card.latest_price_min;
  const price_min_7d_ago =
    price_min_today != null
      ? price_min_today / (1 + mover.pct_change_7d / 100)
      : null;
  return {
    code: mover.code,
    name: mover.name ?? card.edition_code + " " + card.card_number,
    slug: card.slug,
    edition_code: card.edition_code,
    card_number: card.card_number,
    price_min_today,
    price_min_7d_ago,
    pct_change_7d: mover.pct_change_7d,
  };
}

export default function MoversList({ dataUrl, cardsUrl, base, limit }: Props) {
  const [gainers, setGainers] = useState<EnrichedMover[]>([]);
  const [losers, setLosers] = useState<EnrichedMover[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(dataUrl).then((r) => r.json()) as Promise<MoversPayload>,
      fetch(cardsUrl).then((r) => r.json()) as Promise<CardMeta[]>,
    ]).then(([movers, cards]) => {
      const cardMap = new Map(cards.map((c) => [c.code, c]));
      setGainers(
        movers.top_gainers
          .map((m) => enrich(m, cardMap))
          .filter((m): m is EnrichedMover => m !== null)
      );
      setLosers(
        movers.top_losers
          .map((m) => enrich(m, cardMap))
          .filter((m): m is EnrichedMover => m !== null)
      );
    });
  }, [dataUrl, cardsUrl]);

  function MoverCard({ mover, positive }: { mover: EnrichedMover; positive: boolean }) {
    const imgSrc = `${base}assets/${mover.edition_code}/${mover.card_number}.webp`;
    return (
      <a
        href={`${base}cards/${mover.code}`}
        className="group flex items-center gap-4 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 transition-all hover:border-[var(--color-brand)] hover:bg-[var(--color-surface-3)] hover:shadow-lg hover:shadow-[var(--color-brand)]/10"
      >
        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg shadow-md ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-105">
          <img
            src={imgSrc}
            alt={mover.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-white group-hover:text-[var(--color-brand-light)] transition-colors">
            {mover.name}
          </div>
          <div className="mt-0.5 font-mono text-xs text-[var(--color-muted)]">
            <span className="text-[var(--color-brand-light)]">{mover.edition_code}</span>
            {" · "}{mover.card_number}
          </div>
          <div className="mt-2 font-mono text-xs text-[var(--color-muted)]">
            {formatBRL(mover.price_min_7d_ago)}
            <span className="mx-1.5 opacity-40">→</span>
            <span className="text-white font-semibold">{formatBRL(mover.price_min_today)}</span>
          </div>
        </div>
        <div
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${
            positive
              ? "bg-emerald-400/10 text-emerald-400"
              : "bg-red-400/10 text-red-400"
          }`}
        >
          {positive ? "▲" : "▼"} {Math.abs(mover.pct_change_7d).toFixed(1)}%
        </div>
      </a>
    );
  }

  if (!gainers.length && !losers.length) {
    return (
      <div className="flex h-40 items-center justify-center text-[var(--color-muted)]">
        Carregando...
      </div>
    );
  }

  const displayedGainers = limit ? gainers.slice(0, limit) : gainers;
  const displayedLosers = limit ? losers.slice(0, limit) : losers;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/10 text-xs">▲</span>
            Maiores altas (7d)
          </h2>
          {limit && (
            <a href={`${base}movers`} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-brand-light)] transition-colors">
              Ver todos →
            </a>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {displayedGainers.map((m) => (
            <MoverCard key={m.code} mover={m} positive />
          ))}
        </div>
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-red-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-400/10 text-xs">▼</span>
            Maiores baixas (7d)
          </h2>
          {limit && (
            <a href={`${base}movers`} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-brand-light)] transition-colors">
              Ver todos →
            </a>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {displayedLosers.map((m) => (
            <MoverCard key={m.code} mover={m} positive={false} />
          ))}
        </div>
      </section>
    </div>
  );
}
