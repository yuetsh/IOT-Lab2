import { Elysia, t } from 'elysia'
import { db } from '../db'
import { buildDeepSeekMessages } from '../chatContext'
import { shouldClearJournalPlacementsForFlowchartChange } from '../flowchartState'
import { insertFlowchartHistory } from '../flowchartHistory'

const SYSTEM_PROMPT = `你是物联网施工方案设计师，专注于智慧图书馆系统设计。用中文回复。

接到用户指定的功能区域后，你需要：
1. 严格只根据用户在消息中明确列出的功能点生成方案，不得自行推断或补充用户未提及的功能
2. 每条功能必须包含四个要素：感知设备 → 判定逻辑 → 执行动作 → 展示/联动效果
3. 语言简洁、工程化，可直接用于施工方案编写
4. 在回复末尾生成对应的 Mermaid 流程图，只体现用户明确要求的功能，不添加额外节点

流程图格式要求：
- 使用 graph TD 方向
- 必须使用 classDef 定义以下四种节点样式：
  - sensor：感知设备节点，蓝色 fill:#60a5fa,stroke:#2563eb,color:#fff
  - gateway：网关/通信节点，绿色 fill:#34d399,stroke:#059669,color:#fff
  - server：服务器/云平台节点，橙色 fill:#fb923c,stroke:#ea580c,color:#fff
  - actuator：执行器/输出/联动节点，紫色 fill:#a78bfa,stroke:#7c3aed,color:#fff
- 节点文字使用工程术语，连线标注关键判定条件或数据
- 示例格式：
\`\`\`mermaid
graph TD
  classDef sensor fill:#60a5fa,stroke:#2563eb,color:#fff
  classDef gateway fill:#34d399,stroke:#059669,color:#fff
  classDef server fill:#fb923c,stroke:#ea580c,color:#fff
  classDef actuator fill:#a78bfa,stroke:#7c3aed,color:#fff
  A[红外传感器]:::sensor -->|检测到人员| B[MQTT网关]:::gateway
  B --> C[云服务器]:::server
  C -->|发送开门指令| D[电动门控制器]:::actuator
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
