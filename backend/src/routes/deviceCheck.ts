import { Elysia, t } from 'elysia'
import { db } from '../db'
import { AREA_DEVICE_NODE_MAPPINGS } from '../areaFlowcharts'
import { DEEPSEEK_CHAT_COMPLETIONS_URL, buildDeepSeekChatCompletionBody } from '../deepseek'

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

type AvailableDevice = {
  name: string
  description: string
}

type DeviceNodeMapping = {
  node: string
  devices: string[]
}

type PromptInput = {
  mermaidCode: string | null
  placements: PlacementInput[]
  availableDevices: AvailableDevice[]
  correctMappings?: DeviceNodeMapping[]
}

export function extractMermaidNodeLabels(mermaidCode: string | null) {
  if (!mermaidCode) return []

  const nodes = new Map<string, string>()
  const nodePattern = /(^|[\s>])([A-Za-z][\w-]*)\s*(?:\[([^\]]+)\]|\{([^}]+)\}|\(([^)]+)\))/g
  let match: RegExpExecArray | null

  while ((match = nodePattern.exec(mermaidCode)) !== null) {
    const id = match[2]
    const label = match[3] ?? match[4] ?? match[5]
    if (!nodes.has(id)) nodes.set(id, label.replace(/:::\w+$/, '').trim())
  }

  return [...nodes.entries()].map(([id, label]) => ({ id, label }))
}

export function buildDeviceCheckPrompt({ mermaidCode, placements, availableDevices, correctMappings }: PromptInput) {
  const flowchartNodes = extractMermaidNodeLabels(mermaidCode)
  const nodeLines = flowchartNodes.length > 0
    ? flowchartNodes.map(node => `- ${node.id}：${node.label}`).join('\n')
    : '- 未解析到节点，请根据流程图代码识别节点'

  const placementLines = placements.length > 0
    ? placements.map(p => `- 设备「${p.sticker_name}」→ 节点「${p.node_label}」`).join('\n')
    : '- 暂无已放置设备'

  const deviceLines = availableDevices.length > 0
    ? availableDevices.map(d => `- ${d.name}：${d.description}`).join('\n')
    : '- 无'

  const flowchartSection = mermaidCode
    ? `\n\n流程图代码：\n\`\`\`mermaid\n${mermaidCode}\n\`\`\``
    : ''

  const mappingSection = correctMappings && correctMappings.length > 0
    ? `\n\n功能区域的设备-节点正确对应关系（作为判断参考）：\n${correctMappings.map(m => `- 节点「${m.node}」→ 正确设备：${m.devices.join('、')}`).join('\n')}`
    : ''

  return `你是物联网系统设备选型审查员。请先分析当前流程图需要哪些物理设备，再对照学生已经放置的设备进行检查。${flowchartSection}
当前流程图节点：
${nodeLines}

当前功能区域可用设备：
${deviceLines}
${mappingSection}

已放置设备：
${placementLines}

判断规则：
1. 只允许输出当前流程图节点中需要物理设备的节点；不得输出当前流程图不存在的节点。
2. 优先根据「设备-节点正确对应关系」判断每个节点需要的设备；如果当前节点不在对应关系中，再根据节点语义从「当前功能区域可用设备」中推断。
3. 节点名称允许近似匹配（如"检测是否有人"与"人体红外传感器持续检测"视为同一功能，"读取图书标签"同时匹配借书和还书场景）。
4. 对执行器类设备，启动和停止同一装置都对应同一个物理设备，例如"启动雾化加湿装置"和"停止雾化加湿装置"都对应雾化器。
5. 如果某个当前节点需要设备但未放置，输出 device_name 为"未放置"，passed 为 false，并在 comment 中写出应放置的设备。
6. 如果某个节点放置了不匹配的设备，passed 为 false，并说明更合适的设备。
7. 纯判断、提示、循环、页面展示等不需要物理设备的节点不要输出。
8. 如果正确对应关系中某节点需要多个设备，学生必须在该节点放置所有对应设备才算通过。

以 JSON 数组格式回复，不要有其他内容：
[{"device_name":"已放置设备名或未放置","node_label":"当前流程图节点名","passed":true,"comment":"需要的设备与判断说明"}]`
}

function normalizeNodeLabel(label: string) {
  return label
    .replace(/CO₂/g, 'CO2')
    .replace(/二氧化碳/g, 'CO2')
    .replace(/[^\p{Letter}\p{Number}]/gu, '')
    .toLowerCase()
}

export function filterResultsToCurrentFlowchart(results: CheckResultItem[], mermaidCode: string | null) {
  const nodes = extractMermaidNodeLabels(mermaidCode)
  if (nodes.length === 0) return results

  const currentNodeLabels = new Set(nodes.map(node => normalizeNodeLabel(node.label)))
  return results.filter(result => currentNodeLabels.has(normalizeNodeLabel(result.node_label)))
}

export const deviceCheckRouter = new Elysia()
  .post('/api/groups/:id/device-check', async ({ params, body }) => {
    const groupId = Number(params.id)
    const { submission_id } = body

    const submission = db.query(
      'SELECT placements_json, mermaid_code, area FROM device_submissions WHERE id = ? AND group_id = ?'
    ).get(submission_id, groupId) as { placements_json: string; mermaid_code: string | null; area: string | null } | null

    if (!submission) throw new Error('找不到对应的设备方案')

    const placements = JSON.parse(submission.placements_json) as PlacementInput[]

    const areaRow = !submission.area && submission.mermaid_code
      ? db.query(
          'SELECT area FROM flowchart_history WHERE group_id = ? AND mermaid_code = ? LIMIT 1'
        ).get(groupId, submission.mermaid_code) as { area: string } | null
      : null
    const area = submission.area ?? areaRow?.area ?? null

    const stickers = (area
      ? db.query('SELECT name, description FROM stickers WHERE install_location = ?').all(area)
      : db.query('SELECT name, description FROM stickers').all()) as AvailableDevice[]

    const prompt = buildDeviceCheckPrompt({
      mermaidCode: submission.mermaid_code,
      placements,
      availableDevices: stickers,
      correctMappings: area ? AREA_DEVICE_NODE_MAPPINGS[area] : undefined,
    })

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未配置')

    const response = await fetch(DEEPSEEK_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildDeepSeekChatCompletionBody([{ role: 'user', content: prompt }])),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`DeepSeek API 错误: ${err}`)
    }

    const data = await response.json() as { choices: { message: { content: string } }[] }
    const raw = data.choices[0].message.content.trim()
    const jsonMatch = /\[[\s\S]*\]/.exec(raw)
    if (!jsonMatch) throw new Error('AI 返回格式错误')
    const results = filterResultsToCurrentFlowchart(
      JSON.parse(jsonMatch[0]) as CheckResultItem[],
      submission.mermaid_code
    )

    db.query(
      'INSERT INTO device_check_results (group_id, submission_id, area, results_json) VALUES (?, ?, ?, ?)'
    ).run(groupId, submission_id, area, JSON.stringify(results))

    return { results }
  }, {
    body: t.Object({
      submission_id: t.Number(),
    }),
  })
