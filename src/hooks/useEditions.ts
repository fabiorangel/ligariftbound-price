import useSWR from 'swr'

export interface Edition {
  code: string
  name: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json()) as Promise<Edition[]>

export function useEditions() {
  const base = import.meta.env.BASE_URL
  return useSWR<Edition[]>(`${base}data/editions.json`, fetcher)
}
