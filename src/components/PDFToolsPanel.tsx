import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { Button } from '../design-system'
import './PDFToolsPanel.css'

type ServiceStatus = 'checking' | 'online' | 'offline' | 'starting'

export default function PDFToolsPanel() {
  const [status, setStatus] = useState<ServiceStatus>('checking')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const checkHealth = useCallback(async () => {
    setStatus('checking')
    try {
      const ok = await invoke<boolean>('stirling_health')
      setStatus(ok ? 'online' : 'offline')
    } catch {
      setStatus('offline')
    }
  }, [])

  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  const handleStartService = async () => {
    setStatus('starting')
    setMessage(null)
    setBusy(true)
    try {
      const msg = await invoke<string>('stirling_start')
      setMessage(msg)
      setStatus('online')
    } catch (e) {
      setMessage(String(e))
      setStatus('offline')
    } finally {
      setBusy(false)
    }
  }

  const pickPdf = async (multiple: boolean): Promise<string[] | null> => {
    const selected = await open({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      multiple,
    })
    if (!selected) return null
    return Array.isArray(selected) ? selected : [selected]
  }

  const pickOutput = async (defaultName: string): Promise<string | null> => {
    return save({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: defaultName,
    })
  }

  const runOp = async (label: string, fn: () => Promise<string>) => {
    setMessage(null)
    setBusy(true)
    try {
      const out = await fn()
      setMessage(`${label} complete → ${out.split(/[\\/]/).pop()}`)
    } catch (e) {
      setMessage(`${label} failed: ${e}`)
    } finally {
      setBusy(false)
    }
  }

  const handleCompress = async () => {
    if (status !== 'online') {
      setMessage('Start the PDF service first.')
      return
    }
    const inputs = await pickPdf(false)
    if (!inputs?.[0]) return
    const output = await pickOutput('compressed.pdf')
    if (!output) return
    await runOp('Compress', () =>
      invoke<string>('pdf_compress', { inputPath: inputs[0], outputPath: output })
    )
  }

  const handleMerge = async () => {
    if (status !== 'online') {
      setMessage('Start the PDF service first.')
      return
    }
    const inputs = await pickPdf(true)
    if (!inputs || inputs.length < 2) {
      setMessage('Select at least two PDFs to merge.')
      return
    }
    const output = await pickOutput('merged.pdf')
    if (!output) return
    await runOp('Merge', () =>
      invoke<string>('pdf_merge', { inputPaths: inputs, outputPath: output })
    )
  }

  const handleRotate = async () => {
    if (status !== 'online') {
      setMessage('Start the PDF service first.')
      return
    }
    const inputs = await pickPdf(false)
    if (!inputs?.[0]) return
    const output = await pickOutput('rotated.pdf')
    if (!output) return
    await runOp('Rotate', () =>
      invoke<string>('pdf_rotate', {
        inputPath: inputs[0],
        angle: 90,
        outputPath: output,
      })
    )
  }

  const statusLabel =
    status === 'checking'
      ? 'Checking…'
      : status === 'online'
        ? 'PDF service online'
        : status === 'starting'
          ? 'Starting…'
          : 'PDF service offline'

  return (
    <div className="pdf-tools">
      <header className="pdf-tools-header">
        <div>
          <h1>PDF Tools</h1>
          <p className="pdf-tools-sub">
            Merge, compress, and convert via Stirling PDF (Docker sidecar on port 8080).
          </p>
        </div>
        <div className={`pdf-tools-status pdf-tools-status--${status}`}>
          <span className="pdf-tools-status-dot" />
          {statusLabel}
        </div>
      </header>

      {status === 'offline' && (
        <div className="pdf-tools-banner">
          <p>
            Stirling PDF is not reachable. Ensure Docker is installed, then start the sidecar.
          </p>
          <Button variant="primary" size="md" onClick={handleStartService} disabled={busy}>
            Start PDF service
          </Button>
        </div>
      )}

      <div className="pdf-tools-actions">
        <Button variant="secondary" size="md" onClick={handleCompress} disabled={busy || status !== 'online'}>
          Compress PDF
        </Button>
        <Button variant="secondary" size="md" onClick={handleMerge} disabled={busy || status !== 'online'}>
          Merge PDFs
        </Button>
        <Button variant="secondary" size="md" onClick={handleRotate} disabled={busy || status !== 'online'}>
          Rotate 90°
        </Button>
        <Button variant="ghost" size="md" onClick={checkHealth} disabled={busy}>
          Refresh status
        </Button>
      </div>

      {message && <p className="pdf-tools-message">{message}</p>}
    </div>
  )
}
