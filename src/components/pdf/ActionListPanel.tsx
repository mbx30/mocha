import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { ActionList, ActionListStep } from '../../types'

export default function ActionListPanel() {
  const [lists, setLists] = useState<ActionList[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [steps, setSteps] = useState<ActionListStep[]>([])
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newStepType, setNewStepType] = useState('preflight')
  const [newStepParams, setNewStepParams] = useState('{}')

  useEffect(() => { loadLists() }, [])

  const loadLists = async () => {
    setLists(await invoke<ActionList[]>('list_action_lists'))
  }

  const selectList = async (id: number) => {
    setSelectedId(id)
    setSteps(await invoke<ActionListStep[]>('list_action_list_steps', { actionListId: id }))
  }

  const createList = async () => {
    if (!newName.trim()) return
    await invoke('create_action_list', { input: { name: newName, description: newDesc } })
    setNewName(''); setNewDesc('')
    loadLists()
  }

  const deleteList = async (id: number) => {
    if (!confirm('Delete action list?')) return
    await invoke('delete_action_list', { id })
    if (selectedId === id) { setSelectedId(null); setSteps([]) }
    loadLists()
  }

  const addStep = async () => {
    if (!selectedId) return
    await invoke('add_action_list_step', { actionListId: selectedId, input: { action_type: newStepType, params: newStepParams } })
    selectList(selectedId)
  }

  const deleteStep = async (id: number) => {
    await invoke('delete_action_list_step', { id })
    if (selectedId) selectList(selectedId)
  }

  return (
    <div className="action-list-panel">
      <h4>Action Lists</h4>
      <div className="action-list-create">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="List name" />
        <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" />
        <button className="btn btn-primary" onClick={createList}>Create</button>
      </div>
      <div className="action-list-nav">
        {lists.map(l => (
          <div key={l.id} className={`action-list-item ${selectedId === l.id ? 'active' : ''}`}
            onClick={() => selectList(l.id)}>
            <span>{l.name}</span>
            <button onClick={(e) => { e.stopPropagation(); deleteList(l.id) }}>✕</button>
          </div>
        ))}
      </div>
      {selectedId && (
        <div className="action-list-detail">
          <h5>Steps</h5>
          <div className="step-list">
            {steps.map((s, i) => (
              <div key={s.id} className="step-item">
                <span className="step-order">{i + 1}.</span>
                <span className="step-type">{s.action_type}</span>
                <button onClick={() => deleteStep(s.id)}>✕</button>
              </div>
            ))}
          </div>
          <div className="step-add">
            <select value={newStepType} onChange={e => setNewStepType(e.target.value)}>
              <option value="preflight">Preflight Check</option>
              <option value="convert_rgb_to_cmyk">RGB→CMYK</option>
              <option value="add_bleed">Add Bleed</option>
              <option value="compress">Compress</option>
              <option value="export">Export</option>
            </select>
            <button className="btn btn-primary" onClick={addStep}>Add Step</button>
          </div>
        </div>
      )}
    </div>
  )
}
