import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGroupWorkspacePath } from './groupRoutes'

export interface Group { id: number; name: string }

type HomeActionEntry =
  | { type: 'group'; label: string; groupId: number; background: string; hoverBackground: string; shadow: string }
  | { type: 'admin'; label: string; path: string; background: string; hoverBackground: string; shadow: string }

export const GROUP_SELECT_ADMIN_ENTRY_LABEL = '教师后台'
export const GROUP_SELECT_ADMIN_ENTRY_PATH = '/admin'
export const GROUP_SELECT_ADMIN_ENTRY_BACKGROUND = '#2b6cb0'
export const GROUP_SELECT_JUDGE_ENTRY_LABEL = '评委体验'
export const GROUP_SELECT_JUDGE_ENTRY_BACKGROUND = '#2f855a'

export function splitHomeEntries(groups: Group[]) {
  const judgeGroup = groups.find(g => g.name === GROUP_SELECT_JUDGE_ENTRY_LABEL)
  const studyGroups = groups.filter(g => g.name !== GROUP_SELECT_JUDGE_ENTRY_LABEL)
  const actionEntries: HomeActionEntry[] = [
    ...(judgeGroup ? [{
      type: 'group' as const,
      label: judgeGroup.name,
      groupId: judgeGroup.id,
      background: GROUP_SELECT_JUDGE_ENTRY_BACKGROUND,
      hoverBackground: '#276749',
      shadow: '0 4px 12px rgba(47,133,90,0.28)',
    }] : []),
    {
      type: 'admin',
      label: GROUP_SELECT_ADMIN_ENTRY_LABEL,
      path: GROUP_SELECT_ADMIN_ENTRY_PATH,
      background: GROUP_SELECT_ADMIN_ENTRY_BACKGROUND,
      hoverBackground: '#2c5282',
      shadow: '0 4px 12px rgba(43,108,176,0.28)',
    },
  ]

  return { studyGroups, actionEntries }
}

export default function GroupSelect() {
  const [groups, setGroups] = useState<Group[]>([])
  const navigate = useNavigate()
  const { studyGroups, actionEntries } = splitHomeEntries(groups)

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
        {studyGroups.map(g => (
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginTop: 20 }}>
        {actionEntries.map(entry => {
          const isAdmin = entry.type === 'admin'
          return (
            <button
              key={entry.label}
              onClick={() => navigate(isAdmin ? entry.path : getGroupWorkspacePath(entry.groupId, 'chat'))}
              style={{
                minWidth: 160,
                padding: '18px 40px', fontSize: 18, fontWeight: 700,
                background: entry.background,
                border: `2px solid ${entry.background}`,
                borderRadius: 12,
                cursor: 'pointer',
                color: '#fff',
                transition: 'all 0.15s',
                boxShadow: entry.shadow
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = entry.hoverBackground
                e.currentTarget.style.borderColor = entry.hoverBackground
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = entry.background
                e.currentTarget.style.borderColor = entry.background
              }}
            >
              {entry.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
