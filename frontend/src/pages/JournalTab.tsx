import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import MermaidRenderer from '../components/MermaidRenderer'
import { normalizeMermaidNodeId, upsertNodePlacement } from './journalState'
import { stickerImageSrc } from './admin/stickerManagement'

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
interface FlowNode { id: string; label: string }

interface Props {
  mermaidCode: string | null
  stickers: Sticker[]
  placements: Placement[]
  onSave: (placements: Omit<Placement, 'id'>[]) => void
  onSubmit?: (placements: Omit<Placement, 'id'>[]) => Promise<void>
}

function DraggableSticker({ sticker }: { sticker: Sticker }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `panel-${sticker.id}`,
    data: { sticker }
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: 8, borderRadius: 8, border: `1px solid ${sticker.theme_color}`, background: '#fff',
        cursor: 'grab', opacity: isDragging ? 0.4 : 1,
        transform: CSS.Translate.toString(transform), userSelect: 'none'
      }}
    >
      <img src={stickerImageSrc(sticker)} alt={sticker.name} style={{ width: 56, height: 56, objectFit: 'contain', pointerEvents: 'none' }} />
      <span style={{ width: 16, height: 4, borderRadius: 4, background: sticker.theme_color }} />
      <span style={{ fontSize: 11, color: '#4a5568', textAlign: 'center' }}>{sticker.name}</span>
      {sticker.install_location && (
        <span style={{ fontSize: 10, color: '#2b6cb0', textAlign: 'center' }}>{sticker.install_location}</span>
      )}
    </div>
  )
}

function SelectedNodeSlot({
  node,
  placement,
  onRemove,
}: {
  node: FlowNode | null
  placement: Placement | undefined
  onRemove: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'selected-node-slot',
    disabled: !node,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 110,
        border: '2px dashed',
        borderColor: !node ? '#cbd5e1' : isOver ? '#0f766e' : '#38bdf8',
        borderRadius: 8,
        background: !node ? '#f8fafc' : isOver ? '#ecfdf5' : '#f0f9ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {!node ? (
        <span style={{ color: '#718096', fontSize: 13 }}>先点击左侧流程图节点</span>
      ) : placement ? (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <img
            src={stickerImageSrc({ id: placement.sticker_id, filename: placement.sticker_filename })}
            alt={placement.sticker_name}
            draggable={false}
            style={{ width: 58, height: 58, objectFit: 'contain' }}
          />
          <span style={{ color: '#2d3748', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>{placement.sticker_name}</span>
          <button
            onClick={onRemove}
            style={{
              position: 'absolute', top: -12, right: -18,
              width: 20, height: 20, borderRadius: '50%',
              background: '#fc8181', border: 'none', color: '#fff',
              fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
            }}
          >×</button>
        </div>
      ) : (
        <span style={{ color: '#0369a1', fontSize: 13, fontWeight: 700 }}>拖入设备</span>
      )}
    </div>
  )
}

function getMermaidNodeLabel(node: SVGGElement, fallback: string) {
  const htmlLabel = node.querySelector('.nodeLabel')?.textContent?.trim()
  if (htmlLabel) return htmlLabel

  const textLabel = Array.from(node.querySelectorAll('text'))
    .map(text => text.textContent?.trim())
    .filter(Boolean)
    .join(' ')
  return textLabel || fallback
}

export default function JournalTab({ mermaidCode, stickers, placements: initPlacements, onSave, onSubmit }: Props) {
  const [placements, setPlacements] = useState<Placement[]>(initPlacements.filter(p => p.node_id))
  const [activeSticker, setActiveSticker] = useState<Sticker | null>(null)
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null)
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setPlacements(initPlacements.filter(p => p.node_id))
  }, [initPlacements])

  const selectedNode = useMemo(
    () => flowNodes.find(node => node.id === selectedNodeId) ?? null,
    [flowNodes, selectedNodeId]
  )
  const selectedPlacement = selectedNode
    ? placements.find(p => p.node_id === selectedNode.id)
    : undefined

  const handleMermaidRender = useCallback((svg: SVGSVGElement | null) => {
    setSvgElement(svg)
    if (!svg) {
      setFlowNodes([])
      setSelectedNodeId(null)
      return
    }

    const nodes = Array.from(svg.querySelectorAll<SVGGElement>('g.node')).map(node => {
      const id = normalizeMermaidNodeId(node.id)
      node.dataset.journalNodeId = id
      return { id, label: getMermaidNodeLabel(node, id) }
    })

    setFlowNodes(nodes)
    setSelectedNodeId(current => current && nodes.some(node => node.id === current) ? current : null)
  }, [])

  useEffect(() => {
    if (!svgElement) return

    const nodeElements = Array.from(svgElement.querySelectorAll<SVGGElement>('g.node'))
    const cleanups = nodeElements.map(element => {
      const nodeId = element.dataset.journalNodeId ?? normalizeMermaidNodeId(element.id)
      const onClick = () => setSelectedNodeId(nodeId)
      element.addEventListener('click', onClick)
      return () => element.removeEventListener('click', onClick)
    })

    return () => {
      cleanups.forEach(cleanup => cleanup())
    }
  }, [svgElement])

  useEffect(() => {
    if (!svgElement) return

    Array.from(svgElement.querySelectorAll<SVGGElement>('g.node')).forEach(element => {
      const nodeId = element.dataset.journalNodeId ?? normalizeMermaidNodeId(element.id)
      element.dataset.selected = nodeId === selectedNodeId ? 'true' : 'false'
    })
  }, [selectedNodeId, svgElement])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (String(event.active.id).startsWith('panel-')) {
      setActiveSticker(event.active.data.current?.sticker ?? null)
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveSticker(null)
    if (event.over?.id !== 'selected-node-slot' || !selectedNode) return

    const sticker: Sticker | undefined = event.active.data.current?.sticker
    if (!sticker) return

    const nextPlacement: Placement = {
      sticker_id: sticker.id,
      node_id: selectedNode.id,
      node_label: selectedNode.label,
      x: 0,
      y: 0,
      scale: 1,
      sticker_name: sticker.name,
      sticker_filename: sticker.filename
    }
    const next = upsertNodePlacement(placements, nextPlacement)
    setPlacements(next)
    onSave(next)
  }, [onSave, placements, selectedNode])

  function removeSelectedPlacement() {
    if (!selectedNode) return

    const next = placements.filter(p => p.node_id !== selectedNode.id)
    setPlacements(next)
    onSave(next)
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', height: '100%' }}>
        <style>{`
          .journal-mermaid g.node {
            cursor: pointer;
          }
          .journal-mermaid g.node[data-selected="true"] rect,
          .journal-mermaid g.node[data-selected="true"] polygon,
          .journal-mermaid g.node[data-selected="true"] circle,
          .journal-mermaid g.node[data-selected="true"] ellipse,
          .journal-mermaid g.node[data-selected="true"] path {
            stroke: #0f766e !important;
            stroke-width: 4px !important;
            filter: drop-shadow(0 4px 8px rgba(15, 118, 110, 0.25));
          }
        `}</style>

        <div style={{ flex: 3, overflowY: 'auto', padding: 16, borderRight: '1px solid #e2e8f0' }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#718096' }}>点击流程图节点，再在右侧为该节点放置设备</p>
          <div
            className="journal-mermaid"
            style={{
              position: 'relative',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              minHeight: 260,
            }}
          >
            {mermaidCode ? (
              <MermaidRenderer code={mermaidCode} style={{ padding: 16 }} onRender={handleMermaidRender} />
            ) : (
              <div style={{ padding: 60, textAlign: 'center', color: '#a0aec0' }}>
                先在对话标签页生成流程图
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {onSubmit && (
            <button
              disabled={submitState === 'saving' || placements.length === 0}
              onClick={async () => {
                if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
                setSubmitState('saving')
                await onSubmit(placements)
                setSubmitState('saved')
                savedTimerRef.current = setTimeout(() => setSubmitState('idle'), 2500)
              }}
              style={{
                padding: '10px 0', borderRadius: 8, border: 'none', cursor: placements.length === 0 ? 'default' : 'pointer',
                fontSize: 14, fontWeight: 600,
                background: submitState === 'saved' ? '#c6f6d5' : placements.length === 0 ? '#edf2f7' : '#4299e1',
                color: submitState === 'saved' ? '#276749' : placements.length === 0 ? '#a0aec0' : '#fff',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {submitState === 'saving' ? '保存中…' : submitState === 'saved' ? '已保存 ✓' : '保存设备方案'}
            </button>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2d3748' }}>当前节点</p>
            <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: selectedNode ? '#0f172a' : '#718096' }}>
                {selectedNode?.label ?? '未选择节点'}
              </p>
              {selectedNode && (
                <p style={{ margin: 0, fontSize: 11, color: '#718096' }}>节点 ID：{selectedNode.id}</p>
              )}
            </div>
            <SelectedNodeSlot
              node={selectedNode}
              placement={selectedPlacement}
              onRemove={removeSelectedPlacement}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflow: 'hidden' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#4a5568', flexShrink: 0 }}>设备</p>
            {stickers.length === 0 && (
              <p style={{ color: '#a0aec0', fontSize: 13 }}>暂无设备，教师可在后台上传</p>
            )}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {stickers.map(s => <DraggableSticker key={s.id} sticker={s} />)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeSticker && (
          <img
            src={stickerImageSrc(activeSticker)}
            alt={activeSticker.name}
            style={{ width: 56, height: 56, objectFit: 'contain', opacity: 0.85, cursor: 'grabbing' }}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
