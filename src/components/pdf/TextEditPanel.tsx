import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { TextMatch, ReplaceResult } from '../../types'

interface TextEditPanelProps {
  filePath: string
  pageCount: number
}

export default function TextEditPanel({ filePath, pageCount }: TextEditPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TextMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [replaceFind, setReplaceFind] = useState('')
  const [replaceWith, setReplaceWith] = useState('')
  const [replacePage, setReplacePage] = useState(0)
  const [replacing, setReplacing] = useState(false)
  const [replaceResult, setReplaceResult] = useState<ReplaceResult | null>(null)

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    try {
      const matches = await invoke<TextMatch[]>('search_text', { path: filePath, query })
      setResults(matches)
    } catch (e) {
      console.error('Search failed:', e)
    } finally {
      setSearching(false)
    }
  }

  const doReplace = async () => {
    if (!replaceFind.trim()) return
    setReplacing(true)
    setReplaceResult(null)
    try {
      const result = await invoke<ReplaceResult>('replace_text', {
        path: filePath,
        pageIndex: replacePage,
        find: replaceFind,
        replace: replaceWith,
        outputPath: filePath.replace('.pdf', '_replaced.pdf'),
      })
      setReplaceResult(result)
    } catch (e) {
      console.error('Replace failed:', e)
    } finally {
      setReplacing(false)
    }
  }

  return (
    <div className="text-edit-panel">
      <h4>Text Search</h4>
      <div className="search-bar">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search text..."
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button className="btn btn-primary" onClick={search} disabled={searching}>
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="search-results">
          <p className="text-muted">{results.length} match(es)</p>
          <div className="search-results-list">
            {results.slice(0, 100).map((r, i) => (
              <div key={i} className="search-result-item">
                <span className="result-page">Pg {r.page_index + 1}</span>
                <span className="result-text">...{r.text}...</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <hr />

      <h4>Replace Text</h4>
      <div className="replace-form">
        <div>
          <label>Find:</label>
          <input type="text" value={replaceFind} onChange={e => setReplaceFind(e.target.value)} />
        </div>
        <div>
          <label>Replace:</label>
          <input type="text" value={replaceWith} onChange={e => setReplaceWith(e.target.value)} />
        </div>
        <div>
          <label>Page:</label>
          <input type="number" min={0} max={pageCount - 1} value={replacePage}
            onChange={e => setReplacePage(Math.min(pageCount - 1, Math.max(0, parseInt(e.target.value) || 0)))} />
          <span className="text-muted" style={{ marginLeft: 4 }}>/ {pageCount - 1}</span>
        </div>
        <button className="btn btn-primary" onClick={doReplace} disabled={replacing}>
          {replacing ? '...' : 'Replace'}
        </button>
        {replaceResult && (
          <p className="text-success">{replaceResult.replacements_made} replacement(s) made → {replaceResult.output_path}</p>
        )}
      </div>
    </div>
  )
}
