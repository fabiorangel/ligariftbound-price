import useSWR from 'swr'
import type { DepthEntry } from '../types'

let cached: DepthEntry[] | null = null

async function fetchAllDepth(): Promise<DepthEntry[]> {
  if (cached) return cached
  const base = import.meta.env.BASE_URL
  const editions: Array<{ code: string }> = await fetch(`${base}data/editions.json`).then(r => r.json())
  const results = await Promise.all(
    editions.map(ed =>
      fetch(`${base}data/${ed.code.toLowerCase()}/depth.json`)
        .then(r => (r.ok ? r.json() : []) as Promise<DepthEntry[]>)
        .catch(() => [] as DepthEntry[]),
    ),
  )
  cached = results.flat()
  return cached
}

export function useAllDepth() {
  return useSWR<DepthEntry[]>('all-depth', fetchAllDepth)
}
