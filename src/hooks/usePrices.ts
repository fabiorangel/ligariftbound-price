import useSWR from 'swr'
import type { PriceEntry } from '../types'

const fetcher = (url: string) => fetch(url).then(r => r.json()) as Promise<PriceEntry[]>

export function usePrices(editionCode: string) {
  const base = import.meta.env.BASE_URL
  const code = editionCode.toLowerCase()
  return useSWR<PriceEntry[]>(`${base}data/${code}/prices.json`, fetcher)
}
