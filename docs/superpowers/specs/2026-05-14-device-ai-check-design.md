# 设备方案 AI 检测功能设计

**日期**：2026-05-14  
**状态**：已确认，待实现

## 背景

设备台（JournalTab）允许学生将 IoT 设备拖到流程图节点上，保存方案后需要 AI 自动检测每个设备与所在节点功能是否对应，帮助学生发现放置错误。

---

## 数据库

新增表 `device_check_results`：

```sql
CREATE TABLE IF NOT EXISTS device_check_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  submission_id INTEGER NOT NULL,
  area TEXT,
  results_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
)
```

`results_json` 格式：
```json
[
  { "device_name": "人体红外传感器", "node_label": "检测人员出入", "passed": true, "comment": "传感器功能与节点匹配" }
]
```

---

## 后端

### POST `/api/groups/:id/device-submissions`（修改）

在现有逻辑基础上，将返回值从 `{ ok: true }` 改为 `{ ok: true, submission_id: number }`，使用 `db.query().run().lastInsertRowid`。

### POST `/api/groups/:id/device-check`

- 接收 `{ submission_id: number }`
- 从 `device_submissions` 读取对应 `placements_json` + `mermaid_code`
- 通过 `mermaid_code` 查 `flowchart_history`（`WHERE group_id = ? AND mermaid_code = ? LIMIT 1`）反查 `area`
- 构造 prompt：每条放置 `设备「{sticker_name}」→ 节点「{node_label}」` + 附 mermaid 流程图
- 调用 DeepSeek，要求返回 `[{ device_name, node_label, passed, comment }]` JSON
- 存入 `device_check_results`（关联 `group_id`、`submission_id`、`area`）
- 返回 `{ results }`

### GET `/api/admin/device-placements`（扩展）

每个区域 `AreaData` 新增字段 `check_result`：
```ts
check_result: {
  passed_count: number
  total_count: number
  results: { device_name: string; node_label: string; passed: boolean; comment: string }[]
  created_at: string
} | null
```
查询：对每个区域最新 submission，JOIN `device_check_results` 取最新一条。

---

## 前端

### GroupWorkspace

- `submitDeviceTable` 成功后，从响应中拿到 `submission_id`，存入 state
- 新增 `handleAiCheck(submissionId)` 调用 `POST /api/groups/:id/device-check`
- 传给 `JournalTab`：`latestSubmissionId` + `onAiCheck`
- 收到检测结果后，传给 `JournalTab` 控制模态框显示

### JournalTab

右侧面板底部（保存按钮之后）：
- `submitState === 'saved'` 时显示"AI检测"按钮
- 点击后进入 `checking` 状态（按钮禁用，显示"检测中…"）
- 检测完成后打开 `CheckResultModal`
- AI 调用失败时显示 toast

### CheckResultModal（新组件，写在 JournalTab.tsx 内）

- 全屏居中浮层，点击遮罩或"关闭"按钮关闭
- 标题：「AI检测结果 · {area}」
- 每条结果一行：`✓`/`✗` + 设备名 → 节点名 + AI 说明
- 底部通过率汇总

### AdminDevicePlacements

`AreaPanel` 末尾追加检测结果块（`check_result !== null` 时）：
- 标题行：「AI检测」+ 通过率徽章（`{passed}/{total} 通过`）+ 检测时间
- 展开列表：每条一行，`✓`/`✗` + 设备名 → 节点名 + 说明

---

## 数据流

```
用户点击"保存设备方案"
  → POST /api/groups/:id/device-submissions → 返回 { ok, submission_id }
  → submitState = 'saved'，显示"AI检测"按钮

用户点击"AI检测"
  → POST /api/groups/:id/device-check { submission_id }
  → DeepSeek API 分析
  → 存入 device_check_results
  → 返回 { results }
  → 打开 CheckResultModal
```

---

## 不在范围内

- 对同一方案多次检测的历史记录对比（管理端只展示最新一次）
- 学生端查看历史检测记录
- 检测结果影响提交状态（通过/不通过不阻止保存）
