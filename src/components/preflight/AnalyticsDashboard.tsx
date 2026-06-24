import { memo } from 'react'
import { t } from '../../i18n'

interface AnalyticsDashboardProps {
  clientId?: number
}

export default memo(function AnalyticsDashboard({ clientId }: AnalyticsDashboardProps) {
  return (
    <div className="analytics-dashboard">
      <h3>{t('analytics.title')}</h3>
      <p>{t('analytics.desc')}</p>
      {clientId && <p>{t('analytics.client', { id: clientId })}</p>}
    </div>
  )
})
