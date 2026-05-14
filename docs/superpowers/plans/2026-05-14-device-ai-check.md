# 设备方案 AI 检测 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在设备台保存设备方案后，提供 AI 检测按钮，调用 DeepSeek 判断每个设备与所在流程图节点功能是否对应，结果以模态框展示并持久化，管理员可在设备安放总览中查看。

**Architecture:** 新增 `device_check_results` 表存储检测结果；后端新增 `POST /api/groups/:id/device-check` 端点调用 DeepSeek；前端在 `JournalTab` 保存后显示 AI 检测按钮，结果用模态框展示；管理员的 `AdminDevicePlacements` 追加最新检测结果展示。

**Tech Stack:** Bun + Elysia (backend), bun:sqlite, DeepSeek API, React (frontend), Vite

> ⚠️ 本项目无测试框架，所有任务跳过测试步骤，直接实现并提交。

---

## File Map

| 文件 | 动作 | 说明 |
|------|------|------|
| `backend/src/db.ts` | Modify | 新增 `device_check_results` 表 |
| `backend/src/routes/deviceSubmissions.ts` | Modify | POST 返回值加 `submission_id` |
| `backend/src/routes/deviceCheck.ts` | Create | 新建 AI 检测路由 |
| `backend/src/routes/admin.ts` | Modify | device-placements 返回最新检测结果 |
| `backend/src/index.ts` | Modify | 注册 deviceCheckRouter |
| `frontend/src/pages/GroupWorkspace.tsx` | Modify | 捕获 submission_id，传 onAiCheck |
| `frontend/src/pages/JournalTab.tsx` | Modify | AI 检测按钮 + CheckResultModal |

---

## Task 1: 新增 device_check_results 数据库表

**Files:**
- Modify: `backend/src/db.ts`

- [ ] **Step 1: 在 db.ts 末尾、`mkdirSync` 之前插入建表语句**

在 `backend/src/db.ts` 中，在 `try { db.query('ALTER TABLE device_submissions ADD COLUMN mermaid_code TEXT').run() } catch {}` 这行之后、`const uploadsDir = ...` 之前，添加：

```typescript
db.query(`
  CREATE TABLE IF NOT EXISTS device_check_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    submission_id INTEGER NOT NULL REFERENCES device_submissions(id) ON DELETE CASCADE,
    area TEXT,
    results_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`).run()
```

- [ ] **Step 2: 验证后端可启动**

```bash
cd backend && bun run dev
```

期望：服务器在 `http://localhost:3000` 启动，无报错。按 Ctrl+C 停止。

- [ ] **Step 3: 提交**

```bash
git add backend/src/db.ts
git commit -m "feat: add device_check_results table"
```

---

## Task 2: deviceSubmissions POST 返回 submission_id

**Files:**
- Modify: `backend/src/routes/deviceSubmissions.ts`

- [ ] **Step 1: 修改 POST 处理器，返回 submission_id**

将 `backend/src/routes/deviceSubmissions.ts` 的 POST 路由处理函数改为：

```typescript
.post('/api/groups/:id/device-submissions', ({ params, body }) => {
  const result = db.query(
    'INSERT INTO device_submissions (group_id, placements_json, mermaid_code) VALUES (?, ?, ?)'
  ).run(Number(params.id), JSON.stringify(body.placements), body.mermaid_code ?? null)
  return { ok: true, submission_id: Number(result.lastInsertRowid) }
}, {
```

（其余 body validation 保持不变）

- [ ] **Step 2: 提交**

```bash
git add backend/src/routes/deviceSubmissions.ts
git commit -m "feat: return submission_id from device-submissions POST"
```

---

## Task 3: 新建 deviceCheck 路由

**Files:**
- Create: `backend/src/routes/deviceCheck.ts`

- [ ] **Step 1: 创建文件，写入完整路由实现**

创建 `backend/src/routes/deviceCheck.ts`：

```typescript
import { Elysia, t } from 'elysia'
import { db } from '../db'

type PlacementInput = {
  sticker_name: string
  node_label: string
}

type CheckResultItem = {
  device_name: string
  node_label: string
  passed: boolean
  comment: string
}

export const deviceCheckRouter = new Elysia()
  .post('/api/groups/:id/device-check', async ({ params, body }) => {
    const groupId = Number(params.id)
    const { submission_id } = body

    const submission = db.query(
      'SELECT placements_json, mermaid_code FROM device_submissions WHERE id = ? AND group_id = ?'
    ).get(submission_id, groupId) as { placements_json: string; mermaid_code: string | null } | null

    if (!submission) throw new Error('找不到对应的设备方案')

    const placements = JSON.parse(submission.placements_json) as PlacementInput[]

    const areaRow = submission.mermaid_code
      ? db.query(
          'SELECT area FROM flowchart_history WHERE group_id = ? AND mermaid_code = ? LIMIT 1'
        ).get(groupId, submission.mermaid_code) as { area: string } | null
      : null
    const area = areaRow?.area ?? null

    const placementLines = placements
      .map(p => `设备「${p.sticker_name}」→ 节点「${p.node_label}」`)
      .join('\n')

    const flowchartSection = submission.mermaid_code
      ? `\n\n流程图代码：\n\`\`\`mermaid\n${submission.mermaid_code}\n\`\`\``
      : ''

    const prompt = `你是物联网系统审查员。请判断以下每条设备安放是否与对应流程图节点的功能相符。${flowchartSection}

设备安放列表：
${placementLines}

对每条安放，判断该设备的功能是否与节点描述的功能匹配。以 JSON 数组格式回复，不要有其他内容：
[{"device_name":"设备名","node_label":"节点名","passed":true,"comment":"简短说明"}]`

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未配置')

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`DeepSeek API 错误: ${err}`)
    }

    const data = await response.json() as { choices: { message: { content: string } }[] }
    const raw = data.choices[0].message.content.trim()
    const jsonMatch = /\[[\s\S]*\]/.exec(raw)
    if (!jsonMatch) throw new Error('AI 返回格式错误')
    const results = JSON.parse(jsonMatch[0]) as CheckResultItem[]

    db.query(
      'INSERT INTO device_check_results (group_id, submission_id, area, results_json) VALUES (?, ?, ?, ?)'
    ).run(groupId, submission_id, area, JSON.stringify(results))

    return { results }
  }, {
    body: t.Object({
      submission_id: t.Number(),
    }),
  })
```

- [ ] **Step 2: 提交**

```bash
git add backend/src/routes/deviceCheck.ts
git commit -m "feat: add device-check route with DeepSeek AI validation"
```

---

## Task 4: 注册 deviceCheckRouter

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: 导入并注册路由**

在 `backend/src/index.ts` 中，在 `import { deviceSubmissionsRouter }` 那行之后加：

```typescript
import { deviceCheckRouter } from './routes/deviceCheck'
```

然后在 `.use(deviceSubmissionsRouter)` 之后加：

```typescript
  .use(deviceCheckRouter)
```

完整文件应如下：

```typescript
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import './db'
import { groupsRouter } from './routes/groups'
import { chatRouter } from './routes/chat'
import { journalRouter } from './routes/journal'
import { stickersRouter } from './routes/stickers'
import { adminRouter } from './routes/admin'
import { deviceSubmissionsRouter } from './routes/deviceSubmissions'
import { deviceCheckRouter } from './routes/deviceCheck'

const app = new Elysia()
  .use(cors())
  .use(groupsRouter)
  .use(chatRouter)
  .use(journalRouter)
  .use(stickersRouter)
  .use(adminRouter)
  .use(deviceSubmissionsRouter)
  .use(deviceCheckRouter)
  .listen(3000)

console.log(`Server running at http://localhost:${app.server?.port}`)
```

- [ ] **Step 2: 验证后端启动无报错**

```bash
cd backend && bun run dev
```

期望：`Server running at http://localhost:3000`，无 TypeScript 错误。Ctrl+C 停止。

- [ ] **Step 3: 提交**

```bash
git add backend/src/index.ts
git commit -m "feat: register deviceCheckRouter"
```

---

## Task 5: 扩展 admin device-placements 接口，返回检测结果

**Files:**
- Modify: `backend/src/routes/admin.ts`

- [ ] **Step 1: 更新类型定义**

在 `admin.ts` 文件顶部的类型声明中，将 `AreaData` 类型（第 78 行附近）修改为包含 `check_result`。找到这段局部类型定义：

```typescript
    type AreaData = { mermaid_code: string | null; placements: Placement[]; submission_created_at: string | null }
```

替换为：

```typescript
    type CheckResultItem = { device_name: string; node_label: string; passed: boolean; comment: string }
    type CheckResult = { passed_count: number; total_count: number; results: CheckResultItem[]; created_at: string }
    type AreaData = { mermaid_code: string | null; placements: Placement[]; submission_created_at: string | null; check_result: CheckResult | null }
```

- [ ] **Step 2: 在 areaResult 填充逻辑中查询检测结果**

找到 `admin.ts` 中构建 `areaResult` 的循环：

```typescript
      for (const sub of submissions) {
        if (!sub.mermaid_code) continue
        const area = codeToArea.get(sub.mermaid_code)
        if (!area || areaResult[area]) continue
        areaResult[area] = {
          mermaid_code: sub.mermaid_code,
          placements: JSON.parse(sub.placements_json) as Placement[],
          submission_created_at: sub.created_at,
        }
      }
```

替换为：

```typescript
      for (const sub of submissions) {
        if (!sub.mermaid_code) continue
        const area = codeToArea.get(sub.mermaid_code)
        if (!area || areaResult[area]) continue

        const checkRow = db.query(
          'SELECT results_json, created_at FROM device_check_results WHERE submission_id = ? ORDER BY created_at DESC LIMIT 1'
        ).get(sub.id) as { results_json: string; created_at: string } | null

        let check_result: CheckResult | null = null
        if (checkRow) {
          const results = JSON.parse(checkRow.results_json) as CheckResultItem[]
          check_result = {
            passed_count: results.filter(r => r.passed).length,
            total_count: results.length,
            results,
            created_at: checkRow.created_at,
          }
        }

        areaResult[area] = {
          mermaid_code: sub.mermaid_code,
          placements: JSON.parse(sub.placements_json) as Placement[],
          submission_created_at: sub.created_at,
          check_result,
        }
      }
```

- [ ] **Step 3: 同步更新"没有提交的区域"的 fallback**

找到：

```typescript
      for (const area of AREAS) {
        if (!areaResult[area]) {
          areaResult[area] = {
            mermaid_code: latestFlowchart[area] ?? null,
            placements: [],
            submission_created_at: null,
          }
        }
      }
```

替换为：

```typescript
      for (const area of AREAS) {
        if (!areaResult[area]) {
          areaResult[area] = {
            mermaid_code: latestFlowchart[area] ?? null,
            placements: [],
            submission_created_at: null,
            check_result: null,
          }
        }
      }
```

- [ ] **Step 4: 更新 submissions 查询，选出 id 字段**

找到（第 99 行附近）：

```typescript
      const submissions = db.query(
        'SELECT placements_json, created_at, mermaid_code FROM device_submissions WHERE group_id = ? ORDER BY created_at DESC'
      ).all(g.id) as { placements_json: string; created_at: string; mermaid_code: string | null }[]
```

替换为：

```typescript
      const submissions = db.query(
        'SELECT id, placements_json, created_at, mermaid_code FROM device_submissions WHERE group_id = ? ORDER BY created_at DESC'
      ).all(g.id) as { id: number; placements_json: string; created_at: string; mermaid_code: string | null }[]
```

- [ ] **Step 5: 验证后端启动正常**

```bash
cd backend && bun run dev
```

期望：无 TypeScript 错误，正常启动。Ctrl+C 停止。

- [ ] **Step 6: 提交**

```bash
git add backend/src/routes/admin.ts
git commit -m "feat: include AI check results in admin device-placements API"
```

---

## Task 6: GroupWorkspace — 捕获 submission_id，传递 onAiCheck

**Files:**
- Modify: `frontend/src/pages/GroupWorkspace.tsx`

- [ ] **Step 1: 新增 latestSubmissionId state 和 handleAiCheck**

在 `GroupWorkspace.tsx` 的 state 声明区（`useState` 们附近），新增：

```typescript
  const [latestSubmissionId, setLatestSubmissionId] = useState<number | null>(null)
  const [aiCheckResults, setAiCheckResults] = useState<AiCheckResult[] | null>(null)
```

在文件顶部加类型定义（紧接 `interface Placement` 后）：

```typescript
interface AiCheckResult {
  device_name: string
  node_label: string
  passed: boolean
  comment: string
}
```

- [ ] **Step 2: 修改 submitDeviceTable，捕获 submission_id**

找到现有的 `submitDeviceTable`：

```typescript
  const submitDeviceTable = useCallback(async (next: Omit<Placement, 'id'>[]) => {
    if (!id) return
    await fetch(`/api/groups/${id}/device-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placements: next
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
  }, [id])
```

替换为：

```typescript
  const submitDeviceTable = useCallback(async (next: Omit<Placement, 'id'>[]) => {
    if (!id) return
    const res = await fetch(`/api/groups/${id}/device-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placements: next
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
    const data = await res.json() as { ok: boolean; submission_id: number }
    setLatestSubmissionId(data.submission_id)
    setAiCheckResults(null)
  }, [id])
```

- [ ] **Step 3: 新增 handleAiCheck**

在 `submitDeviceTable` 之后、`handleJournalAreaChange` 之前，插入：

```typescript
  const handleAiCheck = useCallback(async () => {
    if (!id || latestSubmissionId == null) return
    const res = await fetch(`/api/groups/${id}/device-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: latestSubmissionId }),
    })
    if (!res.ok) throw new Error('AI 检测请求失败')
    const data = await res.json() as { results: AiCheckResult[] }
    setAiCheckResults(data.results)
  }, [id, latestSubmissionId])
```

- [ ] **Step 4: 传递新 props 给 JournalTab**

找到 JSX 中的 `<JournalTab ... />` 块，把 `onSubmit={submitDeviceTable}` 一行改为：

```tsx
            onSubmit={submitDeviceTable}
            onAiCheck={latestSubmissionId != null ? handleAiCheck : undefined}
            aiCheckResults={aiCheckResults}
            aiCheckArea={routeArea}
```

- [ ] **Step 5: 提交**

```bash
git add frontend/src/pages/GroupWorkspace.tsx
git commit -m "feat: capture submission_id and wire up AI check callback"
```

---

## Task 7: JournalTab — AI 检测按钮 + CheckResultModal

**Files:**
- Modify: `frontend/src/pages/JournalTab.tsx`

- [ ] **Step 1: 更新 Props interface，新增 state**

找到 `interface Props` 定义，添加三个新 prop：

```typescript
interface Props {
  mermaidCode: string | null
  stickers: Sticker[]
  placements: Placement[]
  area?: string | null
  areasWithFlowcharts?: string[]
  onAreaChange?: (area: string) => void
  onSave: (placements: Omit<Placement, 'id'>[]) => void
  onSubmit?: (placements: Omit<Placement, 'id'>[]) => Promise<void>
  onAiCheck?: () => Promise<void>
  aiCheckResults?: AiCheckResult[] | null
  aiCheckArea?: string | null
}
```

在文件顶部 `interface FlowNode` 之后，新增：

```typescript
interface AiCheckResult {
  device_name: string
  node_label: string
  passed: boolean
  comment: string
}
```

- [ ] **Step 2: 新增 checkState state 和解构新 props**

在 `JournalTab` 函数体内，找到 `const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved'>('idle')` 这行，在它之后加：

```typescript
  const [checkState, setCheckState] = useState<'idle' | 'checking' | 'done' | 'error'>('idle')
  const [modalOpen, setModalOpen] = useState(false)
```

更新函数签名解构（在 `export default function JournalTab({` 那行）：

```typescript
export default function JournalTab({ mermaidCode, stickers, placements: initPlacements, area, areasWithFlowcharts, onAreaChange, onSave, onSubmit, onAiCheck, aiCheckResults, aiCheckArea }: Props) {
```

- [ ] **Step 3: 新增 CheckResultModal 组件（在文件内，JournalTab 函数之前）**

在 `DeviceCard` 组件之后、`export default function JournalTab` 之前插入：

```typescript
function CheckResultModal({ results, area, onClose }: { results: AiCheckResult[]; area?: string | null; onClose: () => void }) {
  const passedCount = results.filter(r => r.passed).length
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, padding: 24, width: 480, maxWidth: '92vw',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a202c' }}>
            AI检测结果{area ? ` · ${area}` : ''}
          </h3>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 10,
            background: passedCount === results.length ? '#c6f6d5' : '#fed7d7',
            color: passedCount === results.length ? '#276749' : '#c53030',
          }}>
            {passedCount} / {results.length} 通过
          </span>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map((r, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 8,
              background: r.passed ? '#f0fff4' : '#fff5f5',
              border: `1px solid ${r.passed ? '#c6f6d5' : '#fed7d7'}`,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{r.passed ? '✓' : '✗'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2d3748', marginBottom: 2 }}>
                  {r.device_name} → {r.node_label}
                </div>
                <div style={{ fontSize: 12, color: '#718096' }}>{r.comment}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: '#edf2f7', color: '#4a5568', fontSize: 14, fontWeight: 600,
          }}
        >
          关闭
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 在右侧面板底部添加 AI 检测按钮**

找到 JournalTab JSX 中"保存设备方案"按钮的代码块（`{onSubmit && (` 这个块），在其闭合 `)}` 之后插入：

```tsx
          {onAiCheck && (
            <button
              disabled={checkState === 'checking'}
              onClick={async () => {
                setCheckState('checking')
                try {
                  await onAiCheck()
                  setCheckState('done')
                  setModalOpen(true)
                } catch {
                  setCheckState('error')
                  showToast('AI 检测失败，请重试')
                  setCheckState('idle')
                }
              }}
              style={{
                padding: '10px 0', borderRadius: 8, border: 'none',
                cursor: checkState === 'checking' ? 'default' : 'pointer',
                fontSize: 14, fontWeight: 600,
                background: checkState === 'checking' ? '#edf2f7' : '#805ad5',
                color: checkState === 'checking' ? '#a0aec0' : '#fff',
                transition: 'background 0.2s',
              }}
            >
              {checkState === 'checking' ? '检测中…' : 'AI检测'}
            </button>
          )}
```

- [ ] **Step 5: 在 return 的最外层 div 末尾渲染模态框**

在 JournalTab `return` 的最外层 `<div>` 的最后一个子元素之后，加：

```tsx
      {modalOpen && aiCheckResults && (
        <CheckResultModal
          results={aiCheckResults}
          area={aiCheckArea}
          onClose={() => setModalOpen(false)}
        />
      )}
```

- [ ] **Step 6: 提交**

```bash
git add frontend/src/pages/JournalTab.tsx
git commit -m "feat: add AI check button and CheckResultModal to JournalTab"
```

---

## Task 8: AdminDevicePlacements — 追加检测结果展示

**Files:**
- Modify: `frontend/src/pages/admin/AdminDevicePlacements.tsx`

- [ ] **Step 1: 更新 AreaData 类型**

找到 `interface AreaData`：

```typescript
interface AreaData {
  mermaid_code: string | null
  placements: Placement[]
  submission_created_at: string | null
}
```

替换为：

```typescript
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
}
```

- [ ] **Step 2: 在 AreaPanel 中追加检测结果块**

找到 `AreaPanel` 组件的 return 的最后一个 `{areaData.placements.length > 0 && (...)}`，在其之后（仍在最外层 `<div>` 内）追加：

```tsx
      {areaData.check_result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#718096', fontWeight: 600 }}>AI检测</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 10,
              background: areaData.check_result.passed_count === areaData.check_result.total_count ? '#c6f6d5' : '#fed7d7',
              color: areaData.check_result.passed_count === areaData.check_result.total_count ? '#276749' : '#c53030',
            }}>
              {areaData.check_result.passed_count} / {areaData.check_result.total_count} 通过
            </span>
            <span style={{ fontSize: 11, color: '#a0aec0' }}>
              {fmt(areaData.check_result.created_at)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {areaData.check_result.results.map((r, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                padding: '7px 10px', borderRadius: 6,
                background: r.passed ? '#f0fff4' : '#fff5f5',
                border: `1px solid ${r.passed ? '#c6f6d5' : '#fed7d7'}`,
              }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{r.passed ? '✓' : '✗'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2d3748' }}>
                    {r.device_name} → {r.node_label}
                  </span>
                  <span style={{ fontSize: 11, color: '#718096', marginLeft: 6 }}>{r.comment}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/pages/admin/AdminDevicePlacements.tsx
git commit -m "feat: show AI check results in admin device placements view"
```

---

## Task 9: 端到端验证

- [ ] **Step 1: 启动前后端**

```bash
bun run dev
```

- [ ] **Step 2: 验证学生侧流程**

1. 打开 `http://localhost:5173`，选择一个小组
2. 进入"设备台"标签，选择任意有流程图的区域
3. 拖拽至少一个设备到节点上
4. 点击"保存设备方案" → 按钮变为"已保存 ✓"
5. 出现"AI检测"按钮 → 点击 → 显示"检测中…"
6. 检测完成后模态框弹出，列出每条设备的通过/未通过和说明
7. 点击关闭或遮罩，模态框关闭

- [ ] **Step 3: 验证管理员侧**

1. 打开 `http://localhost:5173/admin/device-placements`
2. 找到刚才操作的小组和区域
3. 确认在设备列表下方出现"AI检测"区块，显示通过率和每条结果
