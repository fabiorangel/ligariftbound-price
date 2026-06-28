import MiniSearch from 'minisearch'

const INDEX_OPTIONS = {
  idField: 'riftbound_id',
  fields: ['name', 'card_text', 'flavour', 'tags', 'domain', 'type', 'rarity', 'supertype', 'artist'],
  storeFields: ['riftbound_id', 'name', 'edition_code', 'image_uri', 'type', 'rarity', 'number'],
}

let index: MiniSearch | null = null

export async function getSearchIndex(): Promise<MiniSearch> {
  if (index) return index
  const base = import.meta.env.BASE_URL
  const json = await fetch(`${base}data/search-index.json`).then(r => r.text())
  index = MiniSearch.loadJSON(json, INDEX_OPTIONS)
  return index
}
