import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { IccProfileInfo, CombinedPreflightResult, ConversionResult } from '../../types'

const RENDERING_INTENTS = [
  { id: 'perceptual', label: 'Perceptual', desc: 'Best for photos — compresses gamut, maintains visual relationships' },
  { id: 'relative_colorimetric', label: 'Relative Colorimetric', desc: 'Best for logos/spot approximations — shifts white point, clips out-of-gamut' },
  { id: 'absolute_colorimetric', label: 'Absolute Colorimetric', desc: 'Preserves absolute values — only for simulating one press on another' },
  { id: 'saturation', label: 'Saturation', desc: 'Best for business graphics — maximizes saturation, not color-accurate' },
]

const SCOPES = [
  { id: 'both', label: 'Images + Vector' },
  { id: 'images', label: 'Images Only' },
  { id: 'vector', label: 'Vector Only' },
]

interface ColorConversionPanelProps {
  filePath: string
  preflightResult: CombinedPreflightResult | null
}

export default function ColorConversionPanel({ filePath, preflightResult }: ColorConversionPanelProps) {
  const [profiles, setProfiles] = useState<IccProfileInfo[]>([])
  const [srcProfile, setSrcProfile] = useState('sRGB_v4')
  const [dstProfile, setDstProfile] = useState('ISOcoated_v2')
  const [intent, setIntent] = useState('perceptual')
  const [scope, setScope] = useState('both')
  const [converting, setConverting] = useState(false)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    invoke<IccProfileInfo[]>('list_icc_profiles').then(setProfiles).catch(() => {})
  }, [])

  const handleConvert = async () => {
    setConverting(true)
    setError(null)
    setResult(null)
    try {
      const outputPath = filePath.replace(/\.pdf$/i, '_CMYK.pdf')
      const res = await invoke<ConversionResult>('convert_rgb_to_cmyk', {
        path: filePath,
        outputPath,
        scope,
        srcProfile,
        dstProfile,
        renderingIntent: intent,
      })
      setResult(res)
    } catch (e) {
      setError(String(e))
    } finally {
      setConverting(false)
    }
  }

  const needsConversion = preflightResult?.color_spaces?.some(
    (cs) => cs.color_space === 'DeviceRGB' || cs.color_space.startsWith('ICCBased')
  ) ?? false

  return (
    <div className="color-conversion-panel">
      <div className="pdf-preflight-header">
        <h4>RGB → CMYK Conversion</h4>
        {needsConversion && <span className="pdf-badge pdf-badge-error">RGB detected</span>}
      </div>

      {!needsConversion && (
        <p className="pdf-empty">No RGB content detected — conversion not needed.</p>
      )}

      <div className="conversion-form">
        <div className="conversion-field">
          <label className="pdf-label">Source Profile</label>
          <select value={srcProfile} onChange={e => setSrcProfile(e.target.value)} className="form-select">
            {profiles.filter(p => p.color_space_type === 'RGB' || p.color_space_type === 'GRAY').map(p => (
              <option key={p.name} value={p.name}>{p.description}</option>
            ))}
            <option value="sRGB_v4">sRGB v4 (built-in)</option>
          </select>
        </div>

        <div className="conversion-field">
          <label className="pdf-label">Destination Profile</label>
          <select value={dstProfile} onChange={e => setDstProfile(e.target.value)} className="form-select">
            {profiles.filter(p => p.color_space_type === 'CMYK').map(p => (
              <option key={p.name} value={p.name}>{p.description}</option>
            ))}
          </select>
        </div>

        <div className="conversion-field">
          <label className="pdf-label">Rendering Intent</label>
          <select value={intent} onChange={e => setIntent(e.target.value)} className="form-select">
            {RENDERING_INTENTS.map(ri => (
              <option key={ri.id} value={ri.id}>{ri.label}</option>
            ))}
          </select>
          <span className="conversion-hint">{RENDERING_INTENTS.find(ri => ri.id === intent)?.desc}</span>
        </div>

        <div className="conversion-field">
          <label className="pdf-label">Scope</label>
          <div className="conversion-scopes">
            {SCOPES.map(s => (
              <label key={s.id} className="conversion-scope-radio">
                <input type="radio" name="scope" value={s.id} checked={scope === s.id} onChange={() => setScope(s.id)} />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleConvert} disabled={converting || !needsConversion}>
          {converting ? 'Converting...' : 'Convert to CMYK'}
        </button>

        {error && <div className="pdf-finding pdf-finding--error">{error}</div>}

        {result && (
          <div className="conversion-result">
            <p className="conversion-result-header">Conversion complete</p>
            <p>Images converted: {result.images_converted}</p>
            <p>Vector ops converted: {result.vector_ops_converted}</p>
            {result.warnings.length > 0 && (
              <div className="conversion-warnings">
                {result.warnings.map((w, i) => (
                  <p key={i} className="pdf-finding pdf-finding--warning">{w}</p>
                ))}
              </div>
            )}
            <p className="conversion-output">Saved as: {filePath.replace(/\.pdf$/i, '_CMYK.pdf')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
