import type { EstimateLineItem } from '../types'

export const PRICE_BOOK_PREF_KEY = 'preferences.price_book'

export interface QuoteInput {
  substrateId: string
  widthIn: number
  heightIn: number
  qty: number
  sides: 1 | 2
  finishing: string[]
}

export interface SubstrateRate {
  label: string
  costPerSqIn: number
  clickPerSide: number
}

export interface FinishingRate {
  label: string
  flat: number
  perUnit: number
}

export interface QtyBreak {
  min: number
  multiplier: number
}

export interface PriceBook {
  substrates: Record<string, SubstrateRate>
  finishing: Record<string, FinishingRate>
  setupFee: number
  spoilageRate: number
  qtyBreaks: QtyBreak[]
  targetMarginPct: number
}

export interface QuoteResult {
  cost: number
  price: number
  marginPct: number
  lineItems: Omit<EstimateLineItem, 'id' | 'estimate_id' | 'sort_order'>[]
}

export const DEFAULT_PRICE_BOOK: PriceBook = {
  substrates: {
    '350gsm': { label: '350gsm card stock (business card)', costPerSqIn: 0.0032, clickPerSide: 0.042 },
    '16pt-c2s': { label: '16pt C2S (business card)', costPerSqIn: 0.0028, clickPerSide: 0.04 },
    '14pt-c2s': { label: '14pt C2S', costPerSqIn: 0.0022, clickPerSide: 0.035 },
    '100lb-text': { label: '100# text', costPerSqIn: 0.0015, clickPerSide: 0.03 },
    '13oz-vinyl': { label: '13oz vinyl banner', costPerSqIn: 0.0045, clickPerSide: 0.06 },
  },
  finishing: {
    lamination: { label: 'Lamination', flat: 25, perUnit: 0.08 },
    uv: { label: 'UV coating', flat: 15, perUnit: 0.05 },
    scoring: { label: 'Scoring', flat: 10, perUnit: 0.02 },
    drilling: { label: 'Drilling (per hole)', flat: 5, perUnit: 0.15 },
  },
  setupFee: 35,
  spoilageRate: 0.05,
  qtyBreaks: [
    { min: 1, multiplier: 1 },
    { min: 250, multiplier: 0.95 },
    { min: 500, multiplier: 0.9 },
    { min: 1000, multiplier: 0.85 },
  ],
  targetMarginPct: 40,
}

function qtyBreakMultiplier(qty: number, breaks: QtyBreak[]): number {
  const eligible = breaks.filter((b) => qty >= b.min)
  return eligible.length > 0 ? eligible[eligible.length - 1].multiplier : 1
}

export function priceQuote(input: QuoteInput, book: PriceBook): QuoteResult {
  const substrate = book.substrates[input.substrateId]
  if (!substrate) {
    throw new Error(`Unknown substrate: ${input.substrateId}`)
  }

  const area = input.widthIn * input.heightIn
  const breakMult = qtyBreakMultiplier(input.qty, book.qtyBreaks)

  const matCost = area * substrate.costPerSqIn * input.qty * (1 + book.spoilageRate)
  const clickCost = substrate.clickPerSide * input.sides * input.qty
  const finCost = input.finishing.reduce((sum, key) => {
    const ff = book.finishing[key]
    if (!ff) return sum
    return sum + ff.flat + ff.perUnit * input.qty
  }, 0)

  const cost = (matCost + clickCost + finCost) * breakMult + book.setupFee
  const price = book.targetMarginPct >= 100 ? cost : cost / (1 - book.targetMarginPct / 100)
  const marginPct = price > 0 ? ((price - cost) / price) * 100 : 0

  const dims = `${input.widthIn}" × ${input.heightIn}"`
  const sidesLabel = input.sides === 2 ? '4/4' : '4/0'

  const lineItems: QuoteResult['lineItems'] = [
    {
      description: `${substrate.label} — ${dims}, qty ${input.qty}, ${sidesLabel}`,
      category: 'materials',
      quantity: input.qty,
      unit_price: round2((matCost * breakMult) / input.qty),
    },
    {
      description: `Press clicks (${input.sides}-side)`,
      category: 'labor',
      quantity: input.qty,
      unit_price: round2((clickCost * breakMult) / input.qty),
    },
    {
      description: 'Job setup',
      category: 'labor',
      quantity: 1,
      unit_price: round2(book.setupFee),
    },
  ]

  for (const key of input.finishing) {
    const ff = book.finishing[key]
    if (!ff) continue
    const lineTotal = ff.flat + ff.perUnit * input.qty
    lineItems.push({
      description: ff.label,
      category: 'finishing',
      quantity: 1,
      unit_price: round2(lineTotal),
    })
  }

  const rawSum = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const markup = rawSum > 0 ? price / rawSum : 1
  let markedLineItems = lineItems.map((item) => ({
    ...item,
    unit_price: round2(item.unit_price * markup),
  }))
  const markedSum = markedLineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  if (markedLineItems.length > 0 && Math.abs(markedSum - price) > 0.01) {
    const last = markedLineItems[markedLineItems.length - 1]
    const others = markedSum - last.quantity * last.unit_price
    last.unit_price = round2((price - others) / last.quantity)
  }

  return {
    cost: round2(cost),
    price: round2(price),
    marginPct: round2(marginPct),
    lineItems: markedLineItems,
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function parsePriceBook(json: string | null | undefined): PriceBook {
  if (!json) return DEFAULT_PRICE_BOOK
  try {
    const parsed = JSON.parse(json) as PriceBook
    if (!parsed.substrates || !parsed.finishing) return DEFAULT_PRICE_BOOK
    return { ...DEFAULT_PRICE_BOOK, ...parsed }
  } catch {
    return DEFAULT_PRICE_BOOK
  }
}
