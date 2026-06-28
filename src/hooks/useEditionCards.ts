import useSWR from 'swr'
import type { CardData } from '../types'

const fetcher = (url: string) => fetch(url).then(r => r.json()) as Promise<CardData[]>

export function useEditionCards(code: string) {
  const base = import.meta.env.BASE_URL
  return useSWR<CardData[]>(`${base}data/${code}/cards.json`, fetcher)
}
