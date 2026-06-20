import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { BatchJob, BatchResult, ActionList } from '../../types'

export default function BatchPanel() {
  const [jobs, setJobs] = useState<BatchJob[]>([])
  const [lists, setLists] = useState<ActionList[]>([])
  const [selectedJob, setSelectedJob] = useState<number | null>(null)
  const [results, setResults] = useState<BatchResult[]>([])
  const [listId, setListId] = useState<number>(0)
  const [files, setFiles] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadJobs()
    invoke<ActionList[]>('list_action_lists').then(setLists).catch(() => {})
  }, [])

  const loadJobs = async () => {
    setJobs(await invoke<BatchJob[]>('list_batch_jobs'))
  }

  const selectJob = async (id: number) => {
    setSelectedJob(id)
    setResults(await invoke<BatchResult[]>('list_batch_results', { batchId: id }))
  }

  const createAndRun = async () => {
    if (!listId || !files.trim()) return
    setLoading(true)
    try {
      const fileList = files.split('\n').map(s => s.trim()).filter(Boolean)
      const job = await invoke<BatchJob>('create_batch_job', { actionListId: listId, files: fileList })
      await invoke('run_batch', { batchId: job.id })
      loadJobs()
      setFiles('')
      alert('Batch job created and run')
    } catch (e) {
      alert('Batch failed: ' + e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="batch-panel">
      <h4>Batch Processing</h4>
      <div className="batch-create">
        <select value={listId} onChange={e => setListId(parseInt(e.target.value))}>
          <option value={0}>Select action list...</option>
          {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <textarea value={files} onChange={e => setFiles(e.target.value)} placeholder="File paths (one per line)" rows={4} />
        <button className="btn btn-primary" onClick={createAndRun} disabled={loading}>
          {loading ? '...' : 'Create & Run Batch'}
        </button>
      </div>
      <div className="batch-list">
        <h5>Recent Jobs</h5>
        {jobs.map(j => (
          <div key={j.id} className={`batch-item ${selectedJob === j.id ? 'active' : ''}`}
            onClick={() => selectJob(j.id)}>
            <span>Batch #{j.id}</span>
            <span className="batch-status">{j.status}</span>
            <span className="batch-progress">{j.processed_files}/{j.total_files}</span>
          </div>
        ))}
      </div>
      {selectedJob && (
        <div className="batch-results">
          <h5>Results</h5>
          {results.map(r => (
            <div key={r.id} className="batch-result-item">
              <span className="result-file">{r.file_path}</span>
              <span className={`result-status ${r.status}`}>{r.status}</span>
              {r.error_message && <span className="result-error">{r.error_message}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
