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
