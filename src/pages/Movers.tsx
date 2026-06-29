import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import MoversList from '../components/MoversList'
import { useIndex } from '../hooks/useIndex'

const PAGE_SIZE = 50

export default function Movers() {
  const { direction } = useParams<{ direction: string }>()
  const { data: index } = useIndex()

  const [minPrice, setMinPrice] = useState('')
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const isGainers = direction === 'gainers'

  const entries = useMemo(() => {
    const min = parseFloat(minPrice)
    return (index ?? [])
      .filter(e => e.variation_7d !== null && e.variation_7d !== 0)
      .filter(e => isNaN(min) || min <= 0 || e.min_price >= min)
      .sort((a, b) =>
        isGainers
          ? (b.variation_7d ?? 0) - (a.variation_7d ?? 0)
          : (a.variation_7d ?? 0) - (b.variation_7d ?? 0),
      )
  }, [index, isGainers, minPrice])

  useEffect(() => { setDisplayCount(PAGE_SIZE) }, [minPrice, isGainers])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setDisplayCount(n => n + PAGE_SIZE) },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [index])

  const visibleEntries = entries.slice(0, displayCount)
  const hasMore = displayCount < entries.length

  return (
    <Layout>
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <Link to="/" className="text-zinc-500 hover:text-gold-400 transition-colors text-sm">
          ← Home
        </Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-xl font-bold text-zinc-100">
          {isGainers
            ? <><span className="text-emerald-400">▲</span> Maiores Altas (7d)</>
            : <><span className="text-red-400">▼</span> Maiores Baixas (7d)</>
          }
        </h1>
        {index && (
          <span className="ml-auto text-sm text-zinc-500">{entries.length} cartas</span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 p-3 bg-surface-800 rounded-xl border border-surface-600">
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-400 shrink-0">Preço base &gt;</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">R$</span>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="0,00"
              value={minPrice}
              onChange={e => { setMinPrice(e.target.value); setDisplayCount(PAGE_SIZE) }}
              className="w-24 bg-surface-700 border border-surface-500 rounded px-2 py-1.5 pl-8 text-sm text-zinc-100 focus:outline-none focus:border-gold-400"
            />
          </div>
        </div>
      </div>

      {!index ? (
        <p className="text-zinc-600 text-sm py-10 text-center">Carregando...</p>
      ) : entries.length === 0 ? (
        <p className="text-zinc-600 text-sm py-10 text-center">Nenhuma carta encontrada.</p>
      ) : (
        <>
          <MoversList entries={visibleEntries} />
          {hasMore && <div ref={sentinelRef} className="h-16" />}
        </>
      )}
    </Layout>
  )
}
