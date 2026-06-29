import { lazy, Suspense, useState } from 'react'
import { Tabs } from '../design-system'
import './SettingsPanel.css'

const PriceBookEditor = lazy(() => import('../pricing/PriceBookEditor'))
const IntegrationsPanel = lazy(() => import('./settings/IntegrationsPanel'))

export default function SettingsPanel() {
  const [tab, setTab] = useState<'pricebook' | 'integrations'>('pricebook')

  return (
    <div className="settings-panel">
      <h1>Settings</h1>
      <Tabs
        value={tab}
        onChange={(v) => setTab(v as 'pricebook' | 'integrations')}
        tabs={[
          { value: 'pricebook', label: 'Price Book' },
          { value: 'integrations', label: 'Integrations' },
        ]}
      />
      <div className="settings-panel-content">
        <Suspense fallback={<div>Loading…</div>}>
          {tab === 'pricebook' && <PriceBookEditor />}
          {tab === 'integrations' && <IntegrationsPanel />}
        </Suspense>
      </div>
    </div>
  )
}
