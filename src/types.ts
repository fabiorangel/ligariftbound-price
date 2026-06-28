export interface IndexEntry {
  riftbound_id: string
  name: string
  edition_code: string
  min_price: number
  variation_7d: number | null
  variation_30d: number | null
}

export interface CardData {
  riftbound_id: string
  name: string
  number: string
  edition_code: string
  image_uri: string
  type: string
  rarity: string
  energy: number | null
  power: number | null
  might: number | null
  artist: string | null
  flavour: string | null
  domain: string[]
  supertype: string | null
  tags: string[]
  card_text: string | null
  overnumbered: boolean
  alternate_art: boolean
}

export interface PriceSeries {
  date: string
  min_price: number
}

export interface PriceEntry {
  riftbound_id: string
  foil: boolean
  language: string
  variation_7d: number | null
  variation_30d: number | null
  series: PriceSeries[]
}

export interface DepthEntry {
  riftbound_id: string
  foil: boolean
  language: string
  date: string
  prices: number[]
  quantities: number[]
}

