import MiniSearch from 'minisearch'
import type { CardData } from '../types'

const INDEX_OPTIONS = {
  idField: 'riftbound_id',
  fields: ['name', 'card_text', 'flavour', 'tags', 'domain', 'type', 'rarity', 'supertype', 'artist'],
  storeFields: ['riftbound_id', 'name', 'edition_code', 'image_uri', 'type', 'rarity', 'number'],
}

let index: MiniSearch | null = null
let allCardsCache: CardData[] | null = null

export async function getSearchIndex(): Promise<MiniSearch> {
  if (index) return index
  const base = import.meta.env.BASE_URL
  const json = await fetch(`${base}data/search-index.json`).then(r => r.text())
  index = MiniSearch.loadJSON(json, INDEX_OPTIONS)
  return index
}

export async function getAllCards(): Promise<CardData[]> {
  if (allCardsCache) return allCardsCache
  const base = import.meta.env.BASE_URL
  const editions: Array<{ code: string }> = await fetch(`${base}data/editions.json`).then(r => r.json())
  const results = await Promise.all(
    editions.map(ed => fetch(`${base}data/${ed.code.toLowerCase()}/cards.json`).then(r => r.json()))
  )
  allCardsCache = results.flat()
  return allCardsCache
}
