import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGroupWorkspacePath } from './groupRoutes'

interface Group { id: number; name: string }

export const GROUP_SELECT_ADMIN_ENTRY_LABEL = '教师后台'
export const GROUP_SELECT_ADMIN_ENTRY_PATH = '/admin'
export const GROUP_SELECT_ADMIN_ENTRY_BACKGROUND = '#2b6cb0'

export default function GroupSelect() {
  const [groups, setGroups] = useState<Group[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(setGroups)
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 32, marginBottom: 8, color: '#1a202c' }}>物联网智能体工作台</h1>
      <p style={{ color: '#718096', marginBottom: 40 }}>选择你的小组开始学习</p>
      {groups.length === 0 && (
        <p style={{ color: '#a0aec0' }}>暂无小组，请联系教师创建</p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', maxWidth: 640 }}>
        {groups.map(g => (
          <button
            key={g.id}
            onClick={() => navigate(getGroupWorkspacePath(g.id, 'chat'))}
            style={{
              padding: '24px 40px', fontSize: 18, fontWeight: 600,
              background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12,
              cursor: 'pointer', color: '#2d3748', transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#4299e1'; (e.target as HTMLElement).style.background = '#ebf8ff' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#e2e8f0'; (e.target as HTMLElement).style.background = '#fff' }}
          >
            {g.name}
          </button>
        ))}
      </div>
      <button
        onClick={() => navigate(GROUP_SELECT_ADMIN_ENTRY_PATH)}
        style={{
          marginTop: 20,
          padding: '18px 48px', fontSize: 18, fontWeight: 700,
          background: GROUP_SELECT_ADMIN_ENTRY_BACKGROUND, border: `2px solid ${GROUP_SELECT_ADMIN_ENTRY_BACKGROUND}`, borderRadius: 12,
          cursor: 'pointer', color: '#fff', transition: 'all 0.15s',
          boxShadow: '0 4px 12px rgba(43,108,176,0.28)'
        }}
        onMouseEnter={e => { (e.target as HTMLElement).style.background = '#2c5282'; (e.target as HTMLElement).style.borderColor = '#2c5282' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.background = GROUP_SELECT_ADMIN_ENTRY_BACKGROUND; (e.target as HTMLElement).style.borderColor = GROUP_SELECT_ADMIN_ENTRY_BACKGROUND }}
      >
        {GROUP_SELECT_ADMIN_ENTRY_LABEL}
      </button>
    </div>
  )
}
