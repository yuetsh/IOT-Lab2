# Flowchart User Prompt Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save each newly generated flowchart history entry with the student's raw prompt and show it above the matching flowchart in the admin overview.

**Architecture:** Add `user_prompt` to the `flowchart_history` table and return it through `/api/admin/full`. The chat UI sends both the existing AI-facing `message` and a new `userPrompt` field containing only the input box text; the admin overview renders `user_prompt` in each history card.

**Tech Stack:** Bun, Elysia, SQLite, Vite, React, TypeScript, Bun test runner.

---

### Task 1: Persist Student Prompt With Flowchart History

**Files:**
- Create: `backend/src/flowchartHistory.ts`
- Modify: `backend/src/db.ts`
- Modify: `backend/src/routes/chat.ts`
- Test: `backend/src/flowchartHistory.test.ts`

- [ ] **Step 1: Write the failing backend test**

Create `backend/src/flowchartHistory.test.ts`:

```ts
import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { insertFlowchartHistory } from './flowchartHistory'

describe('flowchart user prompts', () => {
  test('flowchart_history stores the student raw prompt separately from the AI-facing message', () => {
    const db = new Database(':memory:')

    db.query(`
      CREATE TABLE flowchart_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        mermaid_code TEXT NOT NULL,
        area TEXT,
        user_prompt TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run()

    insertFlowchartHistory(db, {
      groupId: 1,
      mermaidCode: 'graph TD\n  A --> B',
      area: '大门区域',
      userPrompt: '检测有人靠近时自动开门',
    })

    const row = db.query('SELECT user_prompt FROM flowchart_history').get() as { user_prompt: string }
    expect(row.user_prompt).toBe('检测有人靠近时自动开门')

    db.close()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
rtk bun test backend/src/flowchartHistory.test.ts
```

Expected: FAIL because `backend/src/flowchartHistory.ts` does not exist.

- [ ] **Step 3: Add the schema column**

Update `backend/src/db.ts` so the `flowchart_history` table includes `user_prompt TEXT`, and add a compatible `ALTER TABLE` migration:

```ts
db.query(`
  CREATE TABLE IF NOT EXISTS flowchart_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    mermaid_code TEXT NOT NULL,
    area TEXT,
    user_prompt TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`).run()

try { db.query('ALTER TABLE flowchart_history ADD COLUMN user_prompt TEXT').run() } catch {}
```

- [ ] **Step 4: Make chat writes include the raw prompt**

Create `backend/src/flowchartHistory.ts`:

```ts
import type { Database } from 'bun:sqlite'

type InsertFlowchartHistoryInput = {
  groupId: number
  mermaidCode: string
  area?: string | null
  userPrompt?: string | null
}

export function insertFlowchartHistory(db: Database, input: InsertFlowchartHistoryInput) {
  db.query(`
    INSERT INTO flowchart_history (group_id, mermaid_code, area, user_prompt)
    VALUES (?, ?, ?, ?)
  `).run(input.groupId, input.mermaidCode, input.area ?? null, input.userPrompt ?? null)
}
```

Update `backend/src/routes/chat.ts`:

```ts
import { insertFlowchartHistory } from '../flowchartHistory'

const { message, area, userPrompt } = body
```

Update the history insert:

```ts
insertFlowchartHistory(db, {
  groupId,
  mermaidCode,
  area: area ?? null,
  userPrompt: userPrompt ?? null,
})
```

Update the route body schema:

```ts
body: t.Object({
  message: t.String({ minLength: 1 }),
  area: t.Optional(t.String()),
  userPrompt: t.Optional(t.String()),
})
```

- [ ] **Step 5: Run the backend test**

Run:

```bash
rtk bun test backend/src/flowchartHistory.test.ts
```

Expected: PASS.

### Task 2: Return Prompt Data From Admin Full API

**Files:**
- Modify: `backend/src/routes/admin.ts`
- Test: `backend/src/adminFullUserPrompt.test.ts`

- [ ] **Step 1: Write the failing admin mapping test**

Create `backend/src/adminFullUserPrompt.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'

type CheckResult = { passed: boolean; comment: string }
type CheckRun = { created_at: string; results: CheckResult[] }
type HistoryRow = {
  id: number
  mermaid_code: string
  area: string | null
  user_prompt: string | null
  created_at: string
}
type HistoryEntry = {
  id: number
  mermaid_code: string
  created_at: string
  user_prompt: string | null
  check_runs: CheckRun[]
}

function mapHistoryRows(rows: HistoryRow[], checkMap: Map<number, CheckRun[]>): Record<string, HistoryEntry[]> {
  const areas: Record<string, HistoryEntry[]> = {}
  for (const h of rows) {
    const area = h.area ?? '未知区域'
    if (!areas[area]) areas[area] = []
    areas[area].push({
      id: h.id,
      mermaid_code: h.mermaid_code,
      created_at: h.created_at,
      user_prompt: h.user_prompt,
      check_runs: checkMap.get(h.id) ?? [],
    })
  }
  return areas
}

describe('admin full flowchart history mapping', () => {
  test('includes user_prompt on each history entry', () => {
    const areas = mapHistoryRows([
      {
        id: 12,
        mermaid_code: 'graph TD\n  A --> B',
        area: '大门区域',
        user_prompt: '有人靠近时自动开门',
        created_at: '2026-05-14 10:00:00',
      },
    ], new Map())

    expect(areas['大门区域'][0].user_prompt).toBe('有人靠近时自动开门')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
rtk bun test backend/src/adminFullUserPrompt.test.ts
```

Expected: PASS as a characterization helper if written standalone, then use the same mapping in production. If it passes immediately, proceed because Task 1's schema test already covers the missing behavior.

- [ ] **Step 3: Update admin types and query**

Update `backend/src/routes/admin.ts`:

```ts
type HistoryEntry = {
  id: number
  mermaid_code: string
  created_at: string
  user_prompt: string | null
  check_runs: CheckRun[]
}
```

Update the history query:

```ts
'SELECT id, mermaid_code, area, user_prompt, created_at FROM flowchart_history WHERE group_id = ? ORDER BY created_at ASC'
```

Update the row type:

```ts
as { id: number; mermaid_code: string; area: string | null; user_prompt: string | null; created_at: string }[]
```

Update the mapped entry:

```ts
user_prompt: h.user_prompt,
```

- [ ] **Step 4: Run focused backend tests**

Run:

```bash
rtk bun test backend/src/flowchartHistory.test.ts backend/src/adminFullUserPrompt.test.ts
```

Expected: PASS.

### Task 3: Send and Render Student Prompt in the Frontend

**Files:**
- Create: `frontend/src/pages/chatRequest.ts`
- Modify: `frontend/src/pages/ChatTab.tsx`
- Modify: `frontend/src/pages/admin/AdminOverview.tsx`
- Test: `frontend/tests/chatRequest.test.ts`
- Test: `frontend/tests/adminOverviewPrompt.test.ts`

- [ ] **Step 1: Write the failing frontend helper test**

Create `frontend/tests/adminOverviewPrompt.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { getHistoryPromptText } from '../src/pages/admin/AdminOverview'

describe('admin overview prompt text', () => {
  test('shows recorded student prompt when present', () => {
    expect(getHistoryPromptText('检测有人靠近时自动开门')).toBe('检测有人靠近时自动开门')
  })

  test('shows an empty-state label when prompt was not recorded', () => {
    expect(getHistoryPromptText(null)).toBe('未记录提示词')
    expect(getHistoryPromptText('   ')).toBe('未记录提示词')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
rtk bun test frontend/tests/adminOverviewPrompt.test.ts
```

Expected: FAIL because `getHistoryPromptText` is not exported.

- [ ] **Step 3: Write the failing chat payload test**

Create `frontend/tests/chatRequest.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { buildChatRequestPayload } from '../src/pages/chatRequest'

describe('buildChatRequestPayload', () => {
  test('keeps the student prompt separate from the AI-facing message', () => {
    expect(buildChatRequestPayload('大门区域', '检测有人靠近时自动开门')).toEqual({
      area: '大门区域',
      userPrompt: '检测有人靠近时自动开门',
      message: '请为「大门区域」功能模块生成流程图。\n用户需求：检测有人靠近时自动开门',
    })
  })
})
```

Run:

```bash
rtk bun test frontend/tests/chatRequest.test.ts
```

Expected: FAIL because `frontend/src/pages/chatRequest.ts` does not exist.

- [ ] **Step 4: Send the raw prompt from chat**

Create `frontend/src/pages/chatRequest.ts`:

```ts
export function buildChatRequestPayload(area: string, text: string) {
  return {
    message: `请为「${area}」功能模块生成流程图。\n用户需求：${text}`,
    area,
    userPrompt: text,
  }
}
```

Update `frontend/src/pages/ChatTab.tsx` request body:

```ts
body: JSON.stringify(buildChatRequestPayload(selectedArea, text))
```

- [ ] **Step 5: Add admin prompt rendering helper and type field**

Update `frontend/src/pages/admin/AdminOverview.tsx`:

```ts
interface HistoryEntry {
  id: number
  mermaid_code: string
  created_at: string
  user_prompt: string | null
  check_runs: CheckRun[]
}

export function getHistoryPromptText(userPrompt: string | null | undefined): string {
  const prompt = userPrompt?.trim()
  return prompt ? prompt : '未记录提示词'
}
```

- [ ] **Step 6: Render the prompt above each Mermaid chart**

Inside each history card, before `<MermaidRenderer code={entry.mermaid_code} />`, render:

```tsx
<div style={{
  padding: '8px 10px',
  borderBottom: '1px solid #edf2f7',
  background: '#fff',
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
```

- [ ] **Step 7: Run the frontend tests**

Run:

```bash
rtk bun test frontend/tests/chatRequest.test.ts frontend/tests/adminOverviewPrompt.test.ts
```

Expected: PASS.

### Task 4: Verify the Integrated Change

**Files:**
- No new files.

- [ ] **Step 1: Run the existing focused test set plus new tests**

Run:

```bash
rtk bun test backend/src/*.test.ts frontend/tests/*.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Build the frontend**

Run:

```bash
cd frontend && rtk bun run build
```

Expected: TypeScript check and Vite build pass.

- [ ] **Step 3: Review the diff**

Run:

```bash
rtk git diff -- backend/src/db.ts backend/src/routes/chat.ts backend/src/routes/admin.ts backend/src/flowchartHistory.ts frontend/src/pages/ChatTab.tsx frontend/src/pages/chatRequest.ts frontend/src/pages/admin/AdminOverview.tsx backend/src/flowchartHistory.test.ts backend/src/adminFullUserPrompt.test.ts frontend/tests/chatRequest.test.ts frontend/tests/adminOverviewPrompt.test.ts docs/superpowers/specs/2026-05-14-flowchart-user-prompt-admin-design.md docs/superpowers/plans/2026-05-14-flowchart-user-prompt-admin.md
```

Expected: diff only contains the prompt persistence/display work and the associated docs/tests.
