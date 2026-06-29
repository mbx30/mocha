import { useState, useEffect } from 'react'
import { Button, Input, Card } from '../design-system'
import { DEFAULT_PRICE_BOOK, loadPriceBook, savePriceBook } from './priceBookPrefs'
import type { PriceBook } from './priceBook'
import './PriceBookEditor.css'

export default function PriceBookEditor() {
  const [book, setBook] = useState<PriceBook>(DEFAULT_PRICE_BOOK)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadPriceBook().then(setBook)
  }, [])

  const handleSave = async () => {
    await savePriceBook(book)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    if (confirm('Reset to default price book?')) {
      setBook(DEFAULT_PRICE_BOOK)
    }
  }

  return (
    <div className="price-book-editor">
      <h2>Price Book</h2>
      <p className="pbe-hint">Rates used by the Quote Builder. Stored locally on this device.</p>

      <Card className="pbe-section">
        <h3>Global</h3>
        <div className="pbe-row">
          <Input
            label="Setup fee ($)"
            type="number"
            value={String(book.setupFee)}
            onChange={(e) => setBook({ ...book, setupFee: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Spoilage rate (0–1)"
            type="number"
            step="0.01"
            value={String(book.spoilageRate)}
            onChange={(e) => setBook({ ...book, spoilageRate: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Target margin (%)"
            type="number"
            value={String(book.targetMarginPct)}
            onChange={(e) => setBook({ ...book, targetMarginPct: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </Card>

      <Card className="pbe-section">
        <h3>Substrates</h3>
        {Object.entries(book.substrates).map(([id, s]) => (
          <div key={id} className="pbe-substrate">
            <strong>{s.label}</strong>
            <div className="pbe-row">
              <Input
                label="Cost / sq in"
                type="number"
                step="0.0001"
                value={String(s.costPerSqIn)}
                onChange={(e) =>
                  setBook({
                    ...book,
                    substrates: {
                      ...book.substrates,
                      [id]: { ...s, costPerSqIn: parseFloat(e.target.value) || 0 },
                    },
                  })
                }
              />
              <Input
                label="Click / side"
                type="number"
                step="0.01"
                value={String(s.clickPerSide)}
                onChange={(e) =>
                  setBook({
                    ...book,
                    substrates: {
                      ...book.substrates,
                      [id]: { ...s, clickPerSide: parseFloat(e.target.value) || 0 },
                    },
                  })
                }
              />
            </div>
          </div>
        ))}
      </Card>

      <div className="pbe-actions">
        <Button variant="primary" onClick={handleSave}>
          {saved ? 'Saved' : 'Save price book'}
        </Button>
        <Button variant="secondary" onClick={handleReset}>
          Reset defaults
        </Button>
      </div>
    </div>
  )
}
