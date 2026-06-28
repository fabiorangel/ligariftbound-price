import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import MoversList from '../components/MoversList'
import { useIndex } from '../hooks/useIndex'

export default function Movers() {
  const { direction } = useParams<{ direction: string }>()
  const { data: index } = useIndex()

  const isGainers = direction === 'gainers'

  const entries = (index ?? [])
    .filter(e => e.variation_7d !== null && e.variation_7d !== 0)
    .sort((a, b) =>
      isGainers
        ? (b.variation_7d ?? 0) - (a.variation_7d ?? 0)
        : (a.variation_7d ?? 0) - (b.variation_7d ?? 0),
    )

  return (
    <Layout>
      <div className="mb-6 flex items-center gap-3">
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

      {!index
        ? <p className="text-zinc-600 text-sm py-10 text-center">Carregando...</p>
        : <MoversList entries={entries} />
      }
    </Layout>
  )
}
