import { useState, useEffect, useCallback } from 'react'
import { Button, Card, Input, Select } from '../design-system'
import { loadPriceBook } from './priceBookPrefs'
import { priceQuote, type PriceBook, type QuoteInput } from './priceBook'
import type { EstimateLineItem } from '../types'
import './QuoteBuilder.css'

type DraftLineItem = EstimateLineItem & { tempId?: string }

interface QuoteBuilderProps {
  onAddItems: (items: DraftLineItem[]) => void
  onReplaceItems: (items: DraftLineItem[]) => void
}

export default function QuoteBuilder({ onAddItems, onReplaceItems }: QuoteBuilderProps) {
  const [book, setBook] = useState<PriceBook | null>(null)
  const [substrateId, setSubstrateId] = useState('16pt-c2s')
  const [widthIn, setWidthIn] = useState('3.5')
  const [heightIn, setHeightIn] = useState('2')
  const [qty, setQty] = useState('500')
  const [sides, setSides] = useState<'1' | '2'>('2')
  const [finishing, setFinishing] = useState<string[]>([])
  const [preview, setPreview] = useState<ReturnType<typeof priceQuote> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPriceBook().then(setBook)
  }, [])

  const buildInput = useCallback((): QuoteInput | null => {
    const w = parseFloat(widthIn)
    const h = parseFloat(heightIn)
    const q = parseInt(qty, 10)
    if (!w || !h || !q) return null
    return {
      substrateId,
      widthIn: w,
      heightIn: h,
      qty: q,
      sides: sides === '2' ? 2 : 1,
      finishing,
    }
  }, [substrateId, widthIn, heightIn, qty, sides, finishing])

  useEffect(() => {
    if (!book) return
    const input = buildInput()
    if (!input) {
      setPreview(null)
      return
    }
    try {
      setPreview(priceQuote(input, book))
      setError(null)
    } catch (e) {
      setPreview(null)
      setError(String(e))
    }
  }, [book, buildInput])

  const toDraftItems = (): DraftLineItem[] => {
    if (!preview) return []
    return preview.lineItems.map((item, i) => ({
      id: 0,
      estimate_id: 0,
      ...item,
      sort_order: i,
      tempId: `quote-${Date.now()}-${i}`,
    }))
  }

  const toggleFinishing = (key: string) => {
    setFinishing((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  if (!book) return <div className="quote-builder-loading">Loading price book…</div>

  const substrateOptions = Object.entries(book.substrates).map(([id, s]) => ({
    value: id,
    label: s.label,
  }))

  return (
    <Card className="quote-builder">
      <h3 className="quote-builder-title">Quote Builder</h3>
      <p className="quote-builder-hint">Print-aware pricing from your price book.</p>

      <div className="quote-builder-grid">
        <Select
          label="Substrate"
          value={substrateId}
          onChange={(e) => setSubstrateId(e.target.value)}
          options={substrateOptions}
        />
        <Input
          label="Width (in)"
          type="number"
          value={widthIn}
          onChange={(e) => setWidthIn(e.target.value)}
          min={0}
          step="0.125"
        />
        <Input
          label="Height (in)"
          type="number"
          value={heightIn}
          onChange={(e) => setHeightIn(e.target.value)}
          min={0}
          step="0.125"
        />
        <Input
          label="Quantity"
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          min={1}
        />
        <Select
          label="Sides"
          value={sides}
          onChange={(e) => setSides(e.target.value as '1' | '2')}
          options={[
            { value: '1', label: '1-sided (4/0)' },
            { value: '2', label: '2-sided (4/4)' },
          ]}
        />
      </div>

      <div className="quote-builder-finishing">
        <span className="quote-builder-label">Finishing</span>
        <div className="quote-builder-chips">
          {Object.entries(book.finishing).map(([key, f]) => (
            <button
              key={key}
              type="button"
              className={`quote-chip ${finishing.includes(key) ? 'quote-chip--active' : ''}`}
              onClick={() => toggleFinishing(key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="quote-builder-error">{error}</p>}

      {preview && (
        <div className="quote-builder-margin">
          Cost <strong>${preview.cost.toFixed(2)}</strong>
          {' → '}
          Quote <strong>${preview.price.toFixed(2)}</strong>
          {' '}
          <span className="quote-margin-pct">({preview.marginPct.toFixed(1)}% margin)</span>
        </div>
      )}

      <div className="quote-builder-actions">
        <Button
          variant="primary"
          size="md"
          disabled={!preview}
          onClick={() => onAddItems(toDraftItems())}
        >
          Add to estimate
        </Button>
        <Button
          variant="secondary"
          size="md"
          disabled={!preview}
          onClick={() => {
            if (confirm('Replace all line items with this quote?')) {
              onReplaceItems(toDraftItems())
            }
          }}
        >
          Replace line items
        </Button>
      </div>
    </Card>
  )
}
