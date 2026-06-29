import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { getSearchIndex, getAllCards } from '../lib/searchIndex'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { getSearchIndex(); getAllCards() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="min-h-screen bg-surface-900 text-zinc-100 font-sans">
      <header className="sticky top-0 z-50 border-b border-surface-600 bg-surface-900/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-6">
          <Link
            to="/"
            className="text-gold-400 font-bold text-lg tracking-tight shrink-0 hover:text-gold-300 transition-colors"
          >
            Riftbound<span className="text-zinc-500 font-normal"> Price</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar cartas… (⌘K)"
                className="w-full bg-surface-700 border border-surface-500 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-gold-400 transition-colors"
              />
            </div>
          </form>

          <Link
            to="/search"
            className="shrink-0 flex items-center gap-1.5 border border-surface-500 hover:border-zinc-400 text-zinc-400 hover:text-zinc-100 text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M7 12h10M11 18h2" />
            </svg>
            <span className="hidden sm:inline">Filtrar</span>
          </Link>

          <Link
            to="/depth"
            className="shrink-0 flex items-center gap-1.5 border border-surface-500 hover:border-zinc-400 text-zinc-400 hover:text-zinc-100 text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16l4-4 4 4 4-6" />
            </svg>
            <span className="hidden sm:inline">Profundidade</span>
          </Link>

          <a
            href="https://www.buymeacoffee.com/kojiro"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <img
              src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
              alt="Buy Me A Coffee"
              className="h-8 w-auto"
            />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
