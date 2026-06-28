import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import RarityBadge from '../components/RarityBadge'
import { getSearchIndex } from '../lib/searchIndex'

interface Result {
  riftbound_id: string
  name: string
  edition_code: string
  image_uri: string
  type: string
  rarity: string
  number: string
}

export default function Search() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const base = import.meta.env.BASE_URL

  useEffect(() => {
    if (!q) { setLoading(false); return }
    setLoading(true)
    getSearchIndex().then(index => {
      setResults(index.search(q) as unknown as Result[])
      setLoading(false)
    })
  }, [q])

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">
          Resultados para <span className="text-gold-400">"{q}"</span>
        </h1>
        {!loading && (
          <p className="text-sm text-zinc-500 mt-1">{results.length} cartas encontradas</p>
        )}
      </div>

      {loading ? (
        <p className="text-zinc-500 py-10 text-center">Indexando cartas…</p>
      ) : results.length === 0 ? (
        <p className="text-zinc-500 py-10 text-center">Nenhuma carta encontrada.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {results.map(r => (
            <Link
              key={r.riftbound_id}
              to={`/card/${encodeURIComponent(r.riftbound_id)}`}
              className="group block rounded-xl overflow-hidden bg-surface-800 border border-surface-600 hover:border-gold-500/50 transition-all hover:-translate-y-0.5"
            >
              <div className="aspect-[744/1039] bg-surface-700 overflow-hidden">
                <img
                  src={`${base}${r.image_uri}`}
                  alt={r.name}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm font-semibold text-zinc-100 line-clamp-1">{r.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{r.edition_code}</span>
                  <RarityBadge rarity={r.rarity} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  )
}
