import { useState } from 'react'

interface CloudImportDialogProps {
  workbookId: number
  onClose: () => void
  onImport: (command: string, args: Record<string, unknown>) => Promise<void>
}

function extractId(url: string): string {
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{20,})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return url
}

function extractDatabaseId(url: string): string {
  const patterns = [
    /notion\.site\/([a-f0-9]{32})/,
    /notion\.so\/([a-f0-9]{32})/,
    /^([a-f0-9]{32})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return url
}

export default function CloudImportDialog({ workbookId, onClose, onImport }: CloudImportDialogProps) {
  const [tab, setTab] = useState<'google' | 'notion'>('google')
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [range, setRange] = useState('Sheet1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImport = async () => {
    setError('')
    if (!input.trim()) { setError('Paste a URL or enter an ID'); return }
    if (!apiKey.trim()) { setError('API key is required'); return }
    setLoading(true)
    try {
      if (tab === 'google') {
        const id = extractId(input.trim())
        await onImport('import_google_sheet', {
          workbookId,
          spreadsheetId: id,
          apiKey: apiKey.trim(),
          range: range.trim() || 'Sheet1',
        })
      } else {
        const id = extractDatabaseId(input.trim())
        await onImport('import_notion_database', {
          workbookId,
          databaseId: id,
          apiKey: apiKey.trim(),
        })
      }
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Import from Cloud</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-tabs">
          <button className={`modal-tab ${tab === 'google' ? 'active' : ''}`} onClick={() => setTab('google')}>Google Sheets</button>
          <button className={`modal-tab ${tab === 'notion' ? 'active' : ''}`} onClick={() => setTab('notion')}>Notion</button>
        </div>
        <div className="modal-body">
          {tab === 'google' ? (
            <>
              <label>Spreadsheet URL or ID</label>
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <label>API Key <span className="hint">(Google Cloud API key with Sheets API enabled)</span></label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <label>Range</label>
              <input
                type="text"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              />
            </>
          ) : (
            <>
              <label>Database URL or ID</label>
              <input
                type="text"
                placeholder="https://www.notion.so/abc123... or database ID"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <label>Internal Integration Secret <span className="hint">(Notion API key)</span></label>
              <input
                type="password"
                placeholder="secret_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </>
          )}
          {error && <p className="modal-error">{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
