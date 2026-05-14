# 管理页流程图提示词展示

**日期：** 2026-05-14  
**范围：** `backend/src/db.ts`、`backend/src/routes/chat.ts`、`backend/src/routes/admin.ts`、`frontend/src/pages/ChatTab.tsx`、`frontend/src/pages/admin/AdminOverview.tsx`

## 背景

管理页“流程设计”当前按小组、区域和生成次数展示每张 Mermaid 流程图及检测结果，但无法看到学生当时输入了什么需求。聊天页实际发送给 AI 的内容会包装为完整指令：

```text
请为「区域」功能模块生成流程图。
用户需求：学生输入内容
```

管理页只需要展示学生输入框里的原始内容，不展示包装后的完整 AI 指令。

## 目标

每一张流程图历史卡片上方显示与该流程图对应的学生原始提示词。新生成的流程图必须准确保存提示词；旧历史数据不做回填和推断。

## 数据设计

### `flowchart_history.user_prompt`

在 `flowchart_history` 表新增 `user_prompt TEXT` 字段。

- 新库建表时包含该字段
- 旧库启动时通过 `ALTER TABLE flowchart_history ADD COLUMN user_prompt TEXT` 兼容表结构
- 旧数据的 `user_prompt` 保持 `NULL`
- 不从 `messages` 表反推旧提示词

## 后端接口

### `POST /api/groups/:id/chat`

请求体新增可选字段：

```ts
{
  message: string
  area?: string
  userPrompt?: string
}
```

`message` 保持现有用途，仍是发送给 AI 并写入 `messages` 的完整内容。`userPrompt` 只用于写入新生成的流程图历史。

当 assistant 回复中提取到 Mermaid 流程图时：

```sql
INSERT INTO flowchart_history (group_id, mermaid_code, area, user_prompt)
VALUES (?, ?, ?, ?)
```

如果前端未传 `userPrompt`，写入 `NULL`，不尝试解析 `message`。

### `GET /api/admin/full`

历史条目增加 `user_prompt`：

```ts
type HistoryEntry = {
  id: number
  mermaid_code: string
  area: string | null
  created_at: string
  user_prompt: string | null
  check_runs: CheckRun[]
}
```

## 前端行为

### 聊天页

`ChatTab.send()` 中继续构造完整 `message`，同时把输入框原文作为 `userPrompt` 传给后端：

```ts
body: JSON.stringify({ message, area: selectedArea, userPrompt: text })
```

### 管理页

`AdminOverview` 的每张流程图历史卡片在 Mermaid 图上方显示提示词区域。

显示规则：

- `entry.user_prompt` 有内容时显示标题“提示词”和原文
- 保留换行与空白，便于查看多行需求
- 限制最大高度，超出后在块内滚动，避免压缩流程图展示空间
- `user_prompt` 为空或 `NULL` 时显示“未记录提示词”

## 测试

### 后端

增加或调整聊天接口相关测试，覆盖：

- 请求包含 `userPrompt`
- assistant 返回 Mermaid 后，`flowchart_history.user_prompt` 保存为学生原始输入

### 前端

增加或调整管理页渲染测试，覆盖：

- 有 `user_prompt` 的历史流程图在图上方显示提示词
- 无 `user_prompt` 时显示空状态文案

## 非目标

- 不回填旧数据
- 不从 `messages.content` 解析历史提示词
- 不改变发送给 AI 的提示词格式
- 不调整管理页分组、区域 tab、检测结果逻辑
