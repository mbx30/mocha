import { useState, useMemo } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'

interface ArtworkPreviewProps {
  filePath: string
  showOpenButton?: boolean
  height?: number
  onOpenInPdfTools?: (path: string) => void
}

type FormatKind = 'image' | 'tiff' | 'unsupported'

function classify(filePath: string): FormatKind {
  const ext = filePath.toLowerCase().split('.').pop() ?? ''
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) return 'image'
  if (['tif', 'tiff'].includes(ext)) return 'tiff'
  return 'unsupported'
}

export default function ArtworkPreview({ filePath, height = 240, onOpenInPdfTools }: ArtworkPreviewProps) {
  const format = useMemo(() => classify(filePath), [filePath])
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="artwork-preview" style={{ minHeight: height }}>
      <div className="artwork-preview-frame" style={{ minHeight: height }}>
        {format === 'image' && (
          <img
            className="artwork-preview-img"
            src={convertFileSrc(filePath)}
            alt={`Artwork preview of ${filePath}`}
          />
        )}
        {format === 'tiff' && (
          <div className="artwork-preview-fallback">
            <span className="artwork-preview-icon">🖼️</span>
            <p>TIFF preview not supported in the embedded viewer.</p>
            <p className="artwork-preview-hint">Open the file with the system image viewer to inspect it.</p>
          </div>
        )}
        {format === 'unsupported' && (
          <div className="artwork-preview-fallback">
            <span className="artwork-preview-icon">📄</span>
            <p>No inline preview available for this file type.</p>
          </div>
        )}
      </div>

      <div className="artwork-preview-meta">
        <span className="artwork-preview-name" title={filePath}>{filePath.split(/[\\/]/).pop()}</span>
        {onOpenInPdfTools && (
          <button className="artwork-preview-expand" onClick={() => onOpenInPdfTools(filePath)}>
            PDF Tools
          </button>
        )}
        {format === 'image' && (
          <button className="artwork-preview-expand" onClick={() => setExpanded(true)}>
            Expand
          </button>
        )}
      </div>

      {expanded && (
        <div className="artwork-preview-modal" role="dialog" aria-label="Artwork preview">
          <div className="artwork-preview-modal-backdrop" onClick={() => setExpanded(false)} />
          <div className="artwork-preview-modal-content">
            <button className="artwork-preview-modal-close" onClick={() => setExpanded(false)} aria-label="Close preview">
              ✕
            </button>
            {format === 'image' && (
              <img
                className="artwork-preview-modal-img"
                src={convertFileSrc(filePath)}
                alt={`Large preview of ${filePath}`}
              />
            )}
            {format === 'tiff' && (
              <div className="artwork-preview-fallback">
                <span className="artwork-preview-icon">🖼️</span>
                <p>TIFF preview not supported in the embedded viewer.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
