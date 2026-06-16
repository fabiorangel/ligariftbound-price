import { useState, useEffect, useMemo } from "react";

interface Card {
  code: string;
  slug: string;
  name: string;
  edition_code: string;
  card_number: string;
  latest_price_min: number | null;
}

interface Props {
  dataUrl: string;
  base: string;
}

function matchesQuery(card: Card, q: string) {
  const lq = q.toLowerCase();
  return (
    card.name.toLowerCase().includes(lq) ||
    card.edition_code.toLowerCase().includes(lq) ||
    card.card_number.toLowerCase().includes(lq)
  );
}

export default function CardSearch({ dataUrl, base }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(dataUrl)
      .then((r) => r.json())
      .then((data: Card[]) => setCards(data));
  }, [dataUrl]);

  const results = useMemo(
    () => (query.trim().length >= 2 ? cards.filter((c) => matchesQuery(c, query)).slice(0, 8) : []),
    [cards, query]
  );

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setOpen(q.trim().length >= 2);
  }

  function handleSelect(card: Card) {
    window.location.href = `${base}cards/${card.code}`;
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-4 shadow-xl transition-colors focus-within:border-[var(--color-brand)] focus-within:shadow-[var(--color-brand)]/20 focus-within:shadow-2xl">
        <svg
          className="h-5 w-5 shrink-0 text-[var(--color-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar carta por nome, edição ou número..."
          className="w-full bg-transparent text-base text-white placeholder-[var(--color-muted)] outline-none"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="shrink-0 text-[var(--color-muted)] hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-2xl shadow-black/60">
          {results.map((card) => {
            const imgSrc = `${base}assets/${card.edition_code}/${card.card_number}.webp`;
            return (
              <li key={card.code}>
                <button
                  onMouseDown={() => handleSelect(card)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-3)]"
                >
                  <div className="h-12 w-8 shrink-0 overflow-hidden rounded-md ring-1 ring-white/10">
                    <img
                      src={imgSrc}
                      alt={card.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <span className="flex-1 text-sm font-medium text-white">{card.name}</span>
                  <div className="shrink-0 flex items-center gap-3">
                    {card.latest_price_min != null && (
                      <span className="font-mono text-sm font-bold text-white">
                        R$ {card.latest_price_min.toFixed(2)}
                      </span>
                    )}
                    <span className="font-mono text-xs text-[var(--color-muted)]">
                      <span className="text-[var(--color-brand-light)]">{card.edition_code}</span>
                      {" · "}{card.card_number}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
