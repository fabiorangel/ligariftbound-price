import useSWR from 'swr'
import type { IndexEntry } from '../types'

const fetcher = (url: string) => fetch(url).then(r => r.json()) as Promise<IndexEntry[]>

export function useIndex() {
  const base = import.meta.env.BASE_URL
  return useSWR<IndexEntry[]>(`${base}data/index.json`, fetcher)
}
