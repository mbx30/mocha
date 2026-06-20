import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { HotFolder, ActionList } from '../../types'

export default function HotFolderPanel() {
  const [folders, setFolders] = useState<HotFolder[]>([])
  const [lists, setLists] = useState<ActionList[]>([])
  const [name, setName] = useState('')
  const [watchPath, setWatchPath] = useState('')
  const [actionListId, setActionListId] = useState(0)
  const [outputPath, setOutputPath] = useState('')
  const [filePattern, setFilePattern] = useState('*.pdf')

  useEffect(() => {
    loadFolders()
    invoke<ActionList[]>('list_action_lists').then(setLists).catch(() => {})
  }, [])

  const loadFolders = async () => {
    setFolders(await invoke<HotFolder[]>('list_hot_folders'))
  }

  const createFolder = async () => {
    if (!name.trim() || !watchPath.trim() || !actionListId) return
    await invoke('create_hot_folder', {
      input: { name, watch_path: watchPath, action_list_id: actionListId, output_path: outputPath, file_pattern: filePattern }
    })
    setName(''); setWatchPath(''); setOutputPath('')
    loadFolders()
  }

  const toggleFolder = async (id: number, isActive: boolean) => {
    await invoke('toggle_hot_folder', { id, isActive })
    loadFolders()
  }

  const deleteFolder = async (id: number) => {
    if (!confirm('Delete hot folder?')) return
    await invoke('delete_hot_folder', { id })
    loadFolders()
  }

  return (
    <div className="hot-folder-panel">
      <h4>Hot Folders</h4>
      <div className="hot-folder-create">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Folder name" />
        <input value={watchPath} onChange={e => setWatchPath(e.target.value)} placeholder="Watch path" />
        <input value={outputPath} onChange={e => setOutputPath(e.target.value)} placeholder="Output path" />
        <input value={filePattern} onChange={e => setFilePattern(e.target.value)} placeholder="File pattern" />
        <select value={actionListId} onChange={e => setActionListId(parseInt(e.target.value))}>
          <option value={0}>Select action list...</option>
          {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={createFolder}>Add</button>
      </div>
      <div className="hot-folder-list">
        {folders.map(f => (
          <div key={f.id} className="hot-folder-item">
            <div className="hot-folder-info">
              <strong>{f.name}</strong>
              <span className="text-muted">{f.watch_path}</span>
            </div>
            <div className="hot-folder-actions">
              <button className={`btn btn-sm ${f.is_active ? 'btn-success' : 'btn-secondary'}`}
                onClick={() => toggleFolder(f.id, !f.is_active)}>
                {f.is_active ? 'Active' : 'Inactive'}
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => deleteFolder(f.id)}>✕</button>
            </div>
          </div>
        ))}
        {folders.length === 0 && <p className="text-muted">No hot folders configured</p>}
      </div>
    </div>
  )
}
