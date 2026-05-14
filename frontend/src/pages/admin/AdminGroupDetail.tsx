import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MermaidRenderer from '../../components/MermaidRenderer'
import { stickerImageSrc } from './stickerManagement'

interface CheckResult { passed: boolean; comment: string }
interface HistoryEntry {
  id: number
  mermaid_code: string
  created_at: string
  check_results: CheckResult[] | null
}
type HistoryByArea = Record<string, HistoryEntry[]>

interface DevicePlacement {
  sticker_id: number
  node_id: string
  node_label: string
  sticker_name: string
  sticker_filename: string
}
interface DeviceSubmission {
  id: number
  placements: DevicePlacement[]
  created_at: string
}

export default function AdminGroupDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [mainTab, setMainTab] = useState<'flowchart' | 'device'>('flowchart')
  const [history, setHistory] = useState<HistoryByArea>({})
  const [activeArea, setActiveArea] = useState<string | null>(null)
  const [deviceSubmissions, setDeviceSubmissions] = useState<DeviceSubmission[]>([])

  useEffect(() => {
    fetch(`/api/groups/${id}/flowchart-history`)
      .then(r => r.json())
      .then((data: HistoryByArea) => {
        setHistory(data)
        const areas = Object.keys(data)
        if (areas.length > 0) setActiveArea(areas[0])
      })
    fetch(`/api/groups/${id}/device-submissions`)
      .then(r => r.json())
      .then(setDeviceSubmissions)
  }, [id])

  const areas = Object.keys(history)
  const entries = activeArea ? (history[activeArea] ?? []) : []

  function fmt(dt: string) {
    return new Date(dt + 'Z').toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <button
        onClick={() => navigate('/admin')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096', fontSize: 14, marginBottom: 16, padding: 0 }}
      >← 返回概览</button>

      {/* 主 tab */}
      <div style={{ display: 'flex', gap: 4, background: '#f7fafc', borderRadius: 8, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {([['flowchart', '流程图历史'], ['device', '设备台方案']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            style={{
              padding: '6px 20px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14,
              background: mainTab === key ? '#fff' : 'transparent',
              color: mainTab === key ? '#2d3748' : '#718096',
              boxShadow: mainTab === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              fontWeight: mainTab === key ? 600 : 400,
            }}
          >{label}</button>
        ))}
      </div>

      {mainTab === 'flowchart' && (
        areas.length === 0 ? (
          <p style={{ color: '#a0aec0' }}>暂无流程图历史记录</p>
        ) : (
          <>
            {/* 区域 tab 栏 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {areas.map(area => (
                <button
                  key={area}
                  onClick={() => setActiveArea(area)}
                  style={{
                    padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
                    background: activeArea === area ? '#4299e1' : '#edf2f7',
                    color: activeArea === area ? '#fff' : '#4a5568',
                    fontWeight: activeArea === area ? 600 : 400,
                  }}
                >
                  {area}
                  <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>({history[area].length})</span>
                </button>
              ))}
            </div>

            {/* 历史时间线 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {entries.map((entry, idx) => {
                const passed = entry.check_results?.filter(r => r.passed).length ?? 0
                const total = entry.check_results?.length ?? 0
                return (
                  <div key={entry.id} style={{ display: 'flex', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#4299e1',
                        color: '#fff', fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {idx + 1}
                      </div>
                      {idx < entries.length - 1 && (
                        <div style={{ flex: 1, width: 2, background: '#e2e8f0', marginTop: 4 }} />
                      )}
                    </div>

                    <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ padding: '10px 16px', background: '#f7fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#718096' }}>第 {idx + 1} 次生成 · {fmt(entry.created_at)}</span>
                        {entry.check_results && (
                          <span style={{
                            fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 10,
                            background: passed === total ? '#c6f6d5' : passed > 0 ? '#fefcbf' : '#fed7d7',
                            color: passed === total ? '#276749' : passed > 0 ? '#744210' : '#9b2c2c',
                          }}>
                            检测 {passed}/{total} 通过
                          </span>
                        )}
                      </div>

                      <div style={{ padding: 16, background: '#fafafa' }}>
                        <MermaidRenderer code={entry.mermaid_code} />
                      </div>

                      {entry.check_results && (
                        <div style={{ borderTop: '1px solid #e2e8f0' }}>
                          <div style={{ padding: '8px 16px', background: '#f7fafc', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>检测结果</div>
                          {entry.check_results.map((r, i) => (
                            <div key={i} style={{
                              padding: '8px 16px', display: 'flex', gap: 10, alignItems: 'flex-start',
                              borderTop: '1px solid #f0f4f8',
                              background: r.passed ? '#f0fff4' : '#fff5f5',
                            }}>
                              <span style={{ fontSize: 15, flexShrink: 0 }}>{r.passed ? '✅' : '❌'}</span>
                              <div style={{ fontSize: 12, color: '#2d3748' }}>{r.comment}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )
      )}

      {mainTab === 'device' && (
        deviceSubmissions.length === 0 ? (
          <p style={{ color: '#a0aec0' }}>暂无设备台保存记录</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {deviceSubmissions.map((sub, idx) => (
              <div key={sub.id} style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: '#38a169',
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  {idx < deviceSubmissions.length - 1 && (
                    <div style={{ flex: 1, width: 2, background: '#e2e8f0', marginTop: 4 }} />
                  )}
                </div>

                <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ padding: '10px 16px', background: '#f7fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#718096' }}>第 {idx + 1} 次保存 · {fmt(sub.created_at)}</span>
                    <span style={{ fontSize: 12, color: '#4a5568' }}>{sub.placements.length} 个节点</span>
                  </div>

                  <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {sub.placements.length === 0 ? (
                      <span style={{ color: '#a0aec0', fontSize: 13 }}>无设备放置</span>
                    ) : sub.placements.map((p, i) => (
                      <div key={i} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fafafa', minWidth: 100,
                      }}>
                        <img
                          src={stickerImageSrc({ id: p.sticker_id, filename: p.sticker_filename })}
                          alt={p.sticker_name}
                          style={{ width: 48, height: 48, objectFit: 'contain' }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#2d3748', textAlign: 'center' }}>{p.sticker_name}</span>
                        <span style={{ fontSize: 11, color: '#718096', textAlign: 'center' }}>→ {p.node_label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
