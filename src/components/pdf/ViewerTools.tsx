import { useState, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { t } from '../../i18n'
import type { PageDimensions } from '../../types'

interface ViewerToolsProps {
  filePath: string
  pageIndex: number
  pageCount: number
  onPageChange: (n: number) => void
}

export default function ViewerTools({ filePath, pageIndex, pageCount, onPageChange }: ViewerToolsProps) {
  const [overprintMode, setOverprintMode] = useState(false)
  const [overprintUrl, setOverprintUrl] = useState<string | null>(null)
  const [activePlate, setActivePlate] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<PageDimensions | null>(null)
  const [measuring, setMeasuring] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [endPos, setEndPos] = useState<{ x: number; y: number } | null>(null)

  const toggleOverprint = async () => {
    if (overprintUrl) {
      setOverprintUrl(null)
      setOverprintMode(false)
      return
    }
    setOverprintMode(true)
    try {
      const url = await invoke<string>('render_page_with_overprint', { path: filePath, pageIndex, dpi: 144 })
      setOverprintUrl(url)
    } catch (e) {
      console.error('Overprint render failed:', e)
      setOverprintMode(false)
    }
  }

  const showPlate = async (plate: string) => {
    setActivePlate(plate)
    try {
      await invoke<string>('render_page', { path: filePath, pageIndex, dpi: 144 })
    } catch (e) {
      console.error('Plate render failed:', e)
    }
  }

  const toggleMeasure = async () => {
    setMeasuring(!measuring)
    if (!measuring) {
      try {
        const dims = await invoke<PageDimensions>('get_page_dimensions', { path: filePath, pageIndex })
        setDimensions(dims)
      } catch { /* ignore */ }
    } else {
      setDimensions(null)
      setStartPos(null)
      setEndPos(null)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!measuring || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setEndPos(null)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!measuring || !startPos || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    setEndPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const measureDist = startPos && endPos
    ? Math.sqrt((endPos.x - startPos.x) ** 2 + (endPos.y - startPos.y) ** 2)
    : null

  return (
    <div className="viewer-tools">
      <div className="viewer-tools-bar" role="toolbar" aria-label="Viewer tools">
        <button className="btn btn-secondary" onClick={toggleOverprint} aria-pressed={overprintMode}>
          {overprintMode ? t('viewer.normal') : t('viewer.overprint_preview')}
        </button>
        <button className={`btn ${activePlate === 'Cyan' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => showPlate('Cyan')} aria-label="Cyan plate">C</button>
        <button className={`btn ${activePlate === 'Magenta' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => showPlate('Magenta')} aria-label="Magenta plate">M</button>
        <button className={`btn ${activePlate === 'Yellow' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => showPlate('Yellow')} aria-label="Yellow plate">Y</button>
        <button className={`btn ${activePlate === 'Black' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => showPlate('Black')} aria-label="Black plate">K</button>
        <button className="btn btn-secondary" onClick={toggleMeasure} aria-pressed={measuring}>
          {measuring ? t('viewer.stop') : t('viewer.measure')}
        </button>
      </div>

      <nav className="viewer-nav" aria-label={t('pdf.recent')}>
        <button disabled={pageIndex <= 0} onClick={() => onPageChange(pageIndex - 1)} aria-label={t('pdf.prev_page')}>◀</button>
        <span>{t('pdf.page_of', { current: pageIndex + 1, total: pageCount })}</span>
        <button disabled={pageIndex >= pageCount - 1} onClick={() => onPageChange(pageIndex + 1)} aria-label={t('pdf.next_page')}>▶</button>
      </nav>

      {overprintUrl && (
        <img src={`file://${overprintUrl}`} alt="Overprint preview" style={{ maxWidth: '100%' }} />
      )}

      <canvas
        ref={canvasRef}
        style={{ display: measuring ? 'block' : 'none', border: '1px solid #ccc', cursor: 'crosshair', marginTop: 8 }}
        width={400}
        height={400}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      />
      {measureDist && <div className="measure-info">Distance: {measureDist.toFixed(1)} px</div>}
      {dimensions && (
        <div className="measure-info">Page: {dimensions.width_mm.toFixed(1)} × {dimensions.height_mm.toFixed(1)} mm</div>
      )}
    </div>
  )
}
