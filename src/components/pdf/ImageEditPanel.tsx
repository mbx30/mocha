import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface ImageEditPanelProps {
  filePath: string
}

export default function ImageEditPanel({ filePath }: ImageEditPanelProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const [xobjectName, setXobjectName] = useState('')
  const [newImagePath, setNewImagePath] = useState('')
  const [optimizing, setOptimizing] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [quality, setQuality] = useState(85)
  const [convertJpeg, setConvertJpeg] = useState(true)

  const doReplace = async () => {
    if (!xobjectName.trim() || !newImagePath.trim()) return
    setReplacing(true)
    try {
      await invoke('replace_image', {
        path: filePath,
        pageIndex,
        xobjectName: xobjectName.trim(),
        newImagePath: newImagePath.trim(),
        outputPath: filePath.replace('.pdf', '_img_replaced.pdf'),
      })
      alert('Image replaced')
    } catch (e) {
      alert('Replace failed: ' + e)
    } finally {
      setReplacing(false)
    }
  }

  const doOptimize = async () => {
    if (!xobjectName.trim()) return
    setOptimizing(true)
    try {
      await invoke('optimize_image', {
        path: filePath,
        pageIndex,
        xobjectName: xobjectName.trim(),
        settings: { quality, convert_to_jpeg: convertJpeg },
        outputPath: filePath.replace('.pdf', '_optimized.pdf'),
      })
      alert('Image optimized')
    } catch (e) {
      alert('Optimize failed: ' + e)
    } finally {
      setOptimizing(false)
    }
  }

  return (
    <div className="image-edit-panel">
      <h4>Image Tools</h4>
      <div className="image-edit-form">
        <div>
          <label>Page index:</label>
          <input type="number" min={0} value={pageIndex} onChange={e => setPageIndex(parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <label>XObject name:</label>
          <input type="text" value={xobjectName} onChange={e => setXobjectName(e.target.value)} placeholder="e.g. Im0" />
        </div>
        <div>
          <label>New image path:</label>
          <input type="text" value={newImagePath} onChange={e => setNewImagePath(e.target.value)} placeholder="C:\path\to\img.png" />
        </div>
        <button className="btn btn-primary" onClick={doReplace} disabled={replacing}>
          {replacing ? '...' : 'Replace Image'}
        </button>

        <hr />

        <h4>Optimize</h4>
        <div>
          <label>JPEG quality (1-100):</label>
          <input type="number" min={1} max={100} value={quality} onChange={e => setQuality(parseInt(e.target.value) || 85)} />
        </div>
        <div>
          <label>
            <input type="checkbox" checked={convertJpeg} onChange={e => setConvertJpeg(e.target.checked)} />
            Convert to JPEG
          </label>
        </div>
        <button className="btn btn-secondary" onClick={doOptimize} disabled={optimizing}>
          {optimizing ? '...' : 'Optimize Image'}
        </button>
      </div>
    </div>
  )
}
