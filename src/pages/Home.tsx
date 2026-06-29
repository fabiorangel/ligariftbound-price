import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import MoversList from '../components/MoversList'
import { useIndex } from '../hooks/useIndex'
import { useEditions } from '../hooks/useEditions'

export default function Home() {
  const { data: index } = useIndex()
  const { data: editions } = useEditions()

  const withVariation = (index ?? []).filter(e => e.variation_7d !== null && e.variation_7d !== 0)
  const sorted = [...withVariation].sort((a, b) => (b.variation_7d ?? 0) - (a.variation_7d ?? 0))
  const gainers = sorted.slice(0, 5)
  const losers = [...sorted].reverse().slice(0, 5)

  return (
    <Layout>
      {/* Hero */}
      <section className="py-10 text-center">
        <h1 className="text-4xl font-bold text-zinc-100">
          Preços do{' '}
          <span className="text-gold-400">Riftbound</span>
        </h1>
        <p className="mt-3 text-zinc-500 text-lg max-w-lg mx-auto">
          Acompanhe os preços das cartas no LigaRiftbound em tempo real.
        </p>
      </section>

      {/* Top Movers */}
      <section className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <span className="text-emerald-400">▲</span> Maiores Altas (7d)
              </h2>
              <Link to="/movers/gainers" className="text-xs text-zinc-500 hover:text-gold-400 transition-colors">
                Ver todos →
              </Link>
            </div>
            {gainers.length
              ? <MoversList entries={gainers} />
              : <p className="text-zinc-600 text-sm py-4 text-center">Carregando...</p>
            }
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <span className="text-red-400">▼</span> Maiores Baixas (7d)
              </h2>
              <Link to="/movers/losers" className="text-xs text-zinc-500 hover:text-gold-400 transition-colors">
                Ver todos →
              </Link>
            </div>
            {losers.length
              ? <MoversList entries={losers} />
              : <p className="text-zinc-600 text-sm py-4 text-center">Carregando...</p>
            }
          </div>
        </div>
      </section>

      {/* Editions grid */}
      <section className="mt-12">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          Edições
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(editions ?? []).map(ed => {
            const count = index?.filter(
              e => e.edition_code === ed.code,
            ).length ?? null
            return (
              <Link
                key={ed.code}
                to={`/search?editions=${ed.code}`}
                className="group block p-4 rounded-xl bg-surface-800 border border-surface-600 hover:border-gold-500/50 hover:bg-surface-700 transition-all"
              >
                <p className="text-xs font-bold text-gold-400 uppercase tracking-widest">
                  {ed.code}
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors">
                  {ed.name}
                </p>
                {count !== null && (
                  <p className="mt-1 text-xs text-zinc-500">{count} cartas</p>
                )}
              </Link>
            )
          })}
        </div>
      </section>
    </Layout>
  )
}
