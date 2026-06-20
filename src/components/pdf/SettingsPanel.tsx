import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { EmailSettings, FtpSettings, WebhookEntry } from '../../types'

export function EmailSettingsPanel() {
  const [settings, setSettings] = useState<EmailSettings>({
    smtp_host: '', smtp_port: 587, smtp_username: '', smtp_password: '', use_tls: true, from_address: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    invoke<EmailSettings | null>('get_email_settings').then(s => { if (s) setSettings(s) }).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await invoke('save_email_settings', { settings })
      alert('Email settings saved')
    } catch (e) {
      alert('Failed: ' + e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-panel">
      <h4>SMTP Settings</h4>
      <div className="settings-form">
        <label>Host: <input value={settings.smtp_host} onChange={e => setSettings(s => ({ ...s, smtp_host: e.target.value }))} /></label>
        <label>Port: <input type="number" value={settings.smtp_port} onChange={e => setSettings(s => ({ ...s, smtp_port: parseInt(e.target.value) }))} /></label>
        <label>Username: <input value={settings.smtp_username} onChange={e => setSettings(s => ({ ...s, smtp_username: e.target.value }))} /></label>
        <label>Password: <input type="password" value={settings.smtp_password} onChange={e => setSettings(s => ({ ...s, smtp_password: e.target.value }))} /></label>
        <label>TLS: <input type="checkbox" checked={settings.use_tls} onChange={e => setSettings(s => ({ ...s, use_tls: e.target.checked }))} /></label>
        <label>From: <input value={settings.from_address} onChange={e => setSettings(s => ({ ...s, from_address: e.target.value }))} /></label>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '...' : 'Save'}</button>
      </div>
    </div>
  )
}

export function FtpSettingsPanel() {
  const [settings, setSettings] = useState<FtpSettings>({ host: '', port: 21, username: '', password: '', remote_dir: '/' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    invoke<FtpSettings | null>('get_ftp_settings').then(s => { if (s) setSettings(s) }).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await invoke('save_ftp_settings', { settings })
      alert('FTP settings saved')
    } catch (e) { alert('Failed: ' + e) } finally { setSaving(false) }
  }

  return (
    <div className="settings-panel">
      <h4>FTP Settings</h4>
      <div className="settings-form">
        <label>Host: <input value={settings.host} onChange={e => setSettings(s => ({ ...s, host: e.target.value }))} /></label>
        <label>Port: <input type="number" value={settings.port} onChange={e => setSettings(s => ({ ...s, port: parseInt(e.target.value) }))} /></label>
        <label>Username: <input value={settings.username} onChange={e => setSettings(s => ({ ...s, username: e.target.value }))} /></label>
        <label>Password: <input type="password" value={settings.password} onChange={e => setSettings(s => ({ ...s, password: e.target.value }))} /></label>
        <label>Remote dir: <input value={settings.remote_dir} onChange={e => setSettings(s => ({ ...s, remote_dir: e.target.value }))} /></label>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '...' : 'Save'}</button>
      </div>
    </div>
  )
}

export function WebhookPanel() {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([])
  const [url, setUrl] = useState('')
  const [event, setEvent] = useState('preflight.completed')

  useEffect(() => { load() }, [])
  const load = async () => setWebhooks(await invoke<WebhookEntry[]>('list_webhooks'))

  const add = async () => {
    if (!url.trim()) return
    await invoke('create_webhook', { url, event })
    setUrl('')
    load()
  }

  const remove = async (id: number) => {
    await invoke('delete_webhook', { id })
    load()
  }

  return (
    <div className="settings-panel">
      <h4>Webhooks</h4>
      <div className="settings-form">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://hook.example.com/..." />
        <select value={event} onChange={e => setEvent(e.target.value)}>
          <option value="preflight.completed">Preflight Completed</option>
          <option value="batch.completed">Batch Completed</option>
          <option value="file.imported">File Imported</option>
        </select>
        <button className="btn btn-primary" onClick={add}>Add</button>
      </div>
      <div className="webhook-list">
        {webhooks.map(w => (
          <div key={w.id} className="webhook-item">
            <span>{w.url}</span>
            <span className="text-muted">({w.event})</span>
            <button onClick={() => remove(w.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
