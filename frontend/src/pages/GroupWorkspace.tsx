import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import ChatTab, { type WorkspaceContext } from './ChatTab'
import JournalTab from './JournalTab'
import { getGroupWorkspacePath, isGroupWorkspaceTab } from './groupRoutes'
import { normalizeMermaidNodeId, shouldClearPlacementsOnFlowchartChange } from './journalState'

interface Sticker { id: number; name: string; description: string; install_location: string; theme_color: string; filename: string }
interface Placement {
  id?: number
  sticker_id: number
  node_id?: string | null
  node_label?: string | null
  x: number
  y: number
  scale: number
  sticker_name: string
  sticker_filename: string
}

interface AiCheckResult {
  device_name: string
  node_label: string
  passed: boolean
  comment: string
}

export default function GroupWorkspace() {
  const { id, tab } = useParams<{ id: string; tab: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const routeArea = searchParams.get('area')
  const routeFlowchartIdParam = searchParams.get('flowchartId')
  const routeFlowchartId = routeFlowchartIdParam && Number.isFinite(Number(routeFlowchartIdParam))
    ? Number(routeFlowchartIdParam)
    : null
  const routeContext = useMemo<WorkspaceContext>(() => ({
    area: routeArea,
    flowchartId: routeFlowchartId,
  }), [routeArea, routeFlowchartId])
  const [mermaidCode, setMermaidCode] = useState<string | null>(null)
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [areasWithFlowcharts, setAreasWithFlowcharts] = useState<string[]>([])
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext>(routeContext)
  const [aiCheckResults, setAiCheckResults] = useState<AiCheckResult[] | null>(null)
  const lastNonEmptyMermaidCodeRef = useRef<string | null>(null)
  const mermaidCodeRef = useRef<string | null>(null)
  mermaidCodeRef.current = mermaidCode

  useEffect(() => {
    if (!id || !isGroupWorkspaceTab(tab)) return

    setWorkspaceContext(routeContext)

    const params = new URLSearchParams()
    if (routeContext.area) params.set('area', routeContext.area)
    if (routeContext.flowchartId != null) params.set('flowchartId', String(routeContext.flowchartId))
    const conversationUrl = `/api/groups/${id}/conversation${params.toString() ? `?${params}` : ''}`

    // 加载手帐初始 mermaid（指定功能/流程图或最新一次，用于设备台展示）
    fetch(conversationUrl)
      .then(r => r.json())
      .then(data => {
        const code = data.flowchart?.mermaid_code ?? null
        const flowchartId: number | null = data.flowchart?.id ?? null
        setMermaidCode(code)
        lastNonEmptyMermaidCodeRef.current = code
        // 设备台切换区域后，把加载到的 flowchartId 补回 URL
        if (tab === 'journal' && routeContext.area && flowchartId != null && routeContext.flowchartId == null) {
          navigate(getGroupWorkspacePath(id, 'journal', { area: routeContext.area, flowchartId }), { replace: true })
        }
        // 没有流程图时清空设备，有流程图时才加载已保存的摆放
        if (code === null) {
          setPlacements([])
        } else {
          const journalParams = new URLSearchParams()
          if (routeContext.area) journalParams.set('area', routeContext.area)
          fetch(`/api/groups/${id}/journal${journalParams.toString() ? `?${journalParams}` : ''}`).then(r => r.json()).then(setPlacements)
        }
      })
    fetch('/api/stickers').then(r => r.json()).then(setStickers)
    fetch(`/api/groups/${id}/areas-with-flowcharts`).then(r => r.json()).then(setAreasWithFlowcharts)
  }, [id, tab, routeContext])

  const handleWorkspaceContextChange = useCallback((context: WorkspaceContext) => {
    setWorkspaceContext(context)
    if (!id || !isGroupWorkspaceTab(tab)) return

    const nextPath = getGroupWorkspacePath(id, tab, context)
    const currentPath = `${location.pathname}${location.search}`
    if (nextPath !== currentPath) {
      navigate(nextPath, { replace: true })
    }
  }, [id, tab, location.pathname, location.search, navigate])

  const savePlacements = useCallback(async (next: Omit<Placement, 'id'>[]) => {
    if (!id) return

    await fetch(`/api/groups/${id}/journal`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area: routeArea ?? '',
        placements: next
          .filter(p => p.node_id && p.node_label)
          .map(p => ({
            sticker_id: p.sticker_id,
            node_id: normalizeMermaidNodeId(p.node_id!),
            node_label: p.node_label,
          }))
      })
    })
  }, [id, routeArea])

  const handleAiCheck = useCallback(async (currentPlacements: Omit<Placement, 'id'>[]) => {
    if (!id) return
    const saveRes = await fetch(`/api/groups/${id}/device-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area: routeArea,
        placements: currentPlacements
          .filter(p => p.node_id && p.node_label)
          .map(p => ({
            sticker_id: p.sticker_id,
            node_id: normalizeMermaidNodeId(p.node_id!),
            node_label: p.node_label!,
            sticker_name: p.sticker_name,
            sticker_filename: p.sticker_filename,
          })),
        mermaid_code: mermaidCodeRef.current,
      })
    })
    const { submission_id } = await saveRes.json() as { ok: boolean; submission_id: number }
    const checkRes = await fetch(`/api/groups/${id}/device-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id }),
    })
    if (!checkRes.ok) throw new Error('AI 检测请求失败')
    const data = await checkRes.json() as { results: AiCheckResult[] }
    setAiCheckResults(data.results)
  }, [id, routeArea])

  const handleJournalAreaChange = useCallback((area: string) => {
    if (!id || !isGroupWorkspaceTab(tab)) return
    const nextPath = getGroupWorkspacePath(id, 'journal', { area })
    navigate(nextPath, { replace: true })
  }, [id, tab, navigate])

  const handleMermaidChange = useCallback((nextCode: string | null) => {
    const previousCode = lastNonEmptyMermaidCodeRef.current

    if (shouldClearPlacementsOnFlowchartChange(previousCode, nextCode)) {
      setPlacements([])
      void savePlacements([])
    }

    if (nextCode !== null) {
      lastNonEmptyMermaidCodeRef.current = nextCode
    }
    setMermaidCode(nextCode)
  }, [savePlacements])

  if (!id || !isGroupWorkspaceTab(tab)) {
    return <Navigate to="/" replace />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* 顶栏 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff', gap: 16 }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096', fontSize: 14 }}
        >← 返回</button>
        <div style={{ display: 'flex', gap: 4, background: '#f7fafc', borderRadius: 8, padding: 4 }}>
          {(['chat', 'journal'] as const).map(t => (
            <button
              key={t}
              onClick={() => navigate(getGroupWorkspacePath(id, t, workspaceContext))}
              style={{
                padding: '6px 20px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14,
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? '#2d3748' : '#718096',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                fontWeight: tab === t ? 600 : 400
              }}
            >
              {t === 'chat' ? '功能设计' : '设备选型'}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'chat' ? (
          <ChatTab
            groupId={id!}
            initialArea={routeContext.area}
            initialFlowchartId={routeContext.flowchartId}
            onMermaidChange={handleMermaidChange}
            onWorkspaceContextChange={handleWorkspaceContextChange}
          />
        ) : (
          <JournalTab
            mermaidCode={mermaidCode}
            stickers={stickers}
            placements={placements}
            area={routeArea}
            areasWithFlowcharts={areasWithFlowcharts}
            onAreaChange={handleJournalAreaChange}
            onSave={next => { setPlacements(next as Placement[]); savePlacements(next) }}
            onAiCheck={handleAiCheck}
            aiCheckResults={aiCheckResults}
            aiCheckArea={routeArea}
          />
        )}
      </div>
    </div>
  )
}
