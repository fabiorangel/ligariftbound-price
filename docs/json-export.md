# JSON Export Contracts

Documenta exatamente o que `DailyAggregationWorkflow → export_and_push_json` escreve no repositório do site estático. Estes são os contratos reais produzidos pelo código — use este arquivo como fonte da verdade ao implementar o frontend.

Todos os arquivos são escritos em `{PAGES_REPO_PATH}/data/` e comitados para o branch configurado em `PAGES_REPO_BRANCH`.

---

## Arquivos produzidos

| Destino no repo do site | Frequência | Origem |
|---|---|---|
| `data/cards.json` | Diário | `build_cards_json` em `aggregation.py` |
| `data/prices/{card_id}.json` | Diário, um por carta | `build_price_history_json` em `aggregation.py` |
| `data/market/latest.json` | Diário | `build_market_json` em `aggregation.py` |
| `data/movers/latest.json` | Diário | `build_movers_json` em `aggregation.py` |
| `public/assets/{EDITION}/{card_number}.webp` | Incremental (só novos) | `_sync_assets` em `activities/aggregation.py` |

### Imagens

As imagens das cartas ficam em `assets/` no projeto ligaprice (ex: `assets/ARC/068A.webp`) e são copiadas para `public/assets/` no repo do site a cada execução do export. Apenas arquivos novos são copiados — imagens já existentes no destino são ignoradas, mantendo os commits diários pequenos.

No frontend, o caminho de uma imagem é `{base}/assets/{edition_code}/{card_number}.webp`. O campo `image_path` em `cards.json` já traz esse caminho relativo (ex: `"assets/ARC/068A.webp"`), pronto para ser prefixado com `{base}`.

**Variável de ambiente:** `ASSETS_PATH` (default: `"assets"`) — caminho para o diretório de imagens no servidor onde o worker roda. Pode ser absoluto ou relativo ao cwd do worker.

---

## `data/cards.json`

Lista de todas as cartas com o preço mais recente e sinal de tendência. Usado pelo catálogo e pelo `getStaticPaths` do site.

```json
[
  {
    "id": 1,
    "name": "Katsu, the Wanderer",
    "slug": "Katsu+the+Wanderer",
    "edition_code": "WTR",
    "card_number": "006",
    "image_path": "assets/WTR/006.webp",
    "latest_price_avg": 12.50,
    "latest_price_min": 10.00,
    "trend": "up",
    "pct_change_7d": 8.5,
    "as_of": "2026-06-13"
  }
]
```

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `number` | PK interno — usado para montar a URL de histórico |
| `name` | `string` | Nome da carta conforme cadastrado |
| `slug` | `string` | Slug URL-safe (espaços → `+`, `, ` → ` - `) |
| `edition_code` | `string` | Ex: `"WTR"`, `"ARC"` |
| `card_number` | `string` | Ex: `"006"`, `"R01"` — zeros preservados |
| `image_path` | `string \| null` | Caminho relativo ao asset da carta |
| `latest_price_avg` | `number \| null` | Média de preço hoje (BRL) |
| `latest_price_min` | `number \| null` | Mínimo de preço hoje (BRL) |
| `trend` | `"up" \| "down" \| "stable" \| null` | Direção em 7d; `null` se sem histórico |
| `pct_change_7d` | `number \| null` | Variação percentual vs. 7 dias atrás |
| `as_of` | `string \| null` | Data do dado (`"YYYY-MM-DD"`) |

**Nota:** cartas sem nenhuma coleta aparecem na lista com todos os campos de preço/tendência `null`.

---

## `data/prices/{card_id}.json`

Histórico de 30 dias para uma carta específica. O `card_id` é o campo `id` de `cards.json`.

> **Atenção para o frontend:** o caminho usa `card_id` numérico, não o `slug`. Montar como `data/prices/${card.id}.json`.

```json
{
  "card": {
    "id": 1,
    "name": "Katsu, the Wanderer",
    "edition_code": "WTR",
    "card_number": "006"
  },
  "history": [
    {
      "date": "2026-05-14",
      "price_min": 9.50,
      "price_avg": 11.80,
      "price_max": 14.00,
      "active_listings": 6,
      "avg_7d": null,
      "delta_7d": null,
      "pct_change_7d": null
    },
    {
      "date": "2026-06-13",
      "price_min": 10.00,
      "price_avg": 12.50,
      "price_max": 15.00,
      "active_listings": 8,
      "avg_7d": 11.95,
      "delta_7d": 0.70,
      "pct_change_7d": 5.93
    }
  ]
}
```

`history` está ordenado por data **crescente** (mais antigo primeiro, mais recente por último). Máximo de 30 entradas (janela rolante).

| Campo | Tipo | Descrição |
|---|---|---|
| `date` | `string` | `"YYYY-MM-DD"` |
| `price_min` | `number \| null` | Mínimo do dia (BRL) |
| `price_avg` | `number \| null` | Média do dia (BRL) |
| `price_max` | `number \| null` | Máximo do dia (BRL) |
| `active_listings` | `number` | Total de anúncios ativos no dia |
| `avg_7d` | `number \| null` | Média dos últimos 7 dias |
| `delta_7d` | `number \| null` | `price_avg_hoje − price_avg_7d_atrás` (BRL) |
| `pct_change_7d` | `number \| null` | Variação percentual em 7d |

Os campos `avg_7d`, `delta_7d` e `pct_change_7d` são `null` nas primeiras entradas onde o histórico ainda não tem 7 dias de dados.

---

## `data/market/latest.json`

Resumo agregado do mercado no dia mais recente.

```json
{
  "date": "2026-06-13",
  "cards_with_listings": 342,
  "median_price": 8.50,
  "mean_price": 12.30,
  "total_listings": 4820
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `date` | `string` | `"YYYY-MM-DD"` |
| `cards_with_listings` | `number` | Cartas com pelo menos um anúncio |
| `median_price` | `number \| null` | Mediana dos `price_avg` das cartas (BRL) |
| `mean_price` | `number \| null` | Média dos `price_avg` das cartas (BRL) |
| `total_listings` | `number` | Soma de todos os anúncios do dia |

**Nota:** `top_gainer_card_id`, `top_loser_card_id` e `most_listed_card_id` existem na tabela gold mas **não são exportados** neste arquivo — essa informação já está em `movers/latest.json`.

---

## `data/movers/latest.json`

Top 10 cartas com maior alta e maior baixa de preço nos últimos 7 dias.

```json
{
  "date": "2026-06-13",
  "top_gainers": [
    {
      "card_id": 42,
      "name": "Dorinthea Ironsong",
      "pct_change_7d": 45.20
    }
  ],
  "top_losers": [
    {
      "card_id": 17,
      "name": "Bravo, Star of the Show",
      "pct_change_7d": -22.10
    }
  ]
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `date` | `string \| null` | Data de referência (`"YYYY-MM-DD"`) |
| `top_gainers` | `array` | Até 10 cartas, ordenadas por `pct_change_7d` desc |
| `top_losers` | `array` | Até 10 cartas, ordenadas por `pct_change_7d` asc |
| `top_gainers[].card_id` | `number` | `id` da carta — use para cruzar com `cards.json` |
| `top_gainers[].name` | `string \| null` | Nome da carta |
| `top_gainers[].pct_change_7d` | `number` | Variação percentual em 7d |

**Campos ausentes no output atual que o frontend pode precisar:**
- `slug` — para construir a URL de detalhe. Resolver cruzando `card_id` com `cards.json`.
- `price_avg_today` e `price_avg_7d_ago` — não exportados; apenas a variação percentual. Se o frontend precisar dos valores absolutos, deve cruzar com `cards.json` (`latest_price_avg`) e calcular o `7d_ago` a partir do histórico.

---

## `data/depth/{card_id}.json` — [FEAT-08, não implementado]

Snapshot do livro de ofertas para uma carta. Planejado para FEAT-08.

```json
{
  "card_id": 1,
  "card_name": "Katsu, the Wanderer",
  "as_of": "2026-06-13",
  "total_available": 23,
  "levels": [
    { "price": 10.00, "qty": 3, "cumulative_qty": 3 },
    { "price": 12.50, "qty": 5, "cumulative_qty": 8 },
    { "price": 15.00, "qty": 15, "cumulative_qty": 23 }
  ]
}
```

`levels` ordenados por `price` crescente. `cumulative_qty` é acumulado do nível mais barato em diante. Arquivo vazio (ou ausente) indica que não há ofertas para aquela carta no dia.

---

## Divergências em relação à SPEC do frontend (`ligariftbound-price/SPEC.md`)

Estes pontos precisam ser alinhados entre os dois projetos:

| Ponto | Código (ligaprice) | SPEC (ligariftbound-price) |
|---|---|---|
| Caminho do histórico | `data/prices/{card_id}.json` | `data/price_history/{slug}.json` |
| Chave de tendência | `pct_change_7d` | `change_7d` |
| Movers — chave raiz | `top_gainers` / `top_losers` | `gainers` / `losers` |
| Movers — variação | `pct_change_7d` | `change_pct` |
| Movers — campos extras | ausentes | `slug`, `edition_code`, `card_number`, `price_avg_today`, `price_avg_7d_ago` |

A recomendação é ajustar o frontend para seguir o que o código produz (coluna "Código"), já que mudar os nomes de campo no exportador exigiria também migrar os dados históricos. Se o frontend precisar de `slug` e `price_avg_today` nos movers, o lugar mais simples de resolver é no próprio frontend cruzando com `cards.json` pelo `card_id`.
