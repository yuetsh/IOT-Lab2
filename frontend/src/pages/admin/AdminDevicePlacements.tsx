import { useCallback, useEffect, useRef, useState } from 'react'
import MermaidRenderer from '../../components/MermaidRenderer'
import { normalizeMermaidNodeId } from '../journalState'
import { stickerImageSrc } from './stickerManagement'

interface Placement {
  sticker_id: number
  node_id: string
  node_label: string
  sticker_name: string
  sticker_filename: string
}

interface GroupData {
  group_id: number
  group_name: string
  submission_id: number
  created_at: string
  by_function: Record<string, Placement[]>
  mermaid_code: string | null
}

function fmt(dt: string) {
  return new Date(dt + 'Z').toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

interface Overlay {
  placement: Placement
  x: number
  y: number
  w: number
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
        const el = nodeEls.find(n => normalizeMermaidNodeId(n.id) === p.node_id)
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
            left: x + w - 18,
            top: y - 18,
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
            background: 'rgba(255,255,255,0.85)', borderRadius: 3, padding: '1px 4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}>
            {placement.sticker_name}
          </span>
        </div>
      ))}
    </div>
  )
}

function GroupCard({ data }: { data: GroupData }) {
  const allPlacements = Object.values(data.by_function).flat()
  const functions = Object.keys(data.by_function)

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '14px 20px', background: '#f0fff4', borderBottom: '1px solid #c6f6d5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#276749' }}>{data.group_name}</h3>
        <span style={{ fontSize: 12, color: '#48bb78' }}>保存于 {fmt(data.created_at)} · {allPlacements.length} 个设备</span>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {data.mermaid_code ? (
          <FlowchartWithDevices mermaidCode={data.mermaid_code} placements={allPlacements} />
        ) : (
          <p style={{ color: '#a0aec0', fontSize: 13, margin: 0 }}>该组尚无流程图</p>
        )}

        {/* 按功能分组的图例 */}
        {functions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {functions.map(fn => {
              const ps = data.by_function[fn]
              const first = ps[0]
              return (
                <div key={fn} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f7fafc' }}>
                  <img
                    src={stickerImageSrc({ id: first.sticker_id, filename: first.sticker_filename })}
                    alt={fn}
                    style={{ width: 22, height: 22, objectFit: 'contain' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2d3748' }}>{fn}</span>
                  <span style={{ fontSize: 12, color: '#718096' }}>→</span>
                  <span style={{ fontSize: 12, color: '#4a5568' }}>{ps.map(p => p.node_label).join('、')}</span>
                </div>
              )
            })}
          </div>
        )}
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
        <p style={{ color: '#a0aec0' }}>暂无设备安放记录</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.map(g => <GroupCard key={g.group_id} data={g} />)}
        </div>
      )}
    </div>
  )
}
