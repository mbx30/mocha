import { describe, it, expect } from 'vitest'
import { priceQuote, DEFAULT_PRICE_BOOK, round2 } from './priceBook'

describe('priceQuote', () => {
  it('computes business card quote with margin', () => {
    const result = priceQuote(
      {
        substrateId: '16pt-c2s',
        widthIn: 3.5,
        heightIn: 2,
        qty: 500,
        sides: 2,
        finishing: ['lamination'],
      },
      DEFAULT_PRICE_BOOK
    )

    expect(result.cost).toBeGreaterThan(0)
    expect(result.price).toBeGreaterThan(result.cost)
    expect(result.marginPct).toBeCloseTo(DEFAULT_PRICE_BOOK.targetMarginPct, 0)
    expect(result.lineItems.length).toBeGreaterThanOrEqual(3)
    expect(result.lineItems.some((i) => i.category === 'finishing')).toBe(true)
  })

  it('applies quantity break multiplier', () => {
    const small = priceQuote(
      { substrateId: '16pt-c2s', widthIn: 3.5, heightIn: 2, qty: 100, sides: 1, finishing: [] },
      DEFAULT_PRICE_BOOK
    )
    const large = priceQuote(
      { substrateId: '16pt-c2s', widthIn: 3.5, heightIn: 2, qty: 1000, sides: 1, finishing: [] },
      DEFAULT_PRICE_BOOK
    )
    const smallPerUnit = small.cost / 100
    const largePerUnit = large.cost / 1000
    expect(largePerUnit).toBeLessThan(smallPerUnit)
  })

  it('rounds to two decimals', () => {
    expect(round2(1.006)).toBe(1.01)
    expect(round2(1.004)).toBe(1)
  })
})
