import { Elysia, t } from 'elysia'
import { db } from '../db'
import { buildDeepSeekMessages } from '../chatContext'
import { shouldClearJournalPlacementsForFlowchartChange } from '../flowchartState'
import { insertFlowchartHistory } from '../flowchartHistory'

const SYSTEM_PROMPT = `你是物联网系统功能设计师，专注于智慧图书馆系统设计。用中文回复。

接到用户指定的功能区域后，你需要：
1. 严格只根据用户在消息中明确列出的功能点生成方案，不得自行推断或补充用户未提及的功能
2. 以功能步骤和判断逻辑为核心，描述系统如何响应各种情况
3. 语言简洁、工程化，可直接用于施工方案编写
4. 在回复末尾生成对应的 Mermaid 流程图，只体现用户明确要求的功能，不添加额外节点

流程图格式要求：
- 使用 graph TD 方向
- 必须使用 classDef 定义以下四种功能类型节点样式：
  - trigger：触发/检测步骤，蓝色 fill:#60a5fa,stroke:#2563eb,color:#fff
  - decision：判断/条件节点（配合菱形 {}），黄色 fill:#fbbf24,stroke:#d97706,color:#fff
  - action：执行/控制动作，绿色 fill:#34d399,stroke:#059669,color:#fff
  - display：展示/联动效果，紫色 fill:#a78bfa,stroke:#7c3aed,color:#fff
- 矩形节点 [] 配合 :::trigger / :::action / :::display 使用
- 菱形节点 {} 配合 :::decision 使用
- 连线上标注判断分支结果（如 -->|有人| 或 -->|无人|）
- 节点文字使用功能性描述，不直接写设备型号名称
- 不使用 subgraph
- 不使用自环连线（如 A --> A）
- 示例格式（以通用感应灯为例，仅供格式参考）：
\`\`\`mermaid
graph TD
  classDef trigger fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef decision fill:#fbbf24,stroke:#d97706,color:#fff
  classDef action fill:#34d399,stroke:#059669,color:#fff
  classDef display fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[运动传感器检测]:::trigger --> B{检测到运动?}:::decision
  B -->|有| C[触发照明开启]:::action
  B -->|无| D[保持关闭]:::action
  C --> E[界面显示灯亮状态]:::display
\`\`\``

const MERMAID_REGEX = /```mermaid\n([\s\S]*?)\n```/

export const chatRouter = new Elysia()
  .post('/api/groups/:id/chat', async ({ params, body }) => {
    const groupId = Number(params.id)
    const { message, area, userPrompt } = body

    const history = area
      ? db.query(
        'SELECT role, content FROM messages WHERE group_id = ? AND area = ? ORDER BY created_at DESC, id DESC LIMIT 8'
      ).all(groupId, area).reverse()
      : db.query(
        'SELECT role, content FROM messages WHERE group_id = ? ORDER BY created_at DESC, id DESC LIMIT 8'
      ).all(groupId).reverse()

    const latestFlowchart = area
      ? db.query(
        'SELECT mermaid_code FROM flowchart_history WHERE group_id = ? AND area = ? ORDER BY created_at DESC, id DESC LIMIT 1'
      ).get(groupId, area) as { mermaid_code: string } | null
      : null
    const currentSavedFlowchart = db.query(
      'SELECT mermaid_code FROM flowcharts WHERE group_id = ?'
    ).get(groupId) as { mermaid_code: string } | null

    // 保存用户消息（含区域）
    db.query('INSERT INTO messages (group_id, role, content, area) VALUES (?, ?, ?, ?)').run(groupId, 'user', message, area ?? null)

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未配置')

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: buildDeepSeekMessages({
          systemPrompt: SYSTEM_PROMPT,
          area: area ?? null,
          latestMermaidCode: latestFlowchart?.mermaid_code ?? null,
          history: history as { role: 'user' | 'assistant'; content: string }[],
          userMessage: message,
        }),
        stream: false
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`DeepSeek API 错误: ${err}`)
    }

    const data = await response.json() as { choices: { message: { content: string } }[] }
    const assistantContent = data.choices[0].message.content

    // 保存 assistant 回复（含区域）
    db.query('INSERT INTO messages (group_id, role, content, area) VALUES (?, ?, ?, ?)').run(groupId, 'assistant', assistantContent, area ?? null)

    // 提取并保存 Mermaid 代码
    const match = MERMAID_REGEX.exec(assistantContent)
    if (match) {
      const mermaidCode = match[1].trim()
      if (shouldClearJournalPlacementsForFlowchartChange(currentSavedFlowchart?.mermaid_code ?? null, mermaidCode)) {
        db.query('DELETE FROM journal_placements WHERE group_id = ?').run(groupId)
      }
      db.query(`
        INSERT INTO flowcharts (group_id, mermaid_code, area, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(group_id) DO UPDATE SET mermaid_code = excluded.mermaid_code, area = excluded.area, updated_at = excluded.updated_at
      `).run(groupId, mermaidCode, area ?? null)
      insertFlowchartHistory(db, {
        groupId,
        mermaidCode,
        area: area ?? null,
        userPrompt: userPrompt ?? null,
      })
    }

    return { content: assistantContent }
  }, {
    body: t.Object({
      message: t.String({ minLength: 1 }),
      area: t.Optional(t.String()),
      userPrompt: t.Optional(t.String()),
    })
  })
  .post('/api/groups/:id/check', async ({ params, body }) => {
    const groupId = Number(params.id)
    const { mermaidCode, area, criteria } = body

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未配置')

    const checkPrompt = `你是物联网系统流程图审查员。请逐条检查以下 Mermaid 流程图是否体现了对应要求。

功能区域：${area}
流程图代码：
\`\`\`mermaid
${mermaidCode}
\`\`\`

请对以下每条要求严格判断：流程图中是否有明确的节点或流程步骤直接体现该功能。若流程图中没有对应节点/步骤，即使逻辑上相关也应判为不通过：
${criteria.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}

以 JSON 数组格式回复，不要有其他内容，格式：
[{"passed":true,"comment":"简短说明"},...]`

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: checkPrompt }],
        stream: false
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`DeepSeek API 错误: ${err}`)
    }

    const data = await response.json() as { choices: { message: { content: string } }[] }
    const raw = data.choices[0].message.content.trim()
    const jsonMatch = /\[[\s\S]*\]/.exec(raw)
    if (!jsonMatch) throw new Error('AI 返回格式错误')
    const results = JSON.parse(jsonMatch[0]) as { passed: boolean; comment: string }[]

    // 关联到该组该区域最新的 flowchart_history 条目
    const latestHistory = db.query(
      'SELECT id FROM flowchart_history WHERE group_id = ? AND area = ? ORDER BY created_at DESC LIMIT 1'
    ).get(groupId, area) as { id: number } | null
    db.query(
      'INSERT INTO check_results (group_id, flowchart_history_id, area, results_json) VALUES (?, ?, ?, ?)'
    ).run(groupId, latestHistory?.id ?? null, area, JSON.stringify(results))

    return { results }
  }, {
    body: t.Object({
      mermaidCode: t.String({ minLength: 1 }),
      area: t.String({ minLength: 1 }),
      criteria: t.Array(t.String()),
    })
  })
