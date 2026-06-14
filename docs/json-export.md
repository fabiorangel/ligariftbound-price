# JSON Export Spec — ligaprice → ligariftbound-price

Este documento define **o que o ligaprice deve produzir e entregar** ao repositório `ligariftbound-price` para que o site estático funcione corretamente.

---

## Visão geral da integração

```
ligaprice
  DailyAggregationWorkflow (cron 02:00 UTC)
    └─ export_and_push_json (activity)
         ├─ escreve JSON em public/data/
         ├─ copia imagens novas em public/assets/
         └─ git commit + push → main
               └─ GitHub Actions (ligariftbound-price)
                    └─ astro build → GitHub Pages
```

O site é **100% estático**. Não existe backend nem API — todos os dados chegam como arquivos JSON servidos diretamente pelo GitHub Pages. O ligaprice é o único produtor; o site é o único consumidor.

---

## Entrega

### Repositório alvo

`fabiorangel/ligariftbound-price`, branch `main`.

### Frequência

Uma vez por dia, após a agregação gold layer. Horário alvo: **02:00 UTC**.

### Commit

Um único commit por execução, contendo todos os arquivos alterados. Mensagem sugerida:

```
chore: daily data export YYYY-MM-DD
```

Não criar commits parciais ou incrementais — o site consome o estado completo do repositório a cada build.

### Variáveis de ambiente esperadas no ligaprice

| Variável | Descrição |
|---|---|
| `PAGES_REPO_PATH` | Caminho absoluto do clone local de `ligariftbound-price` |
| `PAGES_REPO_BRANCH` | Branch alvo (tipicamente `main`) |
| `ASSETS_PATH` | Caminho para o diretório de imagens no servidor do worker (default: `"assets"`) |

### O que NÃO fazer

- Não apagar arquivos existentes em `public/data/` de dias anteriores — o site só consome os arquivos mais recentes, mas manter o histórico no git é desejável.
- Não sobrescrever imagens existentes em `public/assets/` — apenas adicionar novas.
- Não fazer push forçado nem reescrever histórico.

---

## Estrutura de arquivos

Todos os caminhos são relativos à raiz do repositório `ligariftbound-price`.

```
public/
├── data/
│   ├── cards.json                    ← lista de todas as cartas (1 arquivo)
│   ├── prices/
│   │   └── {card_id}.json            ← histórico por carta (1 por carta)
│   ├── market/
│   │   └── latest.json               ← resumo de mercado (1 arquivo)
│   ├── movers/
│   │   └── latest.json               ← top gainers/losers (1 arquivo)
│   └── depth/
│       └── {card_id}.json            ← profundidade por carta [FEAT-08]
└── assets/
    └── {EDITION_CODE}/
        └── {card_number}.webp        ← imagens das cartas
```

**Regra de nomenclatura:**
- `{card_id}` → inteiro positivo, sem zeros à esquerda. Ex: `1.json`, `42.json`, `1007.json`.
- `{EDITION_CODE}` → letras maiúsculas. Ex: `ARC`, `WTR`, `OGN`.
- `{card_number}` → string exata conforme cadastrado, zeros preservados. Ex: `006`, `068A`, `R01`.

---

## Encoding e formatação

- Todos os arquivos JSON em **UTF-8** (sem BOM).
- Números em ponto flutuante como `number` nativo JSON — sem aspas, sem formatação de moeda.
- Datas sempre como string no formato `"YYYY-MM-DD"` (ISO 8601, sem horário, sem timezone).
- Valores ausentes devem ser `null`, nunca string vazia `""`, `"N/A"`, `0` ou omissão de campo.
- A ausência de um campo obrigatório é considerada erro de contrato.

---

## `public/data/cards.json`

### Propósito

Array com **todas as cartas do catálogo**, incluindo as que não têm histórico de preço. É o arquivo mais crítico: usado pelo catálogo (`index.astro`), pela geração de rotas estáticas (`getStaticPaths` em `[slug].astro`), e como fonte de cross-reference para `slug` e `image_path` a partir de um `card_id`.

Se este arquivo estiver ausente ou corrompido, o build do site falha completamente.

### Exemplo

```json
[
  {
    "id": 42,
    "name": "Dorinthea Ironsong",
    "slug": "Dorinthea+Ironsong",
    "edition_code": "WTR",
    "card_number": "006",
    "image_path": "assets/WTR/006.webp",
    "latest_price_avg": 12.50,
    "latest_price_min": 10.00,
    "trend": "up",
    "pct_change_7d": 8.5,
    "as_of": "2026-06-13"
  },
  {
    "id": 7,
    "name": "Fury Rune",
    "slug": "Fury+Rune",
    "edition_code": "OGN",
    "card_number": "007",
    "image_path": "assets/OGN/007.webp",
    "latest_price_avg": null,
    "latest_price_min": null,
    "trend": null,
    "pct_change_7d": null,
    "as_of": null
  }
]
```

### Campos

| Campo | Tipo | Nulo? | Regras |
|---|---|---|---|
| `id` | `number` (inteiro) | não | PK numérica. Estável — nunca reatribuída. |
| `name` | `string` | não | Nome original da carta. Nunca vazio. |
| `slug` | `string` | não | URL segment. Espaços → `+`. `, ` → `+-+`. Estável. |
| `edition_code` | `string` | não | Código da edição em maiúsculas (`"WTR"`, `"ARC"`). |
| `card_number` | `string` | não | Número com zeros e sufixos preservados (`"006"`, `"068A"`). |
| `image_path` | `string \| null` | sim | Caminho relativo do webp (`"assets/WTR/006.webp"`). `null` se imagem ainda não disponível. |
| `latest_price_avg` | `number \| null` | sim | Média dos preços de venda do dia (BRL). `null` se sem dados hoje. |
| `latest_price_min` | `number \| null` | sim | Mínimo dos preços de venda do dia (BRL). `null` se sem dados hoje. |
| `trend` | `"up" \| "down" \| "stable" \| null` | sim | Direção vs. 7d. `"stable"` se `\|pct_change_7d\| < 2%`. `null` se sem histórico. |
| `pct_change_7d` | `number \| null` | sim | Variação percentual (`price_avg_hoje / price_avg_7d_atrás − 1) × 100`. |
| `as_of` | `string \| null` | sim | `"YYYY-MM-DD"` da coleta mais recente. `null` se nunca houve dados. |

### Regras de ordenação

Sem requisito fixo de ordem — o frontend ordena dinamicamente. Recomendado: por `id` crescente para estabilidade de diff.

### Edge cases

- Cartas sem nenhuma oferta registrada **devem aparecer** no array com todos os campos de preço/tendência como `null`. O catálogo as exibe com "-" e o getStaticPaths gera a rota para elas.
- Cartas removidas do catálogo devem ser removidas do array. Não manter cartas órfãs.
- `slug` deve ser URL-safe e único no array. Se dois nomes de carta colidirem no slug, adicionar `+-+{edition_code}` como sufixo para desambiguar.

---

## `public/data/prices/{card_id}.json`

### Propósito

Histórico de preços dos últimos 30 dias para uma carta específica. Um arquivo por carta — só gerar para cartas que possuem pelo menos um dia de coleta. O `{card_id}` no nome do arquivo é o campo `id` de `cards.json` (inteiro, sem zeros).

### Exemplo

```json
{
  "card": {
    "id": 42,
    "name": "Dorinthea Ironsong",
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
      "date": "2026-05-15",
      "price_min": 9.80,
      "price_avg": 12.00,
      "price_max": 14.50,
      "active_listings": 7,
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

### Objeto `card`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `number` | Mesmo `id` de `cards.json`. |
| `name` | `string` | Nome da carta. |
| `edition_code` | `string` | Código da edição. |
| `card_number` | `string` | Número com zeros preservados. |

### Objeto `history[]`

| Campo | Tipo | Nulo? | Regras |
|---|---|---|---|
| `date` | `string` | não | `"YYYY-MM-DD"`. |
| `price_min` | `number \| null` | sim | Menor ask do dia (BRL). `null` se sem anúncios no dia. |
| `price_avg` | `number \| null` | sim | Média dos asks do dia (BRL). `null` se sem anúncios. |
| `price_max` | `number \| null` | sim | Maior ask do dia (BRL). `null` se sem anúncios. |
| `active_listings` | `number` | não | Quantidade de anúncios ativos no dia. Mínimo: `0`. |
| `avg_7d` | `number \| null` | sim | Média de `price_avg` dos últimos 7 dias. `null` nos primeiros 6 dias de histórico. |
| `delta_7d` | `number \| null` | sim | `price_avg_hoje − price_avg_7d_atrás` (BRL). `null` nos primeiros 7 dias. |
| `pct_change_7d` | `number \| null` | sim | `(price_avg_hoje / price_avg_7d_atrás − 1) × 100`. `null` nos primeiros 7 dias. |

### Regras de ordenação

`history` deve estar ordenado por `date` **crescente** (mais antigo primeiro, mais recente por último). O gráfico do frontend plota diretamente nessa ordem.

### Janela de tempo

Máximo de **30 entradas** (janela rolante). Se a carta tiver mais de 30 dias de histórico, descartar os mais antigos. Entradas de dias sem coleta não são incluídas — `history` contém apenas dias com pelo menos um anúncio.

### Nullabilidade de `avg_7d` / `delta_7d` / `pct_change_7d`

- `avg_7d` → `null` se a janela de 7 dias não está completa (menos de 7 entradas no histórico até aquela data).
- `delta_7d` e `pct_change_7d` → `null` se não há entrada exatamente 7 dias antes (`date − 7`).
- Se `price_avg` for `null` no dia de referência (7 dias atrás), os campos derivados também são `null`.

---

## `public/data/market/latest.json`

### Propósito

Snapshot agregado do mercado para o dia mais recente. Um único arquivo, sobrescrito diariamente.

### Exemplo

```json
{
  "date": "2026-06-13",
  "cards_with_listings": 342,
  "median_price": 8.50,
  "mean_price": 12.30,
  "total_listings": 4820
}
```

### Campos

| Campo | Tipo | Nulo? | Regras |
|---|---|---|---|
| `date` | `string` | não | `"YYYY-MM-DD"` do dia de referência. |
| `cards_with_listings` | `number` | não | Número de cartas distintas com pelo menos um anúncio hoje. |
| `median_price` | `number \| null` | sim | Mediana dos `price_avg` de todas as cartas com anúncios hoje (BRL). `null` se nenhuma carta tem anúncios. |
| `mean_price` | `number \| null` | sim | Média aritmética dos `price_avg` das cartas com anúncios hoje (BRL). `null` se vazio. |
| `total_listings` | `number` | não | Soma de todos os anúncios ativos hoje. |

**Campos que NÃO devem estar neste arquivo:** `top_gainer_card_id`, `top_loser_card_id`, `most_listed_card_id`. Essa informação já está em `movers/latest.json`.

---

## `public/data/movers/latest.json`

### Propósito

Top 10 cartas com maior alta e top 10 com maior baixa de preço nos últimos 7 dias. Um único arquivo, sobrescrito diariamente.

### Exemplo

```json
{
  "date": "2026-06-13",
  "top_gainers": [
    { "card_id": 42, "name": "Dorinthea Ironsong", "pct_change_7d": 45.20 },
    { "card_id": 18, "name": "Briar, Warden of Thorns", "pct_change_7d": 32.10 }
  ],
  "top_losers": [
    { "card_id": 17, "name": "Bravo, Star of the Show", "pct_change_7d": -22.10 },
    { "card_id": 99, "name": "Ira, Crimson Haze", "pct_change_7d": -18.50 }
  ]
}
```

### Campos raiz

| Campo | Tipo | Nulo? | Regras |
|---|---|---|---|
| `date` | `string \| null` | sim | `"YYYY-MM-DD"` do dia de referência. `null` se não há dados suficientes. |
| `top_gainers` | `array` | não | Lista ordenada por `pct_change_7d` **decrescente**. Máximo 10. Array vazio `[]` se sem dados. |
| `top_losers` | `array` | não | Lista ordenada por `pct_change_7d` **crescente** (valores mais negativos primeiro). Máximo 10. Array vazio `[]` se sem dados. |

### Campos de cada item (`top_gainers[]` e `top_losers[]`)

| Campo | Tipo | Nulo? | Regras |
|---|---|---|---|
| `card_id` | `number` | não | `id` da carta — usado pelo frontend para cruzar com `cards.json` e obter `slug`/imagem. |
| `name` | `string \| null` | sim | Nome da carta. |
| `pct_change_7d` | `number` | não | Variação percentual. Positivo em gainers, negativo em losers. |

**Campos ausentes por design:** `slug`, `image_path`, `price_avg_today`, `edition_code`. O frontend obtém esses dados cruzando `card_id` com `cards.json` — que já está carregado na mesma página.

### Critério de inclusão

Incluir apenas cartas com `pct_change_7d` não-nulo e que possuem dados em ambas as datas (`today` e `today − 7`). Não incluir cartas com variação calculada a partir de dias com `price_avg = null`.

---

## `public/data/depth/{card_id}.json` — [FEAT-08]

### Propósito

Snapshot da profundidade de oferta (ask-side) para uma carta, agregando todas as edições. Responde a: *"se a demanda crescer, quantas unidades existem a cada faixa de preço?"*. Regenerado diariamente, representa sempre o estado mais recente da coleta.

### Exemplo

```json
{
  "card_id": 42,
  "card_name": "Dorinthea Ironsong",
  "as_of": "2026-06-13",
  "total_available": 23,
  "levels": [
    { "price": 10.00, "qty": 3, "cumulative_qty": 3 },
    { "price": 12.50, "qty": 5, "cumulative_qty": 8 },
    { "price": 15.00, "qty": 15, "cumulative_qty": 23 }
  ]
}
```

### Campos raiz

| Campo | Tipo | Nulo? | Regras |
|---|---|---|---|
| `card_id` | `number` | não | `id` da carta. |
| `card_name` | `string` | não | Nome da carta. |
| `as_of` | `string` | não | `"YYYY-MM-DD"` da coleta. |
| `total_available` | `number` | não | Soma de todos os `qty` em `levels`. `0` se sem ofertas. |
| `levels` | `array` | não | Array vazio `[]` se não houver ofertas. Nunca `null`. |

### Campos de `levels[]`

| Campo | Tipo | Regras |
|---|---|---|
| `price` | `number` | Preço unitário (BRL) deste nível. |
| `qty` | `number` | Quantidade disponível exatamente neste preço (soma de todos os vendedores nesse preço). |
| `cumulative_qty` | `number` | Quantidade acumulada do nível mais barato até este inclusive. |

### Regras

- `levels` ordenado por `price` **crescente**.
- `levels[0].cumulative_qty` deve ser igual a `levels[0].qty`.
- `levels[N].cumulative_qty` deve ser igual a `levels[N-1].cumulative_qty + levels[N].qty`.
- `total_available` deve ser igual a `levels[levels.length - 1].cumulative_qty` (quando `levels` não vazio).
- Ofertas com preço idêntico (mesmo `price`) são **agregadas em um único nível** — nunca dois itens em `levels` com o mesmo `price`.

### Quando não gerar o arquivo

Se a carta não tem nenhum anúncio ativo no dia, gerar o arquivo com `levels: []` e `total_available: 0`. Não omitir o arquivo — o frontend trata a ausência de arquivo como erro diferente de "sem ofertas".

---

## Imagens das cartas

### Localização no repositório

```
public/assets/{EDITION_CODE}/{card_number}.webp
```

Exemplos: `public/assets/WTR/006.webp`, `public/assets/ARC/068A.webp`.

### Referência no frontend

O campo `image_path` em `cards.json` deve conter o caminho relativo **sem** o prefixo `public/`:

```json
"image_path": "assets/WTR/006.webp"
```

O frontend monta a URL como `${base}${card.image_path}` — onde `base` é o base path do GitHub Pages (`/ligariftbound-price/`).

### Regras de entrega

- Formato: **WebP**. Outros formatos não são suportados pelo frontend.
- Apenas adicionar arquivos novos. Nunca sobrescrever imagens existentes.
- Se a imagem de uma carta ainda não está disponível, manter `image_path: null` em `cards.json` — não criar um placeholder.
- Nome do arquivo = `{card_number}.webp`, onde `{card_number}` é o valor exato do campo `card_number` (zeros e sufixos preservados).

---

## Checklist de validação antes do commit

Antes de fazer push, verificar:

- [ ] `cards.json` existe e é um array JSON válido.
- [ ] Cada carta em `cards.json` tem `id`, `name`, `slug`, `edition_code`, `card_number`.
- [ ] `slug` é único entre todas as entradas de `cards.json`.
- [ ] Para cada carta com `id = N` em `cards.json` que tem histórico, existe `prices/N.json`.
- [ ] `prices/{id}.json` → `history` está ordenado por `date` crescente.
- [ ] `prices/{id}.json` → `history` tem no máximo 30 entradas.
- [ ] `movers/latest.json` existe. `top_gainers` e `top_losers` são arrays (podem ser vazios).
- [ ] `market/latest.json` existe e tem o campo `date`.
- [ ] `depth/{id}.json` → se `levels` não é vazio, `levels[last].cumulative_qty === total_available`.
- [ ] Nenhum campo obrigatório foi omitido (campos ausentes quebram o TypeScript do frontend em runtime).
- [ ] Nenhum valor numérico foi serializado como string.
- [ ] Nenhuma data foi serializada com horário ou timezone.

---

## Erros comuns

| Erro | Consequência no frontend |
|---|---|
| `prices/{id}.json` usa `slug` no nome em vez de `id` | `PriceChart` falha ao carregar (404) |
| `movers` usa chave `gainers` em vez de `top_gainers` | `MoversList` renderiza listas vazias |
| `trend` tem valor `"neutral"` em vez de `"stable"` | Badge de tendência não aparece |
| `history` fora de ordem (decrescente) | Gráfico plotado de trás para frente |
| `active_listings` como string (`"6"`) | Erro de tipagem silencioso; pode quebrar cálculos |
| `image_path` com prefixo `"public/"` | Imagem não carrega (URL errada) |
| `depth/{id}.json` ausente para carta sem ofertas | `DepthChart` mostra erro de fetch em vez de "sem ofertas" |
| `slug` com espaço literal em vez de `+` | Link de navegação quebra |
