import { useCallback, useEffect, useRef, useState } from 'react'
import MermaidRenderer from '../../components/MermaidRenderer'
import { normalizeMermaidNodeId } from '../journalState'
import { stickerImageSrc } from './stickerManagement'

const AREAS = ['大门区域', '身份识别', '大厅安防', 'LED显示', '绿色植物', '自助系统'] as const
type Area = typeof AREAS[number]

interface Placement {
  sticker_id: number
  node_id: string
  node_label: string
  sticker_name: string
  sticker_filename: string
}

interface CheckResultItem {
  device_name: string
  node_label: string
  passed: boolean
  comment: string
}

interface CheckResult {
  passed_count: number
  total_count: number
  results: CheckResultItem[]
  created_at: string
}

interface AreaData {
  mermaid_code: string | null
  placements: Placement[]
  submission_created_at: string | null
  check_result: CheckResult | null
  check_results: CheckResult[]
  check_count: number
}

interface GroupData {
  group_id: number
  group_name: string
  areas: Record<string, AreaData>
}

interface Overlay {
  placement: Placement
  x: number
  y: number
  w: number
}

function fmt(dt: string) {
  return new Date(dt + 'Z').toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function FlowchartWithDevices({ mermaidCode, placements }: { mermaidCode: string; placements: Placement[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const placementsRef = useRef(placements)
  placementsRef.current = placements
  const [overlays, setOverlays] = useState<Overlay[]>([])

  const handleRender = useCallback((svg: SVGSVGElement | null) => {
    if (!svg || !containerRef.current) { setOverlays([]); return }
    requestAnimationFrame(() => {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const nodeEls = Array.from(svg.querySelectorAll<SVGGElement>('g.node'))
      const next: Overlay[] = []
      for (const p of placementsRef.current) {
        const placementNodeId = normalizeMermaidNodeId(p.node_id)
        const el = nodeEls.find(n => normalizeMermaidNodeId(n.id) === placementNodeId)
        if (!el) continue
        const r = el.getBoundingClientRect()
        next.push({ placement: p, x: r.left - containerRect.left, y: r.top - containerRect.top, w: r.width })
      }
      setOverlays(next)
    })
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <MermaidRenderer code={mermaidCode} style={{ padding: 16 }} onRender={handleRender} />
      {overlays.map(({ placement, x, y, w }, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x + w / 2 - 18,
            top: y - 22,
            pointerEvents: 'none',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <img
            src={stickerImageSrc({ id: placement.sticker_id, filename: placement.sticker_filename })}
            alt={placement.sticker_name}
            style={{ width: 36, height: 36, objectFit: 'contain', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.35))' }}
          />
          <span style={{
            fontSize: 10, fontWeight: 600, color: '#1a202c', whiteSpace: 'nowrap',
            background: 'rgba(255,255,255,0.9)', borderRadius: 3, padding: '1px 4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}>
            {placement.sticker_name}
          </span>
        </div>
      ))}
    </div>
  )
}

function AreaPanel({ areaData }: { areaData: AreaData }) {
  if (!areaData.mermaid_code && areaData.placements.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: '#cbd5e0', fontSize: 13 }}>
        该区域暂无流程图和设备安放记录
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* 左：流程图 + 设备列表 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {areaData.submission_created_at && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#718096' }}>
              设备方案保存于 {fmt(areaData.submission_created_at)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, padding: '2px 10px', borderRadius: 10, background: '#c6f6d5', color: '#276749' }}>
              {areaData.placements.length} 个设备
            </span>
          </div>
        )}
        {areaData.mermaid_code ? (
          <FlowchartWithDevices mermaidCode={areaData.mermaid_code} placements={areaData.placements} />
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#a0aec0', fontSize: 15, background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            该区域暂无流程图
          </div>
        )}
        {areaData.placements.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {areaData.placements.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
                <img src={stickerImageSrc({ id: p.sticker_id, filename: p.sticker_filename })} alt={p.sticker_name} style={{ width: 26, height: 26, objectFit: 'contain' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#2d3748' }}>{p.sticker_name}</span>
                <span style={{ fontSize: 13, color: '#718096' }}>→ {p.node_label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 右：检测历史 */}
      {areaData.check_count > 0 && (
        <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#718096', fontWeight: 600 }}>AI检测历史</span>
            <span style={{ fontSize: 13, fontWeight: 600, padding: '2px 10px', borderRadius: 10, background: '#ebf8ff', color: '#2b6cb0' }}>
              共 {areaData.check_count} 次
            </span>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ maxHeight: 560, overflowY: 'auto' }}>
              {areaData.check_results.map((cr, ci) => {
                const allPassed = cr.passed_count === cr.total_count
                return (
                  <div key={ci} style={{ background: '#fff', borderBottom: ci < areaData.check_results.length - 1 ? '2px solid #e2e8f0' : undefined }}>
                    {/* 标题行 */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 16px',
                      background: allPassed ? '#f0fff4' : '#fff5f5',
                    }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                        background: allPassed ? '#276749' : '#c53030', color: '#fff',
                      }}>{areaData.check_count - ci}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: allPassed ? '#276749' : '#c53030' }}>
                        {cr.passed_count} / {cr.total_count} 通过
                      </span>
                      <span style={{ fontSize: 13, color: '#a0aec0', marginLeft: 'auto' }}>{fmt(cr.created_at)}</span>
                    </div>
                    {/* 明细 */}
                    <div>
                      {cr.results.map((r, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '10px 16px',
                          borderTop: '1px solid #e2e8f0',
                          background: r.passed ? '#f0fff4' : '#fff5f5',
                        }}>
                          <span style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700,
                            background: r.passed ? '#c6f6d5' : '#fed7d7',
                            color: r.passed ? '#276749' : '#c53030',
                          }}>{r.passed ? '✓' : '✗'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#2d3748' }}>
                              {r.device_name} → {r.node_label}
                            </div>
                            <div style={{ fontSize: 13, color: '#718096', marginTop: 3, lineHeight: 1.5 }}>{r.comment}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GroupCard({ data }: { data: GroupData }) {
  const [activeArea, setActiveArea] = useState<Area>(AREAS[0])
  const areaData = data.areas[activeArea] ?? { mermaid_code: null, placements: [], submission_created_at: null, check_result: null, check_results: [], check_count: 0 }
  const submittedCount = AREAS.filter(a => (data.areas[a]?.placements.length ?? 0) > 0).length

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      {/* 组标题 */}
      <div style={{
        padding: '14px 20px', background: '#f0fff4', borderBottom: '1px solid #c6f6d5',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#276749' }}>{data.group_name}</h3>
        <span style={{ fontSize: 12, color: '#48bb78' }}>
          {submittedCount} / {AREAS.length} 个区域已安放
        </span>
      </div>

      {/* 区域 tabs */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid #e2e8f0',
        display: 'flex', gap: 8, flexWrap: 'wrap',
      }}>
        {AREAS.map(area => {
          const hasDevices = (data.areas[area]?.placements.length ?? 0) > 0
          const hasFlowchart = !!data.areas[area]?.mermaid_code
          const isActive = area === activeArea
          return (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              style={{
                padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
                background: isActive ? '#4299e1' : hasDevices ? '#c6f6d5' : hasFlowchart ? '#edf2f7' : '#f7fafc',
                color: isActive ? '#fff' : hasDevices ? '#276749' : hasFlowchart ? '#4a5568' : '#a0aec0',
                fontWeight: isActive || hasDevices ? 600 : 400,
                transition: 'background 0.15s',
              }}
            >
              {area}
              {hasDevices && !isActive && (
                <span style={{ marginLeft: 4, fontSize: 10 }}>✓</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 当前区域内容 */}
      <div style={{ padding: '16px 20px' }}>
        <AreaPanel areaData={areaData} />
      </div>
    </div>
  )
}

export default function AdminDevicePlacements() {
  const [groups, setGroups] = useState<GroupData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/device-placements')
      .then(r => r.json())
      .then(data => { setGroups(data); setLoading(false) })
  }, [])

  if (loading) return <p style={{ color: '#a0aec0' }}>加载中…</p>

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>设备安放总览</h2>
      {groups.length === 0 ? (
        <p style={{ color: '#a0aec0' }}>暂无小组记录</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.map(g => <GroupCard key={g.group_id} data={g} />)}
        </div>
      )}
    </div>
  )
}
