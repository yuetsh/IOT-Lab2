import { useEffect, useState } from 'react'

interface Group { id: number; name: string; created_at: string }

export default function AdminGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  function load() {
    fetch('/api/groups').then(r => r.json()).then(setGroups)
  }
  useEffect(load, [])

  async function create() {
    const name = newName.trim()
    if (!name) return
    const r = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    if (!r.ok) { setError('小组名已存在'); return }
    setNewName(''); setError(''); load()
  }

  async function del(id: number) {
    if (!confirm('确认删除该小组？其对话和手帐也将一并删除。')) return
    await fetch(`/api/groups/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>小组管理</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && create()}
          placeholder="小组名称"
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
        />
        <button
          onClick={create}
          style={{ padding: '8px 20px', background: '#4299e1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
        >添加小组</button>
      </div>
      {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '4px 0 8px' }}>{error}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f7fafc' }}>
            <th style={th}>ID</th>
            <th style={th}>名称</th>
            <th style={th}>创建时间</th>
            <th style={th}>操作</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(g => (
            <tr key={g.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={td}>{g.id}</td>
              <td style={td}>{g.name}</td>
              <td style={td}>{g.created_at}</td>
              <td style={td}>
                <button
                  onClick={() => del(g.id)}
                  style={{ padding: '4px 12px', background: '#fff', border: '1px solid #fc8181', color: '#e53e3e', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
                >删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 13, color: '#718096', fontWeight: 600 }
const td: React.CSSProperties = { padding: '10px 12px', fontSize: 14 }
