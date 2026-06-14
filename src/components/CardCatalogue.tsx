import { useState, useEffect, useRef } from "react";
import Fuse from "fuse.js";

interface Card {
  code: string;
  slug: string;
  name: string;
  edition_code: string;
  card_number: string;
  image_path: string | null;
  latest_price_avg: number | null;
  latest_price_min: number | null;
  trend: "up" | "down" | "stable" | null;
  pct_change_7d: number | null;
  as_of: string | null;
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

export default function CardCatalogue({ dataUrl, base }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownResults, setDropdownResults] = useState<Card[]>([]);
  const [sort, setSort] = useState<{ key: keyof Card; dir: 1 | -1 }>({
    key: "latest_price_avg",
    dir: -1,
  });
  const fuseRef = useRef<Fuse<Card> | null>(null);

  useEffect(() => {
    fetch(dataUrl)
      .then((r) => r.json())
      .then((data: Card[]) => {
        setCards(data);
        fuseRef.current = new Fuse(data, {
          keys: ["name", "edition_code", "card_number"],
          threshold: 0.3,
          minMatchCharLength: 2,
        });
      });
  }, [dataUrl]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (!q.trim() || !fuseRef.current) {
      setDropdownResults([]);
      setDropdownOpen(false);
      return;
    }
    const hits = fuseRef.current.search(q).slice(0, 8).map((r) => r.item);
    setDropdownResults(hits);
    setDropdownOpen(hits.length > 0);
  }

  function handleSelect(card: Card) {
    window.location.href = `${base}cards/${card.code}`;
  }

  function toggleSort(key: keyof Card) {
    setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : -1 }));
  }

  const filtered = query.trim() && fuseRef.current
    ? fuseRef.current.search(query).map((r) => r.item)
    : cards;

  const sorted = [...filtered].sort((a, b) => {
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
    <div>
      {/* Search */}
      <div className="relative mb-8 max-w-lg">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 shadow-lg transition-colors focus-within:border-[var(--color-brand)] focus-within:shadow-[var(--color-brand)]/20 focus-within:shadow-xl">
          <svg
            className="h-4 w-4 shrink-0 text-[var(--color-muted)]"
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
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            onFocus={() => dropdownResults.length > 0 && setDropdownOpen(true)}
            placeholder="Buscar carta..."
            className="w-full bg-transparent text-sm text-white placeholder-[var(--color-muted)] outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setDropdownResults([]);
                setDropdownOpen(false);
              }}
              className="shrink-0 text-[var(--color-muted)] hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        {dropdownOpen && (
          <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-2xl shadow-black/50">
            {dropdownResults.map((card) => {
              const imgSrc = `${base}assets/${card.edition_code}/${card.card_number}.webp`;
              return (
                <li key={`${card.edition_code}-${card.card_number}`}>
                  <button
                    onMouseDown={() => handleSelect(card)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-3)]"
                  >
                    <div className="h-10 w-7 shrink-0 overflow-hidden rounded-md ring-1 ring-white/10">
                      <img
                        src={imgSrc}
                        alt={card.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    </div>
                    <span className="flex-1 text-sm font-medium text-white">
                      {card.name}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-[var(--color-muted)]">
                      <span className="text-[var(--color-brand-light)]">
                        {card.edition_code}
                      </span>
                      {" · "}
                      {card.card_number}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <th className="w-16 px-4 py-3" />
              {th("Carta", "name")}
              {th("Edição", "edition_code")}
              {th("Mín", "latest_price_min")}
              {th("Médio", "latest_price_avg")}
              {th("7d", "pct_change_7d")}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-muted)]">
                  Nenhuma carta encontrada.
                </td>
              </tr>
            )}
            {sorted.map((card) => (
              <tr
                key={`${card.edition_code}-${card.card_number}`}
                className="group cursor-pointer bg-[var(--color-surface)] transition-colors hover:bg-[var(--color-surface-2)]"
                onClick={() =>
                  (window.location.href = `${base}cards/${card.code}`)
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
                  {formatBRL(card.latest_price_min)}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-base font-bold text-white">
                    {formatBRL(card.latest_price_avg)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Change value={card.pct_change_7d} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
