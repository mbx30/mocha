import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { LayerInfo } from '../../types'

interface LayerPanelProps {
  filePath: string
}

export default function LayerPanel({ filePath }: LayerPanelProps) {
  const [layers, setLayers] = useState<LayerInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLayers()
  }, [filePath])

  const loadLayers = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await invoke<LayerInfo[]>('list_layers', { path: filePath })
      setLayers(result)
    } catch (e) {
      setError(String(e))
      setLayers([])
    } finally {
      setLoading(false)
    }
  }

  const toggleVisibility = (idx: number) => {
    setLayers(prev => prev.map((l, i) => i === idx ? { ...l, visible: !l.visible } : l))
  }

  if (loading) return <div className="layer-panel"><p>Loading layers...</p></div>

  return (
    <div className="layer-panel">
      <h4>Layers</h4>
      {error && <p className="text-warning">{error}</p>}
      {layers.length === 0 && !error && <p className="text-muted">No layers found</p>}
      <div className="layer-list">
        {layers.map((layer, idx) => (
          <div key={layer.object_id} className="layer-item">
            <button
              className={`layer-vis-toggle ${layer.visible ? 'visible' : 'hidden'}`}
              onClick={() => toggleVisibility(idx)}
              title={layer.visible ? 'Hide layer' : 'Show layer'}
            >
              {layer.visible ? '👁' : '—'}
            </button>
            <span className="layer-name">{layer.name || '(unnamed)'}</span>
            {layer.locked && <span className="layer-locked">🔒</span>}
          </div>
        ))}
      </div>
      <button className="btn btn-secondary" onClick={loadLayers} style={{ marginTop: 8 }}>Refresh</button>
    </div>
  )
}
