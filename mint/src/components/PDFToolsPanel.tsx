import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { Button, Input } from '../design-system'
import './PDFToolsPanel.css'

type ServiceStatus = 'checking' | 'online' | 'offline' | 'starting'

interface StirlingInfo {
  online: boolean
  version?: string | null
}

export default function PDFToolsPanel() {
  const [status, setStatus] = useState<ServiceStatus>('checking')
  const [version, setVersion] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [splitPages, setSplitPages] = useState('1')
  const [bleedInches, setBleedInches] = useState('0.125')
  const [addCropMarks, setAddCropMarks] = useState(true)
  const [previewPath, setPreviewPath] = useState<string | null>(null)

  const checkHealth = useCallback(async () => {
    setStatus('checking')
    try {
      const info = await invoke<StirlingInfo>('stirling_info')
      setStatus(info.online ? 'online' : 'offline')
      setVersion(info.version ?? null)
    } catch {
      setStatus('offline')
      setVersion(null)
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
      await checkHealth()
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

  const pickOutput = async (defaultName: string, extensions: string[]): Promise<string | null> => {
    return save({
      filters: [{ name: extensions[0].toUpperCase(), extensions }],
      defaultPath: defaultName,
    })
  }

  const runOp = async (label: string, fn: () => Promise<string>) => {
    setMessage(null)
    setBusy(true)
    try {
      const out = await fn()
      setMessage(`${label} complete → ${out.split(/[\\/]/).pop()}`)
      return out
    } catch (e) {
      setMessage(`${label} failed: ${e}`)
      return null
    } finally {
      setBusy(false)
    }
  }

  const requireOnline = () => {
    if (status !== 'online') {
      setMessage('Start the PDF service first.')
      return false
    }
    return true
  }

  const handleCompress = async () => {
    if (!requireOnline()) return
    const inputs = await pickPdf(false)
    if (!inputs?.[0]) return
    const output = await pickOutput('compressed.pdf', ['pdf'])
    if (!output) return
    await runOp('Compress', () =>
      invoke<string>('pdf_compress', { inputPath: inputs[0], outputPath: output })
    )
  }

  const handleMerge = async () => {
    if (!requireOnline()) return
    const inputs = await pickPdf(true)
    if (!inputs || inputs.length < 2) {
      setMessage('Select at least two PDFs to merge.')
      return
    }
    const output = await pickOutput('merged.pdf', ['pdf'])
    if (!output) return
    await runOp('Merge', () =>
      invoke<string>('pdf_merge', { inputPaths: inputs, outputPath: output })
    )
  }

  const handleSplit = async () => {
    if (!requireOnline()) return
    const inputs = await pickPdf(false)
    if (!inputs?.[0]) return
    const output = await pickOutput('split.zip', ['zip', 'pdf'])
    if (!output) return
    await runOp('Split', () =>
      invoke<string>('pdf_split', {
        inputPath: inputs[0],
        pageNumbers: splitPages.trim(),
        outputPath: output,
      })
    )
  }

  const handleRotate = async () => {
    if (!requireOnline()) return
    const inputs = await pickPdf(false)
    if (!inputs?.[0]) return
    const output = await pickOutput('rotated.pdf', ['pdf'])
    if (!output) return
    await runOp('Rotate', () =>
      invoke<string>('pdf_rotate', {
        inputPath: inputs[0],
        angle: 90,
        outputPath: output,
      })
    )
  }

  const runPreflightOnFile = async (inputPath: string, outputPath: string) => {
    const bleed = parseFloat(bleedInches) || 0.125
    return invoke<string>('pdf_print_preflight', {
      inputPath,
      outputPath,
      bleedSizeInches: bleed,
      addCropMarks,
    })
  }

  const handleBleedPreview = async () => {
    if (!requireOnline()) return
    const inputs = await pickPdf(false)
    if (!inputs?.[0]) return
    const tempOut = await pickOutput('preview_preflight.pdf', ['pdf'])
    if (!tempOut) return
    const out = await runOp('Bleed preview', () => runPreflightOnFile(inputs[0], tempOut))
    if (out) setPreviewPath(out)
  }

  const handleBleedApprove = async () => {
    if (!requireOnline()) return
    const inputs = await pickPdf(false)
    if (!inputs?.[0]) return
    const output = await pickOutput('print_ready.pdf', ['pdf'])
    if (!output) return
    const out = await runOp('Print preflight', () => runPreflightOnFile(inputs[0], output))
    if (out) setPreviewPath(out)
  }

  const statusLabel =
    status === 'checking'
      ? 'Checking…'
      : status === 'online'
        ? version
          ? `PDF service online (v${version})`
          : 'PDF service online'
        : status === 'starting'
          ? 'Starting…'
          : 'PDF service offline'

  return (
    <div className="pdf-tools">
      <header className="pdf-tools-header">
        <div>
          <h1>PDF Tools</h1>
          <p className="pdf-tools-sub">
            Merge, split, compress, and print preflight via local Stirling build.
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
            Stirling PDF is not reachable. Ensure Docker is installed, then start the sidecar from
            the monorepo root (<code>docker compose up -d --build</code>).
          </p>
          <Button variant="primary" size="md" onClick={handleStartService} disabled={busy}>
            Start PDF service
          </Button>
        </div>
      )}

      <section className="pdf-tools-section">
        <h2>General</h2>
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
      </section>

      <section className="pdf-tools-section">
        <h2>Split</h2>
        <div className="pdf-tools-row">
          <Input
            label="Page numbers"
            value={splitPages}
            onChange={(e) => setSplitPages(e.target.value)}
            placeholder="e.g. 1-3,5"
          />
          <Button variant="secondary" size="md" onClick={handleSplit} disabled={busy || status !== 'online'}>
            Split PDF
          </Button>
        </div>
      </section>

      <section className="pdf-tools-section">
        <h2>Print preflight (bleed)</h2>
        <p className="pdf-tools-hint">
          Adds bleed around trim and optional crop marks. Preview first, then save print-ready output.
        </p>
        <div className="pdf-tools-row">
          <Input
            label="Bleed (inches)"
            type="number"
            step="0.001"
            value={bleedInches}
            onChange={(e) => setBleedInches(e.target.value)}
          />
          <label className="pdf-tools-check">
            <input
              type="checkbox"
              checked={addCropMarks}
              onChange={(e) => setAddCropMarks(e.target.checked)}
            />
            Crop marks
          </label>
        </div>
        <div className="pdf-tools-actions">
          <Button variant="secondary" size="md" onClick={handleBleedPreview} disabled={busy || status !== 'online'}>
            Preview bleed
          </Button>
          <Button variant="primary" size="md" onClick={handleBleedApprove} disabled={busy || status !== 'online'}>
            Approve &amp; save
          </Button>
        </div>
        {previewPath && (
          <p className="pdf-tools-preview">Last output: {previewPath.split(/[\\/]/).pop()}</p>
        )}
      </section>

      {message && <p className="pdf-tools-message">{message}</p>}
    </div>
  )
}
