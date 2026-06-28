import useSWR from 'swr'
import type { DepthEntry } from '../types'

const fetcher = (url: string) => fetch(url).then(r => r.json()) as Promise<DepthEntry[]>

export function useDepth(editionCode: string) {
  const base = import.meta.env.BASE_URL
  const code = editionCode.toLowerCase()
  return useSWR<DepthEntry[]>(`${base}data/${code}/depth.json`, fetcher)
}
