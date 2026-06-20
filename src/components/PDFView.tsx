import { useState, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { PdfSummary, CombinedPreflightResult } from '../types'
import PreflightReport from './preflight/PreflightReport'
import PdfInspector from './preflight/PdfInspector'
import './PDFView.css'

interface PDFViewProps {
  summary: PdfSummary | null
  jobs: PdfSummary[]
  onOpenFile: () => Promise<void>
  onSaveJob: () => Promise<void>
  onDeleteJob: (id: number) => Promise<void>
  onLoadJob: (id: number) => Promise<void>
  error: string | null
  onClearError: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ThumbnailStrip({ filePath, pageCount, currentPage, onSelectPage }: {
  filePath: string
  pageCount: number
  currentPage: number
  onSelectPage: (n: number) => void
}) {
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({})

  useEffect(() => {
    setThumbnails({})
    const max = Math.min(pageCount, 20)
    let cancelled = false
    for (let i = 0; i < max; i++) {
      invoke<string>('render_page_thumbnail', { path: filePath, pageIndex: i, widthPx: 120 })
        .then((url) => { if (!cancelled) setThumbnails((prev) => ({ ...prev, [i]: url })) })
        .catch(() => {})
    }
    return () => { cancelled = true }
  }, [filePath, pageCount])

  return (
    <div className="thumb-strip">
      {Array.from({ length: Math.min(pageCount, 20) }, (_, i) => (
        <button
          key={i}
          className={`thumb-item ${i === currentPage ? 'thumb-item--active' : ''}`}
          onClick={() => onSelectPage(i)}
        >
          {thumbnails[i] ? (
            <img src={`file://${thumbnails[i]}`} alt={`Page ${i + 1}`} />
          ) : (
            <div className="thumb-placeholder">{i + 1}</div>
          )}
        </button>
      ))}
    </div>
  )
}

function PageViewer({ filePath, pageIndex }: { filePath: string; pageIndex: number }) {
  const [renderUrl, setRenderUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setRenderUrl(null)
    const dpi = Math.round(72 * zoom / 100)
    invoke<string>('render_page', { path: filePath, pageIndex, dpi })
      .then((url) => setRenderUrl(url))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filePath, pageIndex, zoom])

  return (
    <div className="page-viewer">
      <div className="page-toolbar">
        <button onClick={() => setZoom((z) => Math.max(25, z - 25))} title="Zoom out">−</button>
        <span className="zoom-label">{zoom}%</span>
        <button onClick={() => setZoom((z) => Math.min(400, z + 25))} title="Zoom in">+</button>
        <button onClick={() => setZoom(100)} title="Fit to width">Fit</button>
      </div>
      <div className="page-canvas">
        {loading && <div className="page-loading">Rendering...</div>}
        {renderUrl && <img src={`file://${renderUrl}`} alt={`Page ${pageIndex + 1}`} style={{ maxWidth: `${zoom}%` }} />}
      </div>
    </div>
  )
}

export default function PDFView({ summary, jobs, onOpenFile, onSaveJob, onDeleteJob, onLoadJob, error, onClearError }: PDFViewProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [showViewer, setShowViewer] = useState(false)
  const [preflightResult, setPreflightResult] = useState<CombinedPreflightResult | null>(null)
  const [runningPreflight, setRunningPreflight] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showInspector, setShowInspector] = useState(false)
  const [savedRunId, setSavedRunId] = useState<number | null>(null)

  useEffect(() => { setCurrentPage(0); setShowViewer(false); setPreflightResult(null); setShowReport(false) }, [summary?.file_path])

  const runFullPreflight = useCallback(async () => {
    if (!summary) return
    setRunningPreflight(true)
    try {
      const result = await invoke<CombinedPreflightResult>('check_full_preflight', { path: summary.file_path })
      setPreflightResult(result)
      setShowReport(true)
    } catch (e) {
      console.error('Preflight failed:', e)
    } finally {
      setRunningPreflight(false)
    }
  }, [summary])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && showViewer) {
      setCurrentPage(p => Math.max(0, p - 1))
    } else if (e.key === 'ArrowRight' && showViewer) {
      setCurrentPage(p => Math.min((summary?.page_count ?? 1) - 1, p + 1))
    } else if (e.key === '+' || e.key === '=') {
      // Zoom in handled by PageViewer's internal state, but we can trigger a re-render
    } else if (e.key === '-') {
      // Zoom out
    } else if (e.key === 'o' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onOpenFile()
    } else if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      runFullPreflight()
    } else if (e.key === 'Escape') {
      setShowReport(false)
    }
  }, [showViewer, summary?.page_count, onOpenFile, runFullPreflight])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="pdf-view">
      <div className="pdf-sidebar">
        <h3>Recent PDFs</h3>
        <button className="btn btn-primary pdf-open-btn" onClick={onOpenFile} title="Ctrl+O to open">
          Open PDF
        </button>
        <div className="pdf-job-list">
          {jobs.length === 0 && <p className="pdf-empty">No recent files</p>}
          {jobs.map((job) => (
            <div key={job.id} className="pdf-job-item">
              <button className="pdf-job-name" onClick={() => onLoadJob(job.id)}>
                {job.file_name}
              </button>
              <span className="pdf-job-meta">{job.page_count}p</span>
              <button className="pdf-job-delete" onClick={() => onDeleteJob(job.id)} title="Remove">
                ✕
              </button>
            </div>
          ))}
        </div>
        {summary && (
          <ThumbnailStrip
            filePath={summary.file_path}
            pageCount={summary.page_count}
            currentPage={currentPage}
            onSelectPage={(n) => { setCurrentPage(n); setShowViewer(true) }}
          />
        )}
      </div>

      <div className="pdf-main">
        {error && (
          <div className="pdf-error-banner">
            <span>{error}</span>
            <button onClick={onClearError}>✕</button>
          </div>
        )}

        {!summary ? (
          <div className="pdf-empty-state">
            <h2>PDF Tools</h2>
            <p>Open a PDF to inspect and preflight it.</p>
            <button className="btn btn-primary" onClick={onOpenFile}>Open PDF</button>
          </div>
        ) : !showViewer ? (
          <div className="pdf-summary-card">
            <div className="pdf-summary-header">
              <h2>{summary.file_name}</h2>
              {summary.is_encrypted && <span className="pdf-badge pdf-badge-error">Encrypted</span>}
            </div>
            <div className="pdf-summary-grid">
              <div className="pdf-summary-item">
                <span className="pdf-label">Pages</span>
                <span className="pdf-value">{summary.page_count}</span>
              </div>
              <div className="pdf-summary-item">
                <span className="pdf-label">PDF Version</span>
                <span className="pdf-value">{summary.pdf_version}</span>
              </div>
              <div className="pdf-summary-item">
                <span className="pdf-label">File Size</span>
                <span className="pdf-value">{formatBytes(summary.file_size_bytes)}</span>
              </div>
              <div className="pdf-summary-item">
                <span className="pdf-label">Title</span>
                <span className="pdf-value">{summary.title || '—'}</span>
              </div>
              <div className="pdf-summary-item">
                <span className="pdf-label">Creator</span>
                <span className="pdf-value">{summary.creator || '—'}</span>
              </div>
              <div className="pdf-summary-item">
                <span className="pdf-label">Producer</span>
                <span className="pdf-value">{summary.producer || '—'}</span>
              </div>
            </div>
            <div className="pdf-summary-actions">
              <button className="btn btn-primary" onClick={() => setShowViewer(true)}>View Pages</button>
              <button className="btn btn-secondary pdf-save-btn" onClick={onSaveJob}>Save to History</button>
              <button className="btn btn-secondary" onClick={runFullPreflight} disabled={runningPreflight}>
                {runningPreflight ? 'Running...' : 'Run Full Preflight (Ctrl+R)'}
              </button>
            </div>

            {showReport && preflightResult && (
              <PreflightReport
                filePath={summary.file_path}
                result={preflightResult}
                jobId={savedRunId ?? summary.id ?? null}
                onSaved={() => { }}
              />
            )}
            <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => setShowInspector(!showInspector)}>
              {showInspector ? 'Hide Inspector' : 'Show Inspector'}
            </button>
            {showInspector && (
              <PdfInspector filePath={summary.file_path} />
            )}
          </div>
        ) : (
          <div className="pdf-viewer-section">
            <div className="pdf-viewer-header">
              <button className="btn btn-secondary" onClick={() => setShowViewer(false)}>← Back</button>
              <span className="pdf-viewer-title">{summary.file_name}</span>
              <button className="btn btn-secondary" onClick={runFullPreflight} disabled={runningPreflight} style={{ marginRight: 8 }}>
                {runningPreflight ? '...' : 'Preflight'}
              </button>
              <div className="pdf-nav">
                <button
                  disabled={currentPage <= 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  title="Previous page (←)"
                >◀</button>
                <span>Page {currentPage + 1} of {summary.page_count}</span>
                <button
                  disabled={currentPage >= summary.page_count - 1}
                  onClick={() => setCurrentPage((p) => Math.min(summary.page_count - 1, p + 1))}
                  title="Next page (→)"
                >▶</button>
              </div>
            </div>
            <PageViewer filePath={summary.file_path} pageIndex={currentPage} />
          </div>
        )}
      </div>
    </div>
  )
}
