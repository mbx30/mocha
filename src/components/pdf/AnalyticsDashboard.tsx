import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { AnalyticsSummary } from '../../types'

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    invoke<AnalyticsSummary>('get_analytics_summary')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="analytics-dashboard"><p>Loading...</p></div>

  return (
    <div className="analytics-dashboard">
      <h4>Analytics Dashboard</h4>
      {data && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <span className="analytics-value">{data.total_jobs}</span>
            <span className="analytics-label">Total PDF Jobs</span>
          </div>
          <div className="analytics-card">
            <span className="analytics-value">{data.total_preflight_runs}</span>
            <span className="analytics-label">Preflight Runs</span>
          </div>
          <div className="analytics-card analytics-card--error">
            <span className="analytics-value">{data.total_errors}</span>
            <span className="analytics-label">Total Errors</span>
          </div>
          <div className="analytics-card analytics-card--warning">
            <span className="analytics-value">{data.total_warnings}</span>
            <span className="analytics-label">Total Warnings</span>
          </div>
        </div>
      )}

      {data && data.most_common_errors.length > 0 && (
        <div className="analytics-section">
          <h5>Most Common Errors</h5>
          <table className="analytics-table">
            <thead><tr><th>Check</th><th>Count</th></tr></thead>
            <tbody>
              {data.most_common_errors.map(([name, count]) => (
                <tr key={name}><td>{name}</td><td>{count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.jobs_by_day.length > 0 && (
        <div className="analytics-section">
          <h5>Jobs by Day</h5>
          <table className="analytics-table">
            <thead><tr><th>Date</th><th>Count</th></tr></thead>
            <tbody>
              {data.jobs_by_day.map(([day, count]) => (
                <tr key={day}><td>{day}</td><td>{count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
