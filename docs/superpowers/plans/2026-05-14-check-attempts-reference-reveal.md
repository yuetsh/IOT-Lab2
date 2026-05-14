# Check Attempts + Reference Flowchart Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 模拟学生多次检查、多次修改的学习过程：初始提示词故意缺少部分功能点，迫使学生迭代；第 3 次及以上检查时，在结果面板自动展示参考流程图。

**Architecture:**
后端 `/api/groups/:id/check` 保存检查结果后统计当前 group+area 已检查次数，并在次数 ≥ 3 时把参考流程图（`AREA_REFERENCE_FLOWCHARTS`）一并返回。前端 ChatTab 追踪 `checkCount`，次数 ≥ 3 时在检查结果下方渲染参考流程图；同时恢复「故意缺失部分功能点」的初始提示词逻辑（固定丢弃每个区域最后 1-2 个功能点，对所有小组一致）。

**Tech Stack:** Elysia (Bun), SQLite (`bun:sqlite`), React, MermaidRenderer component

---

## File Map

| 文件 | 变更类型 | 职责 |
|------|----------|------|
| `backend/src/routes/chat.ts` | Modify | `/check` 接口返回 `check_count` 和 `reference_flowchart` |
| `frontend/src/pages/ChatTab.tsx` | Modify | 追踪 checkCount、展示参考图、恢复缺失功能点逻辑 |

---

### Task 1: 后端 `/check` 接口返回检查次数和参考流程图

**Files:**
- Modify: `backend/src/routes/chat.ts`（check 路由，约第 131-191 行）

- [ ] **Step 1: 在 check 路由保存结果后，统计该 group+area 的总检查次数**

在 `backend/src/routes/chat.ts` 的 `/check` 路由中，`db.query('INSERT INTO check_results ...')` 之后添加：

```ts
const countRow = db.query(
  'SELECT COUNT(*) as count FROM check_results WHERE group_id = ? AND area = ?'
).get(groupId, area) as { count: number }
const checkCount = countRow.count

const referenceFlowchart = checkCount >= 3
  ? (AREA_REFERENCE_FLOWCHARTS[area] ?? null)
  : null

return { results, check_count: checkCount, reference_flowchart: referenceFlowchart }
```

- [ ] **Step 2: 确认 `AREA_REFERENCE_FLOWCHARTS` 已在 chat.ts 顶部导入**

文件顶部已有：
```ts
import { AREA_REFERENCE_FLOWCHARTS } from '../areaFlowcharts'
```
如果没有，添加此行。

- [ ] **Step 3: 启动后端验证接口不报错**

```bash
cd /home/xuyue/Projects/wangyi2/backend && bun run dev
```

用任意已有 group 调用一次 POST `/api/groups/1/check`（用 curl 或直接在前端操作），确认响应中有 `check_count` 字段，不报 TypeScript 编译错误。

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/chat.ts
git commit -m "feat: return check_count and reference_flowchart from /check endpoint"
```

---

### Task 2: 前端 ChatTab 追踪检查次数并展示参考流程图

**Files:**
- Modify: `frontend/src/pages/ChatTab.tsx`

- [ ] **Step 1: 在 CheckResult 接口和 runCheck 中扩展响应类型**

将 `runCheck()` 函数（约第 247-264 行）中的响应类型改为包含新字段，并追踪状态：

在组件 state 部分（`useState` 区域）新增两个 state：
```ts
const [checkCount, setCheckCount] = useState(0)
const [referenceFlowchart, setReferenceFlowchart] = useState<string | null>(null)
```

- [ ] **Step 2: 在 `runCheck` 函数中读取新字段**

将 `runCheck` 改为：

```ts
async function runCheck() {
  if (!mermaidCode || !selectedArea) return
  const crit = AREA_CRITERIA[selectedArea]
  if (!crit) return
  setChecking(true)
  setCheckResults(null)
  try {
    const res = await fetch(`/api/groups/${groupId}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mermaidCode, area: selectedArea, criteria: crit })
    })
    const data = await res.json() as {
      results: CheckResult[]
      check_count: number
      reference_flowchart: string | null
    }
    setCheckResults(data.results)
    setCheckCount(data.check_count)
    setReferenceFlowchart(data.reference_flowchart ?? null)
  } finally {
    setChecking(false)
  }
}
```

- [ ] **Step 3: 区域切换时重置 checkCount 和 referenceFlowchart**

找到处理 `selectedArea` 变化的 `useEffect`（约第 177 行），在 `setCheckResults(null)` 同一位置追加：

```ts
setCheckCount(0)
setReferenceFlowchart(null)
```

具体是在点击区域按钮时的 `onClick` 里：
```ts
onClick={() => {
  if (area === selectedArea) {
    setSelectedArea(null)
    setCheckCount(0)
    setReferenceFlowchart(null)
    onWorkspaceContextChange?.({ area: null, flowchartId: null })
  } else {
    setSelectedArea(area)
    setCheckResults(null)
    setCheckCount(0)
    setReferenceFlowchart(null)
    setInput(getAreaStarter(area))
    onWorkspaceContextChange?.({ area, flowchartId: null })
  }
}}
```

- [ ] **Step 4: 在检查结果面板下方渲染参考流程图**

在 `checkResults` 渲染块（约第 439-500 行）的结束 `</div>` 之后，插入参考图展示块：

```tsx
{referenceFlowchart && (
  <div style={{ border: '1px solid #bee3f8', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
    <div style={{
      padding: '10px 16px',
      background: '#ebf8ff',
      borderBottom: '1px solid #bee3f8',
      fontWeight: 600, fontSize: 13, color: '#2b6cb0',
    }}>
      参考流程图（已检查 {checkCount} 次，供参考）
    </div>
    <div style={{ padding: 16 }}>
      <MermaidRenderer code={referenceFlowchart} />
    </div>
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ChatTab.tsx
git commit -m "feat: show reference flowchart after 3rd check attempt"
```

---

### Task 3: 恢复初始提示词的故意缺失功能点逻辑

**Files:**
- Modify: `frontend/src/pages/ChatTab.tsx`（`getAreaStarter` 函数）

- [ ] **Step 1: 修改 `getAreaStarter` 为固定丢弃最后 1-2 个功能点**

将当前的 `getAreaStarter`（约第 86-90 行）改为：

```ts
function getAreaStarter(area: Area): string {
  const features = AREA_FEATURES[area]
  const numToDrop = features.length <= 3 ? 1 : 2
  const selected = features.slice(0, features.length - numToDrop)
  return `${AREA_BASE[area]}，${selected.join('，')}`
}
```

这样所有小组看到的初始提示词一致（不再随机），但系统性地缺少最后 1-2 个功能点，保证第一次检查大概率不能全通过。

- [ ] **Step 2: 手动测试端到端流程**

1. `bun run dev`（从 root）
2. 打开 http://localhost:5173，进入某小组的「功能设计」标签
3. 点击某个功能区域（如「大门区域」）→ 确认文本框内容缺少最后 1 个功能点
4. 发送 → 生成流程图 → 点击「✓ 检查」
5. 确认第 1 次检查：没有参考图显示（check_count = 1）
6. 再检查 2 次 → 第 3 次后确认参考流程图出现在结果下方

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ChatTab.tsx
git commit -m "feat: restore intentional feature omission in area starter prompt"
```

---

## 验收标准

- [ ] 点击区域后，初始提示词固定缺少 1-2 个功能点（大门区域缺最后 1 条，大厅安防等缺最后 2 条）
- [ ] 前两次检查：结果面板不显示参考流程图
- [ ] 第 3 次及以后检查：结果面板下方出现「参考流程图」卡片
- [ ] 切换区域后检查次数归零，参考图消失
- [ ] 后端 `/check` 响应中包含 `check_count`（整数）和 `reference_flowchart`（string 或 null）
