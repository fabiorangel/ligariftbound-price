import { useEffect, useState } from "react";

interface Card {
  code: string;
  slug: string;
  name: string;
  edition_code: string;
  card_number: string;
  latest_price_avg: number | null;
  trend: "up" | "down" | "stable" | null;
  pct_change_7d: number | null;
}

interface Props {
  cardsUrl: string;
  base: string;
  limit?: number;
}

function formatBRL(v: number | null) {
  if (v == null) return "—";
  return `R$ ${v.toFixed(2)}`;
}

export default function PotencialList({ cardsUrl, base, limit }: Props) {
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    (fetch(cardsUrl).then((r) => r.json()) as Promise<Card[]>).then((allCards) => {
      const rising = allCards
        .filter((c) => c.trend === "up" && c.pct_change_7d != null && c.pct_change_7d > 0)
        .sort((a, b) => (b.pct_change_7d ?? 0) - (a.pct_change_7d ?? 0));
      setCards(rising);
    });
  }, [cardsUrl]);

  if (!cards.length) {
    return (
      <div className="flex h-40 items-center justify-center text-[var(--color-muted)]">
        Carregando...
      </div>
    );
  }

  const displayed = limit ? cards.slice(0, limit) : cards;

  return (
    <div>
      {limit && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-[var(--color-muted)]">{cards.length} cartas em alta</span>
          <a href={`${base}potencial`} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-brand-light)] transition-colors">
            Ver todas →
          </a>
        </div>
      )}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {displayed.map((card) => {
        const imgSrc = `${base}assets/${card.edition_code}/${card.card_number}.webp`;
        return (
          <a
            key={card.code}
            href={`${base}cards/${card.code}`}
            className="group flex gap-3 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 transition-all hover:border-[var(--color-brand)] hover:bg-[var(--color-surface-3)] hover:shadow-lg hover:shadow-[var(--color-brand)]/10"
          >
            <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg shadow-md ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-105">
              <img
                src={imgSrc}
                alt={card.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-white group-hover:text-[var(--color-brand-light)] transition-colors text-sm">
                {card.name}
              </div>
              <div className="mt-0.5 font-mono text-xs text-[var(--color-muted)]">
                <span className="text-[var(--color-brand-light)]">{card.edition_code}</span>
                {" · "}{card.card_number}
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-white">
                  {formatBRL(card.latest_price_avg)}
                </span>
              </div>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                  ▲ {card.pct_change_7d!.toFixed(1)}% (7d)
                </span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
    </div>
  );
}
