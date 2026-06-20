import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { PreflightProfile, ProfileCheck, ProfileFixup } from '../../types'

export default function ProfileEditor() {
  const [profiles, setProfiles] = useState<PreflightProfile[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [checks, setChecks] = useState<ProfileCheck[]>([])
  const [fixups, setFixups] = useState<ProfileFixup[]>([])
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  useEffect(() => { loadProfiles() }, [])

  const loadProfiles = async () => {
    const list = await invoke<PreflightProfile[]>('list_preflight_profiles')
    setProfiles(list)
  }

  const selectProfile = async (id: number) => {
    setSelectedId(id)
    const [c, f] = await Promise.all([
      invoke<ProfileCheck[]>('list_profile_checks', { profileId: id }),
      invoke<ProfileFixup[]>('list_profile_fixups', { profileId: id }),
    ])
    setChecks(c)
    setFixups(f)
  }

  const createProfile = async () => {
    if (!newName.trim()) return
    await invoke('create_preflight_profile', { input: { name: newName, description: newDesc } })
    setNewName(''); setNewDesc('')
    loadProfiles()
  }

  const deleteProfile = async (id: number) => {
    if (!confirm('Delete profile?')) return
    await invoke('delete_preflight_profile', { id })
    if (selectedId === id) { setSelectedId(null); setChecks([]); setFixups([]) }
    loadProfiles()
  }

  const toggleCheck = async (checkId: number, enabled: boolean) => {
    await invoke('update_profile_check', { checkId, enabled, severity: 'error' })
    if (selectedId) selectProfile(selectedId)
  }

  return (
    <div className="profile-editor">
      <h4>Preflight Profiles</h4>
      <div className="profile-create">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Profile name" />
        <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" />
        <button className="btn btn-primary" onClick={createProfile}>Create</button>
      </div>
      <div className="profile-list">
        {profiles.map(p => (
          <div key={p.id} className={`profile-item ${selectedId === p.id ? 'active' : ''}`}
            onClick={() => selectProfile(p.id)}>
            <span>{p.name} {p.is_builtin && '(built-in)'}</span>
            {!p.is_builtin && <button onClick={(e) => { e.stopPropagation(); deleteProfile(p.id) }}>✕</button>}
          </div>
        ))}
      </div>
      {selectedId && (
        <div className="profile-detail">
          <h5>Checks</h5>
          {checks.map(c => (
            <div key={c.id} className="profile-check-item">
              <input type="checkbox" checked={c.enabled} onChange={e => toggleCheck(c.id, e.target.checked)} />
              <span>{c.check_name}</span>
              <span className="text-muted">({c.severity})</span>
            </div>
          ))}
          <h5>Fixups</h5>
          {fixups.map(f => (
            <div key={f.id} className="profile-fixup-item">
              <input type="checkbox" checked={f.enabled} />
              <span>{f.fixup_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
