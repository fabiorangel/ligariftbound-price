import { readFileSync, writeFileSync, existsSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const MiniSearch = require('minisearch')

const editions = JSON.parse(readFileSync('data/editions.json', 'utf8'))

const allCards = editions.flatMap(({ code }) => {
  const path = `data/${code.toLowerCase()}/cards.json`
  if (!existsSync(path)) return []
  return JSON.parse(readFileSync(path, 'utf8'))
})

const index = new MiniSearch({
  idField: 'riftbound_id',
  fields: ['name', 'card_text', 'flavour', 'tags', 'domain', 'type', 'rarity', 'supertype', 'artist'],
  storeFields: ['riftbound_id', 'name', 'edition_code', 'image_uri', 'type', 'rarity', 'number'],
  extractField: (doc, field) => {
    const val = doc[field]
    return Array.isArray(val) ? val.join(' ') : String(val ?? '')
  },
})

index.addAll(allCards)

writeFileSync('data/search-index.json', JSON.stringify(index))
console.log(`Search index built: ${allCards.length} cards indexed.`)
