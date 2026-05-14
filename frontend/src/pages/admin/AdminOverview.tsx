import { useEffect, useState } from 'react'
import MermaidRenderer from '../../components/MermaidRenderer'

interface CheckResult { passed: boolean; comment: string }
interface CheckRun { created_at: string; results: CheckResult[] }
interface HistoryEntry {
  id: number
  mermaid_code: string
  created_at: string
  user_prompt: string | null
  check_runs: CheckRun[]
}
interface GroupFull {
  id: number
  name: string
  areas: Record<string, HistoryEntry[]>
  device_submissions_count: number
}

function fmt(dt: string) {
  return new Date(dt + 'Z').toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function getHistoryPromptText(userPrompt: string | null | undefined): string {
  const prompt = userPrompt?.trim()
  return prompt ? prompt : '未记录提示词'
}

function AreaHistory({ entries, onZoom }: { area: string; entries: HistoryEntry[]; onZoom: (code: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {entries.map((entry, idx) => {
        const lastRun = entry.check_runs[entry.check_runs.length - 1] ?? null
        const passed = lastRun?.results.filter(r => r.passed).length ?? 0
        const total = lastRun?.results.length ?? 0
        const isLatest = idx === entries.length - 1
        return (
          <div key={entry.id} style={{ border: `1px solid ${isLatest ? '#bee3f8' : '#e2e8f0'}`, borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {/* 头部 */}
            <div style={{ padding: '6px 12px', background: isLatest ? '#ebf8ff' : '#f7fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: isLatest ? '#2b6cb0' : '#718096', fontWeight: isLatest ? 600 : 400 }}>
                第 {idx + 1} 次{isLatest ? ' · 最新' : ''} · {fmt(entry.created_at)}
              </span>
              {lastRun && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 8,
                  background: passed === total ? '#c6f6d5' : passed > 0 ? '#fefcbf' : '#fed7d7',
                  color: passed === total ? '#276749' : passed > 0 ? '#744210' : '#9b2c2c',
                }}>
                  {passed}/{total}
                </span>
              )}
            </div>

            {/* 流程图 */}
            <div style={{ padding: 10, background: '#fafafa', overflow: 'hidden' }}>
              <div style={{
                padding: '8px 10px',
                border: '1px solid #edf2f7',
                borderRadius: 8,
                background: '#fff',
                marginBottom: 10,
              }}>
                <div style={{ fontSize: 10, color: '#718096', marginBottom: 4 }}>提示词</div>
                <div style={{
                  fontSize: 12,
                  color: entry.user_prompt?.trim() ? '#2d3748' : '#a0aec0',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  maxHeight: 84,
                  overflowY: 'auto',
                }}>
                  {getHistoryPromptText(entry.user_prompt)}
                </div>
              </div>
              <div
                onClick={() => onZoom(entry.mermaid_code)}
                title="点击放大"
                style={{ cursor: 'zoom-in' }}
              >
                <MermaidRenderer code={entry.mermaid_code} />
              </div>
            </div>

            {/* 最新一次检测记录 */}
            {(() => {
              const run = entry.check_runs[entry.check_runs.length - 1] ?? null
              if (!run) return null
              return (
                <div style={{ borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '4px 10px', background: '#f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: '#718096' }}>检测 · {fmt(run.created_at)}</span>
                  </div>
                  {run.results.map((r, i) => (
                    <div key={i} style={{
                      padding: '3px 10px', display: 'flex', gap: 6, alignItems: 'flex-start',
                      borderTop: '1px solid #f0f4f8',
                      background: r.passed ? '#f0fff4' : '#fff5f5',
                      fontSize: 11, lineHeight: 1.4,
                    }}>
                      <span style={{ flexShrink: 0 }}>{r.passed ? '✅' : '❌'}</span>
                      <span style={{ color: '#4a5568' }}>{r.comment}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )
      })}
    </div>
  )
}

const AREAS = ['大门区域', '身份识别', '大厅安防', 'LED显示', '绿色植物', '自助系统'] as const

function GroupCard({ group, onZoom }: { group: GroupFull; onZoom: (code: string) => void }) {
  const [activeArea, setActiveArea] = useState<string>(AREAS[0])

  const totalCharts = AREAS.reduce((s, a) => s + (group.areas[a]?.length ?? 0), 0)
  const totalPassed = AREAS.reduce((s, a) =>
    s + (group.areas[a] ?? []).reduce((s2, e) => {
      const last = e.check_runs[e.check_runs.length - 1]
      return s2 + (last?.results.filter(r => r.passed).length ?? 0)
    }, 0), 0)
  const totalChecked = AREAS.reduce((s, a) =>
    s + (group.areas[a] ?? []).reduce((s2, e) => {
      const last = e.check_runs[e.check_runs.length - 1]
      return s2 + (last?.results.length ?? 0)
    }, 0), 0)

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      {/* 组头 */}
      <div style={{ padding: '14px 20px', background: '#ebf8ff', borderBottom: '1px solid #bee3f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#2b6cb0' }}>{group.name}</h3>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#4a5568' }}>
          <span>共 {totalCharts} 次生成</span>
          {group.device_submissions_count > 0 && (
            <span style={{ color: '#276749' }}>设备台已保存 {group.device_submissions_count} 次</span>
          )}
          {totalChecked > 0 && (
            <span style={{
              fontWeight: 600,
              color: totalPassed === totalChecked ? '#276749' : totalPassed > 0 ? '#744210' : '#9b2c2c',
            }}>
              检测 {totalPassed}/{totalChecked} 通过
            </span>
          )}
        </div>
      </div>

      {/* 区域 tab */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {AREAS.map(area => {
          const hasData = (group.areas[area]?.length ?? 0) > 0
          const isActive = area === activeArea
          return (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              style={{
                padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
                background: isActive ? '#4299e1' : hasData ? '#c6f6d5' : '#f7fafc',
                color: isActive ? '#fff' : hasData ? '#276749' : '#a0aec0',
                fontWeight: isActive || hasData ? 600 : 400,
                transition: 'background 0.15s',
              }}
            >
              {area}
              {hasData && !isActive && (
                <span style={{ marginLeft: 4, fontSize: 10 }}>✓</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 历史内容 */}
      <div style={{ padding: '16px 20px' }}>
        {(group.areas[activeArea]?.length ?? 0) > 0 ? (
          <AreaHistory area={activeArea} entries={group.areas[activeArea]} onZoom={onZoom} />
        ) : (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#cbd5e0', fontSize: 13 }}>
            该区域暂无流程图记录
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminOverview() {
  const [groups, setGroups] = useState<GroupFull[]>([])
  const [loading, setLoading] = useState(true)
  const [fullscreenCode, setFullscreenCode] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/full')
      .then(r => r.json())
      .then(data => { setGroups(data); setLoading(false) })
  }, [])

  if (loading) return <p style={{ color: '#a0aec0' }}>加载中…</p>

  return (
    <>
      <div>
        <h2 style={{ marginTop: 0 }}>流程图设计总览</h2>
        {groups.length === 0 ? (
          <p style={{ color: '#a0aec0' }}>暂无小组数据</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {groups.map(g => <GroupCard key={g.id} group={g} onZoom={setFullscreenCode} />)}
          </div>
        )}
      </div>

      {fullscreenCode && (
        <div
          onClick={() => setFullscreenCode(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12, padding: 32,
              width: '92vw', height: '90vh', overflow: 'auto',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setFullscreenCode(null)}
              style={{
                position: 'absolute', top: 12, right: 12,
                border: 'none', background: 'transparent',
                fontSize: 20, cursor: 'pointer', color: '#718096', lineHeight: 1,
              }}
            >✕</button>
            <MermaidRenderer code={fullscreenCode} style={{ minWidth: 600 }} />
          </div>
        </div>
      )}
    </>
  )
}
