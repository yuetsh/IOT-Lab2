# Device Placement Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-step click-node + drag-to-slot pattern in `JournalTab.tsx` with direct drag-from-device-list-onto-flowchart-node assignment.

**Architecture:** Remove `@dnd-kit` entirely. Use native pointer events on device cards and `document.elementFromPoint` to detect which flowchart node is under the pointer during drag. Render transparent `div` overlays positioned over each Mermaid SVG node to act as drop targets and display assigned devices.

**Tech Stack:** React, TypeScript, native Pointer Events API, existing `MermaidRenderer`/`normalizeMermaidNodeId`/`upsertNodePlacement` utilities.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `frontend/src/pages/JournalTab.tsx` | Modify | Full rewrite — remove @dnd-kit, add overlay + pointer drag system |

No other files change. `GroupWorkspace.tsx` passes `onSave`/`onSubmit` by the same interface; `MermaidRenderer` `onRender` callback signature is unchanged.

---

### Task 1: Strip @dnd-kit infrastructure

Remove all `@dnd-kit` code, the `DraggableSticker` and `SelectedNodeSlot` components, and the states that were only needed for the old flow (`activeSticker`, `selectedNodeId`). The file won't render devices yet — that comes in Task 2.

**Files:**
- Modify: `frontend/src/pages/JournalTab.tsx`

- [ ] **Step 1: Replace the file with the stripped skeleton**

Write `frontend/src/pages/JournalTab.tsx` with:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
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
interface NodeOverlay { nodeId: string; x: number; y: number; w: number; h: number }

interface Props {
  mermaidCode: string | null
  stickers: Sticker[]
  placements: Placement[]
  onSave: (placements: Omit<Placement, 'id'>[]) => void
  onSubmit?: (placements: Omit<Placement, 'id'>[]) => Promise<void>
}

function getMermaidNodeLabel(node: SVGGElement, fallback: string) {
  const htmlLabel = node.querySelector('.nodeLabel')?.textContent?.trim()
  if (htmlLabel) return htmlLabel
  const textLabel = Array.from(node.querySelectorAll('text'))
    .map(t => t.textContent?.trim())
    .filter(Boolean)
    .join(' ')
  return textLabel || fallback
}

export default function JournalTab({ mermaidCode, stickers, placements: initPlacements, onSave, onSubmit }: Props) {
  const [placements, setPlacements] = useState<Placement[]>(initPlacements.filter(p => p.node_id))
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([])
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null)
  const [overlays, setOverlays] = useState<NodeOverlay[]>([])
  const [dragSticker, setDragSticker] = useState<Sticker | null>(null)
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const canvasRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const dragStickerRef = useRef<Sticker | null>(null)
  const dragOverNodeIdRef = useRef<string | null>(null)
  const flowNodesRef = useRef<FlowNode[]>([])
  const onSaveRef = useRef(onSave)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  flowNodesRef.current = flowNodes
  onSaveRef.current = onSave

  useEffect(() => {
    setPlacements(initPlacements.filter(p => p.node_id))
  }, [initPlacements])

  const computeOverlays = useCallback((svg: SVGSVGElement) => {
    requestAnimationFrame(() => {
      if (!canvasRef.current) return
      const containerRect = canvasRef.current.getBoundingClientRect()
      const next: NodeOverlay[] = []
      Array.from(svg.querySelectorAll<SVGGElement>('g.node')).forEach(el => {
        const nodeId = el.dataset.journalNodeId ?? normalizeMermaidNodeId(el.id)
        const r = el.getBoundingClientRect()
        next.push({ nodeId, x: r.left - containerRect.left, y: r.top - containerRect.top, w: r.width, h: r.height })
      })
      setOverlays(next)
    })
  }, [])

  const handleMermaidRender = useCallback((svg: SVGSVGElement | null) => {
    setSvgElement(svg)
    if (!svg) { setFlowNodes([]); setOverlays([]); return }
    const nodes = Array.from(svg.querySelectorAll<SVGGElement>('g.node')).map(node => {
      const id = normalizeMermaidNodeId(node.id)
      node.dataset.journalNodeId = id
      return { id, label: getMermaidNodeLabel(node, id) }
    })
    setFlowNodes(nodes)
    computeOverlays(svg)
  }, [computeOverlays])

  useEffect(() => {
    if (!svgElement) return
    const onResize = () => computeOverlays(svgElement)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [svgElement, computeOverlays])

  function showToast(msg: string) {
    setToastMsg(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 2200)
  }

  function removePlacement(nodeId: string) {
    setPlacements(prev => {
      const next = prev.filter(p => p.node_id !== nodeId)
      onSaveRef.current(next)
      return next
    })
  }

  function handleDeviceDragStart(e: React.PointerEvent, sticker: Sticker) {
    e.preventDefault()
    dragStickerRef.current = sticker
    setDragSticker(sticker)
    if (ghostRef.current) {
      ghostRef.current.style.left = e.clientX + 'px'
      ghostRef.current.style.top = e.clientY + 'px'
    }

    const onMove = (ev: PointerEvent) => {
      if (ghostRef.current) {
        ghostRef.current.style.left = ev.clientX + 'px'
        ghostRef.current.style.top = ev.clientY + 'px'
        ghostRef.current.style.visibility = 'hidden'
      }
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      if (ghostRef.current) ghostRef.current.style.visibility = ''
      const nodeId = (el?.closest<HTMLElement>('[data-node-id]') as HTMLElement | null)?.dataset.nodeId ?? null
      if (dragOverNodeIdRef.current !== nodeId) {
        dragOverNodeIdRef.current = nodeId
        setDragOverNodeId(nodeId)
      }
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const nodeId = dragOverNodeIdRef.current
      const s = dragStickerRef.current
      setDragSticker(null)
      setDragOverNodeId(null)
      dragStickerRef.current = null
      dragOverNodeIdRef.current = null
      if (!nodeId || !s) return
      const nodeLabel = flowNodesRef.current.find(n => n.id === nodeId)?.label ?? nodeId
      setPlacements(prev => {
        const wasReplaced = prev.some(p => p.node_id === nodeId)
        const next = upsertNodePlacement(prev, {
          sticker_id: s.id,
          node_id: nodeId,
          node_label: nodeLabel,
          x: 0, y: 0, scale: 1,
          sticker_name: s.name,
          sticker_filename: s.filename,
        })
        onSaveRef.current(next)
        showToast(wasReplaced ? `「${s.name}」已替换` : `「${s.name}」已指派到「${nodeLabel}」`)
        return next
      })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const assignedCount = placements.filter(p => p.node_id).length

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* TODO: ghost, toast, flowchart panel, device panel — added in next tasks */}
      <div style={{ padding: 32, color: '#a0aec0' }}>Task 1 skeleton — UI in next tasks</div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && bun run build 2>&1 | tail -20
```

Expected: no errors (the skeleton is valid TS even with the placeholder div).

---

### Task 2: Add ghost, toast, and flowchart panel with overlays

Replace the placeholder `<div>` with the real JSX: ghost element, toast, left panel with `MermaidRenderer` and node overlays.

**Files:**
- Modify: `frontend/src/pages/JournalTab.tsx` — replace the `return` block

- [ ] **Step 1: Replace the return statement**

Replace the entire `return (...)` in `JournalTab` (from `return (` through the closing `}`) with:

```tsx
  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* Drag ghost */}
      <div
        ref={ghostRef}
        style={{
          position: 'fixed', pointerEvents: 'none', zIndex: 9999,
          display: dragSticker ? 'flex' : 'none',
          flexDirection: 'column', alignItems: 'center', gap: 4,
          transform: 'translate(-50%, -50%)',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))',
        }}
      >
        {dragSticker && (
          <>
            <img src={stickerImageSrc(dragSticker)} alt={dragSticker.name} style={{ width: 56, height: 56, objectFit: 'contain' }} />
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#2d3748',
              background: 'rgba(255,255,255,0.95)', borderRadius: 4, padding: '2px 6px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
            }}>{dragSticker.name}</span>
          </>
        )}
      </div>

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#276749', color: '#fff', padding: '10px 20px', borderRadius: 8,
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 10000, pointerEvents: 'none',
        }}>
          {toastMsg}
        </div>
      )}

      {/* Left: flowchart */}
      <div style={{ flex: 3, overflowY: 'auto', padding: 16, borderRight: '1px solid #e2e8f0' }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: '#718096' }}>
          从右侧拖拽设备，直接放到流程图节点上完成指派
        </p>
        <div
          ref={canvasRef}
          style={{ position: 'relative', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, minHeight: 260 }}
        >
          {mermaidCode ? (
            <MermaidRenderer code={mermaidCode} style={{ padding: 16 }} onRender={handleMermaidRender} />
          ) : (
            <div style={{ padding: 60, textAlign: 'center', color: '#a0aec0' }}>先在对话标签页生成流程图</div>
          )}

          {/* Node overlays */}
          {overlays.map(overlay => {
            const placement = placements.find(p => p.node_id === overlay.nodeId)
            const isTarget = dragOverNodeId === overlay.nodeId
            return (
              <div
                key={overlay.nodeId}
                data-node-id={overlay.nodeId}
                style={{
                  position: 'absolute',
                  left: overlay.x, top: overlay.y, width: overlay.w, height: overlay.h,
                  borderRadius: 6,
                  border: isTarget ? '2px solid #4299e1' : '2px solid transparent',
                  background: isTarget ? 'rgba(66,153,225,0.12)' : 'transparent',
                  boxShadow: isTarget ? '0 0 0 3px rgba(66,153,225,0.2)' : 'none',
                  transition: 'border-color 0.12s, background 0.12s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'auto',
                }}
              >
                {placement && (
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <img
                      src={stickerImageSrc({ id: placement.sticker_id, filename: placement.sticker_filename })}
                      alt={placement.sticker_name}
                      style={{ width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))', pointerEvents: 'none' }}
                    />
                    <span style={{
                      fontSize: 9, fontWeight: 600, color: '#1a202c',
                      background: 'rgba(255,255,255,0.9)', borderRadius: 3, padding: '1px 3px', whiteSpace: 'nowrap',
                    }}>
                      {placement.sticker_name}
                    </span>
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={() => removePlacement(overlay.nodeId)}
                      style={{
                        position: 'absolute', top: -8, right: -10,
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#fc8181', border: 'none', color: '#fff',
                        fontSize: 12, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                      }}
                    >×</button>
                  </div>
                )}
                {isTarget && !placement && (
                  <span style={{ fontSize: 10, color: '#2b6cb0', fontWeight: 700, pointerEvents: 'none' }}>放这里</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: device panel — added in Task 3 */}
      <div style={{ flex: 1, padding: 16 }}>
        <p style={{ color: '#a0aec0', fontSize: 13 }}>devices coming in Task 3</p>
      </div>
    </div>
  )
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && bun run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

---

### Task 3: Add DeviceCard component and right panel

Add the `DeviceCard` component above `JournalTab` and replace the placeholder right panel with the real device list + submit button + summary bar.

**Files:**
- Modify: `frontend/src/pages/JournalTab.tsx`

- [ ] **Step 1: Add DeviceCard component**

Insert this function before the `export default function JournalTab` line:

```tsx
function DeviceCard({ sticker, isDragging, onPointerDown }: {
  sticker: Sticker
  isDragging: boolean
  onPointerDown: (e: React.PointerEvent) => void
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: 8, borderRadius: 8, border: `1px solid ${sticker.theme_color}`, background: '#fff',
        cursor: 'grab', opacity: isDragging ? 0.4 : 1, userSelect: 'none',
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
```

- [ ] **Step 2: Replace the right panel placeholder**

In the return JSX, find the placeholder right panel:

```tsx
      {/* Right: device panel — added in Task 3 */}
      <div style={{ flex: 1, padding: 16 }}>
        <p style={{ color: '#a0aec0', fontSize: 13 }}>devices coming in Task 3</p>
      </div>
```

Replace with:

```tsx
      {/* Right: device panel */}
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
              padding: '10px 0', borderRadius: 8, border: 'none',
              cursor: placements.length === 0 ? 'default' : 'pointer',
              fontSize: 14, fontWeight: 600,
              background: submitState === 'saved' ? '#c6f6d5' : placements.length === 0 ? '#edf2f7' : '#4299e1',
              color: submitState === 'saved' ? '#276749' : placements.length === 0 ? '#a0aec0' : '#fff',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {submitState === 'saving' ? '保存中…' : submitState === 'saved' ? '已保存 ✓' : '保存设备方案'}
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflow: 'hidden' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#4a5568', flexShrink: 0 }}>设备</p>
          {stickers.length === 0 && (
            <p style={{ color: '#a0aec0', fontSize: 13 }}>暂无设备，教师可在后台上传</p>
          )}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {stickers.map(s => (
                <DeviceCard
                  key={s.id}
                  sticker={s}
                  isDragging={dragSticker?.id === s.id}
                  onPointerDown={e => handleDeviceDragStart(e, s)}
                />
              ))}
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#718096', flexShrink: 0, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
            已指派 <span style={{ color: '#38a169', fontWeight: 600 }}>{assignedCount}</span> / {flowNodes.length} 个节点
          </p>
        </div>
      </div>
```

- [ ] **Step 3: Build and verify**

```bash
cd frontend && bun run build 2>&1 | tail -20
```

Expected: clean build, no errors.

---

### Task 4: Manual smoke test

Start dev server and test the full interaction.

- [ ] **Step 1: Start dev server**

```bash
bun run dev
```

Open http://localhost:5173, navigate to a group workspace, go to 设备台 tab.

- [ ] **Step 2: Verify flowchart renders with overlays**

The flowchart should appear on the left. Each node should have a transparent overlay (invisible until dragging).

- [ ] **Step 3: Test drag-to-assign**

Drag a device from the right panel onto a flowchart node. Expected:
- Ghost image follows the pointer
- Hovered node shows blue highlight + "放这里" text
- On release: device badge appears on the node, toast shows "已指派到「节点名」"
- Summary bar updates: "已指派 1 / N 个节点"

- [ ] **Step 4: Test replace**

Drag a different device onto the already-assigned node. Expected:
- Toast shows "已替换"
- Node badge updates to the new device

- [ ] **Step 5: Test remove**

Hover over an assigned node. Expected: red × button appears in top-right corner of the badge. Click it — device is removed, badge disappears.

- [ ] **Step 6: Test drag cancel**

Start dragging a device and release outside any node (on the flowchart background or outside the canvas). Expected: no assignment made, ghost disappears.

- [ ] **Step 7: Test submit**

Assign at least one device, click "保存设备方案". Expected: button shows "保存中…" then "已保存 ✓".

---

### Task 5: Commit

- [ ] **Step 1: Commit**

```bash
git add frontend/src/pages/JournalTab.tsx
git commit -m "refactor: redesign device placement — drag directly onto flowchart nodes

Replace two-step click-node + drag-to-slot with direct drag from device
list onto flowchart nodes. Uses native pointer events and elementFromPoint
for node detection. Removes @dnd-kit dependency from JournalTab."
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| Right panel: only device list, remove SelectedNodeSlot | Task 3 |
| Flowchart nodes become drop targets (overlay divs) | Task 2 |
| Drag ghost follows pointer | Task 2 |
| Hover highlight + "放这里" text | Task 2 |
| Drop = assign, call onSave | Task 1 (`handleDeviceDragStart`) |
| Replace on re-drop | Task 1 (`upsertNodePlacement`) |
| Remove via × button | Task 2 |
| Toast feedback | Task 1 (`showToast`) |
| Summary bar: assigned / total | Task 3 |
| Submit button preserved | Task 3 |
| Resize recomputes overlays | Task 1 (resize listener) |

All spec requirements covered. ✓

**Placeholder scan:** No TBD/TODO in final tasks. Task 1 and 2 intermediate TODOs are replaced by Task 3. ✓

**Type consistency:**
- `NodeOverlay` defined once in Task 1, used in Task 2 overlay rendering ✓
- `FlowNode` unchanged from original ✓
- `Placement` unchanged from original ✓
- `DeviceCard` props: `sticker: Sticker`, `isDragging: boolean`, `onPointerDown: (e: React.PointerEvent) => void` — consistent throughout ✓
- `handleDeviceDragStart(e: React.PointerEvent, sticker: Sticker)` — called as `e => handleDeviceDragStart(e, s)` in Task 3 ✓
