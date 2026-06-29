import { useState, useEffect, useCallback, memo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button, Input, Select, Card } from '../../design-system'
import './IntegrationsPanel.css'

interface QbConnectionStatus {
  connected: boolean
  company_name: string | null
  environment: string
  has_credentials: boolean
}

export default memo(function IntegrationsPanel() {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [environment, setEnvironment] = useState('sandbox')
  const [status, setStatus] = useState<QbConnectionStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const s = await invoke<QbConnectionStatus>('qb_connection_status')
      setStatus(s)
      setEnvironment(s.environment)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const handleSaveCredentials = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await invoke('qb_save_credentials', { clientId, clientSecret, environment })
      setMessage('Credentials saved securely.')
      await refreshStatus()
    } catch (e) {
      setMessage(String(e))
    } finally {
      setBusy(false)
    }
  }

  const handleConnect = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await invoke('qb_start_oauth')
      setMessage('Connected to QuickBooks.')
      await refreshStatus()
    } catch (e) {
      setMessage(String(e))
    } finally {
      setBusy(false)
    }
  }

  const handleDisconnect = async () => {
    setBusy(true)
    try {
      await invoke('qb_disconnect')
      setMessage('Disconnected from QuickBooks.')
      await refreshStatus()
    } catch (e) {
      setMessage(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="integrations-panel">
      <Card className="integrations-section">
        <h3>QuickBooks Online</h3>
        <p className="integrations-hint">
          Create an app at developer.intuit.com and set redirect URI to{' '}
          <code>http://127.0.0.1:9876/callback</code>
        </p>

        {status?.connected && status.company_name && (
          <p className="integrations-connected">
            Connected: <strong>{status.company_name}</strong> ({status.environment})
          </p>
        )}

        <div className="integrations-form">
          <Select
            label="Environment"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            options={[
              { value: 'sandbox', label: 'Sandbox' },
              { value: 'production', label: 'Production' },
            ]}
          />
          <Input
            label="Client ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="From Intuit Developer portal"
          />
          <Input
            label="Client Secret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="From Intuit Developer portal"
          />
        </div>

        <div className="integrations-actions">
          <Button variant="secondary" onClick={handleSaveCredentials} disabled={busy}>
            Save credentials
          </Button>
          {!status?.connected ? (
            <Button variant="primary" onClick={handleConnect} disabled={busy || !status?.has_credentials}>
              Connect QuickBooks
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleDisconnect} disabled={busy}>
              Disconnect
            </Button>
          )}
        </div>
      </Card>

      <Card className="integrations-section">
        <h3>Email (SMTP)</h3>
        <p className="integrations-hint">
          Configure SMTP in the database via comm settings for invoice email delivery.
          Use the Email section in a future release; send invoice uses saved SMTP settings.
        </p>
      </Card>

      {message && <p className="integrations-message">{message}</p>}
    </div>
  )
})
