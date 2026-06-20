import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface PageOperationsPanelProps {
  filePath: string
  pageCount: number
  onRefresh: () => void
}

export default function PageOperationsPanel({ filePath, pageCount, onRefresh }: PageOperationsPanelProps) {
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [pageDimensions, setPageDimensions] = useState<Record<number, { width: number; height: number }>>({})

  useEffect(() => {
    setSelectedPages(new Set())
    setThumbnails({})
    const max = Math.min(pageCount, 40)
    for (let i = 0; i < max; i++) {
      invoke<string>('render_page_thumbnail', { path: filePath, pageIndex: i, widthPx: 100 })
        .then(url => setThumbnails(prev => ({ ...prev, [i]: url })))
        .catch(() => {})
      invoke<any>('get_page_dimensions', { path: filePath, pageIndex: i })
        .then(dims => setPageDimensions(prev => ({ ...prev, [i]: { width: dims.width_mm, height: dims.height_mm } })))
        .catch(() => {})
    }
  }, [filePath, pageCount])

  const togglePage = (idx: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }

  const extractSelected = async () => {
    if (selectedPages.size === 0) return
    setLoading(true)
    try {
      const indices = Array.from(selectedPages).sort()
      const outPath = filePath.replace('.pdf', '_extracted.pdf')
      await invoke('extract_pages', { path: filePath, indices, outputPath: outPath })
      alert(`Extracted ${indices.length} pages to ${outPath}`)
      onRefresh()
    } catch (e) {
      alert('Extract failed: ' + e)
    } finally {
      setLoading(false)
    }
  }

  const deleteSelected = async () => {
    if (selectedPages.size === 0) return
    if (!confirm(`Delete ${selectedPages.size} page(s)?`)) return
    setLoading(true)
    try {
      const indices = Array.from(selectedPages).sort()
      const outPath = filePath.replace('.pdf', '_deleted.pdf')
      await invoke('delete_pages', { path: filePath, indices, outputPath: outPath })
      alert(`Deleted pages saved to ${outPath}`)
      onRefresh()
    } catch (e) {
      alert('Delete failed: ' + e)
    } finally {
      setLoading(false)
    }
  }

  const rotateSelected = async (degrees: number) => {
    if (selectedPages.size === 0) return
    setLoading(true)
    try {
      for (const idx of selectedPages) {
        const outPath = filePath.replace('.pdf', '_rotated.pdf')
        await invoke('rotate_page', { path: filePath, pageIndex: idx, degrees, outputPath: outPath })
      }
      alert('Rotated')
      onRefresh()
    } catch (e) {
      alert('Rotate failed: ' + e)
    } finally {
      setLoading(false)
    }
  }

  const reorderPages = async () => {
    const orderStr = prompt('Enter new page order (comma-separated, 1-based):')
    if (!orderStr) return
    const newOrder = orderStr.split(',').map(s => parseInt(s.trim()) - 1).filter(n => n >= 0 && n < pageCount)
    if (newOrder.length !== pageCount) {
      alert('Invalid order')
      return
    }
    setLoading(true)
    try {
      const outPath = filePath.replace('.pdf', '_reordered.pdf')
      await invoke('reorder_pages', { path: filePath, newOrder, outputPath: outPath })
      alert(`Reordered saved to ${outPath}`)
      onRefresh()
    } catch (e) {
      alert('Reorder failed: ' + e)
    } finally {
      setLoading(false)
    }
  }

  const insertBlank = async () => {
    const afterStr = prompt('Insert blank page after which page number?')
    if (!afterStr) return
    const afterIdx = parseInt(afterStr) - 1
    if (afterIdx < 0 || afterIdx >= pageCount) { alert('Invalid page'); return }
    const wStr = prompt('Width in mm (default 210):') || '210'
    const hStr = prompt('Height in mm (default 297):') || '297'
    setLoading(true)
    try {
      const outPath = filePath.replace('.pdf', '_inserted.pdf')
      await invoke('insert_blank_page', {
        path: filePath, afterIndex: afterIdx, widthMm: parseFloat(wStr), heightMm: parseFloat(hStr), outputPath: outPath
      })
      alert(`Blank page inserted, saved to ${outPath}`)
      onRefresh()
    } catch (e) {
      alert('Insert failed: ' + e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-ops-panel">
      <h4>Page Operations</h4>
      <div className="page-ops-toolbar">
        <button className="btn btn-secondary" onClick={() => setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i)))}>All</button>
        <button className="btn btn-secondary" onClick={() => setSelectedPages(new Set())}>None</button>
        <button className="btn btn-primary" onClick={extractSelected} disabled={loading || selectedPages.size === 0}>Extract</button>
        <button className="btn btn-danger" onClick={deleteSelected} disabled={loading || selectedPages.size === 0}>Delete</button>
        <button className="btn btn-secondary" onClick={() => rotateSelected(90)} disabled={loading || selectedPages.size === 0}>↻ 90°</button>
        <button className="btn btn-secondary" onClick={() => rotateSelected(180)} disabled={loading || selectedPages.size === 0}>↻ 180°</button>
        <button className="btn btn-secondary" onClick={reorderPages} disabled={loading}>Reorder</button>
        <button className="btn btn-secondary" onClick={insertBlank} disabled={loading}>+ Blank</button>
      </div>
      <div className="page-ops-grid">
        {Array.from({ length: Math.min(pageCount, 40) }, (_, i) => (
          <div
            key={i}
            className={`page-ops-thumb ${selectedPages.has(i) ? 'selected' : ''}`}
            onClick={() => togglePage(i)}
          >
            {thumbnails[i] ? (
              <img src={`file://${thumbnails[i]}`} alt={`Page ${i + 1}`} />
            ) : (
              <div className="thumb-placeholder">{i + 1}</div>
            )}
            <span className="page-ops-label">Pg {i + 1}</span>
            {pageDimensions[i] && (
              <span className="page-ops-size">{pageDimensions[i].width.toFixed(0)}×{pageDimensions[i].height.toFixed(0)}mm</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
