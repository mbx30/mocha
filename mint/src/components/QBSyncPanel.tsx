import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { Button, Card } from '../design-system'
import type { Invoice } from '../types'
import './QBSyncPanel.css'

const QB_STATUS_LABELS: Record<string, string> = {
  not_synced: 'Not Synced',
  synced: 'Synced',
  sync_error: 'Sync Error',
  pending: 'Pending',
}

const QB_STATUS_CLASS: Record<string, string> = {
  not_synced: 'qb-badge--not-synced',
  synced: 'qb-badge--synced',
  sync_error: 'qb-badge--error',
  pending: 'qb-badge--pending',
}

interface QbConnectionStatus {
  connected: boolean
  company_name: string | null
  environment: string
  has_credentials: boolean
}

export default function QBSyncPanel() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [connection, setConnection] = useState<QbConnectionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [syncing, setSyncing] = useState<Set<number>>(new Set())
  const [errors, setErrors] = useState<Map<number, string>>(new Map())
  const [syncingAll, setSyncingAll] = useState(false)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [list, status] = await Promise.all([
        invoke<Invoice[]>('list_invoices'),
        invoke<QbConnectionStatus>('qb_connection_status'),
      ])
      setInvoices(list)
      setConnection(status)
    } catch (e) {
      console.error('Failed to load:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSync = async (invoice: Invoice) => {
    if (syncing.has(invoice.id)) return
    if (!connection?.connected) {
      alert('Connect QuickBooks in Settings → Integrations first.')
      return
    }
    setSyncing((prev) => new Set(prev).add(invoice.id))
    setErrors((prev) => { const m = new Map(prev); m.delete(invoice.id); return m })

    try {
      await invoke<string>('sync_invoice_to_qb', { invoiceId: invoice.id })
      await load()
    } catch (e) {
      setErrors((prev) => new Map(prev).set(invoice.id, String(e)))
      await load()
    } finally {
      setSyncing((prev) => { const s = new Set(prev); s.delete(invoice.id); return s })
    }
  }

  const handleSyncAll = async () => {
    if (syncingAll || !connection?.connected) return
    setSyncingAll(true)
    try {
      const unsynced = invoices.filter(
        (inv) => inv.qb_sync_status !== 'synced' && inv.status !== 'draft' && inv.status !== 'voided'
      )
      for (const inv of unsynced) {
        await handleSync(inv)
      }
    } finally {
      setSyncingAll(false)
    }
  }

  const handleExportCsv = async () => {
    const path = await save({
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      defaultPath: 'invoices-qb-export.csv',
    })
    if (!path) return
    setExporting(true)
    try {
      await invoke('export_invoices_csv', { outputPath: path, invoiceIds: null })
      alert(`Exported to ${path}`)
    } catch (e) {
      alert(`Export failed: ${e}`)
    } finally {
      setExporting(false)
    }
  }

  const unsyncedCount = invoices.filter(
    (inv) => inv.qb_sync_status !== 'synced' && inv.status !== 'draft' && inv.status !== 'voided'
  ).length

  if (isLoading) return <div className="qb-loading">Loading...</div>

  return (
    <div className="qb-panel">
      <div className="qb-header">
        <div>
          <h2>QuickBooks Sync</h2>
          <p className="qb-subtitle">
            Push invoices to QuickBooks Online or export CSV for manual import.
          </p>
        </div>
        <div className="qb-header-actions">
          <div className={`qb-connection-badge ${connection?.connected ? 'qb-connection-badge--live' : 'qb-connection-badge--stub'}`}>
            {connection?.connected
              ? `Connected: ${connection.company_name ?? 'QuickBooks'}`
              : 'Not Connected'}
          </div>
          {connection?.connected && unsyncedCount > 0 && (
            <Button variant="primary" onClick={handleSyncAll} disabled={syncingAll}>
              {syncingAll ? 'Syncing...' : `Sync All (${unsyncedCount})`}
            </Button>
          )}
          <Button variant="secondary" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export for QuickBooks'}
          </Button>
        </div>
      </div>

      {!connection?.connected && (
        <div className="qb-notice">
          Connect QuickBooks under Settings → Integrations, or use CSV export as an offline fallback.
        </div>
      )}

      <Card padding="none">
        <table className="qb-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Status</th>
              <th>Total</th>
              <th>QB Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoice_number}</td>
                <td>{invoice.status}</td>
                <td>${invoice.total.toFixed(2)}</td>
                <td>
                  <span className={`qb-badge ${QB_STATUS_CLASS[invoice.qb_sync_status] ?? ''}`}>
                    {QB_STATUS_LABELS[invoice.qb_sync_status] ?? invoice.qb_sync_status}
                  </span>
                  {invoice.qb_sync_error && (
                    <div className="qb-sync-error" title={invoice.qb_sync_error}>
                      {invoice.qb_sync_error}
                    </div>
                  )}
                </td>
                <td>
                  {invoice.status !== 'draft' && invoice.status !== 'voided' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSync(invoice)}
                      disabled={syncing.has(invoice.id) || invoice.qb_sync_status === 'synced'}
                    >
                      {syncing.has(invoice.id) ? 'Syncing...' : 'Sync'}
                    </Button>
                  )}
                  {errors.has(invoice.id) && (
                    <span className="qb-inline-error">{errors.get(invoice.id)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
