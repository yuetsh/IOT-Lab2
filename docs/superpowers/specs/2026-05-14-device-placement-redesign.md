# 设备台交互重设计

**日期：** 2026-05-14  
**文件：** `frontend/src/pages/JournalTab.tsx`

## 背景

原交互要求用户先点击流程图节点选中，再把设备贴纸从右侧面板向上拖到 `SelectedNodeSlot` drop zone，目标区域小且与流程图脱节，不直观。

## 目标

用户能直接把设备贴纸从右侧列表拖到流程图的节点上完成指派，交互自然、目标明确。

---

## 布局变更

### 左侧：流程图区域（`flex: 3`）

- 顶部提示语改为：「从右侧拖拽设备，直接放到流程图节点上完成指派」
- Mermaid SVG 渲染后，在每个 `g.node` 的 bounding rect 位置叠一层透明 `div`（node overlay），绝对定位于 canvas 容器内
- Overlay 是 drop target，不影响流程图视觉
- 已指派设备的节点在 overlay 内显示设备图标 + 名称 badge（与原逻辑相同）

### 右侧：设备面板（固定 200px）

- **移除：** `SelectedNodeSlot` drop zone、"当前选中节点"信息区
- **保留：** 设备列表（`DraggableSticker` 卡片，可拖拽）
- **新增：** 底部汇总行，显示「已指派 X / N 个节点」
- N = `flowNodes.length`（从 SVG 解析出的节点总数）

---

## 交互规格

### 拖拽流程

1. 用户在右侧设备列表 `pointerdown` → 开始拖拽
2. 显示跟手幽灵（设备图标 + 名称），原卡片半透明
3. 拖拽移动时：
   - 使用 `document.elementFromPoint(x, y)` 找到鼠标下的 node overlay
   - 进入 overlay → 蓝色高亮边框 + 内部显示「放这里」文字
   - 离开 overlay → 取消高亮
4. `pointerup`：
   - **命中 overlay** → 指派设备到该节点，调用 `onSave`，显示 toast 提示
   - **未命中** → 取消，无操作

### 替换逻辑

- 已有设备的节点再次拖入新设备：直接替换，调用 `onSave`，toast 显示「已替换」

### 移除设备

- 节点 overlay 上有设备时，鼠标悬停显示右上角红色 `×` 按钮
- 点击 `×` → 移除该节点的指派，调用 `onSave`

### 自动保存

- 每次指派、替换、移除操作后立即调用 `onSave(placements)`（与原逻辑相同）
- 「保存设备方案」按钮（`onSubmit`）保留，0 指派时禁用

---

## 技术实现

### 状态简化

**移除以下状态：**
- `selectedNodeId` / `selectedNode`（不再需要"选中节点"概念）
- `activeSticker`（DragOverlay 依赖此，一并移除）

**保留：**
- `placements`、`flowNodes`、`svgElement`、`submitState`

### `@dnd-kit` 用量缩减

- 移除：`DragOverlay`、`useDroppable`（`SelectedNodeSlot` 组件整体删除）、`DragStartEvent`
- 移除：`DraggableSticker` 的 `@dnd-kit` binding，改用原生 pointer events
- 保留：`@dnd-kit/core` 可整体移除（若无其他用处），或保留 import 不用

### Node Overlay 定位

```
onRender(svg) 回调触发后：
  requestAnimationFrame(() => {
    for each g.node in svg:
      r = el.getBoundingClientRect()
      containerRect = canvas.getBoundingClientRect()
      overlay = { nodeId, x: r.left - containerRect.left, y: r.top - containerRect.top, w: r.width, h: r.height }
  })
```

SVG 节点 ID 通过 `normalizeMermaidNodeId` 处理（复用现有逻辑）。

### Pointer Events 拖拽

```
pointerdown on device card:
  setDragDevice(device)
  card.setPointerCapture(e.pointerId)  // 或 window listener

pointermove:
  update ghost position
  ghost.style.display = 'none'
  el = document.elementFromPoint(x, y)
  ghost.style.display = 'flex'
  target = el?.closest('[data-node-id]')
  update activeOverlayId

pointerup:
  if activeOverlayId:
    assign device to node
    onSave(placements)
    showToast(...)
  reset drag state
```

`elementFromPoint` 需先隐藏幽灵元素再调用，避免幽灵遮挡目标。

### 组件结构变更

```
JournalTab
  ├── 移除 DndContext wrapper
  ├── 移除 SelectedNodeSlot
  ├── 移除 DraggableSticker（改为普通 div + pointer events）
  ├── 左侧：MermaidRenderer + NodeOverlay[]
  └── 右侧：DeviceCard[]（可拖） + SummaryBar + SubmitButton
```

---

## 不变的部分

- `MermaidRenderer` 组件及其 `onRender` 回调不变
- `normalizeMermaidNodeId`、`upsertNodePlacement` 逻辑不变
- `onSave` / `onSubmit` 接口签名不变（`GroupWorkspace` 无需改动）
- 设备图标显示（`stickerImageSrc`）不变
- `Placement` 数据结构不变
