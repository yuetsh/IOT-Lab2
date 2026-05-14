export type DeepSeekMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

type BuildDeepSeekMessagesInput = {
  systemPrompt: string
  area: string | null
  latestMermaidCode: string | null
  referenceFlowchart: string | null
  history: ConversationMessage[]
  userMessage: string
  historyLimit?: number
}

const DEFAULT_HISTORY_LIMIT = 8

export function buildDeepSeekMessages({
  systemPrompt,
  area,
  latestMermaidCode,
  referenceFlowchart,
  history,
  userMessage,
  historyLimit = DEFAULT_HISTORY_LIMIT,
}: BuildDeepSeekMessagesInput): DeepSeekMessage[] {
  const contextMessages: DeepSeekMessage[] = []

  if (area) {
    contextMessages.push({ role: 'system', content: `当前功能区域：${area}` })
  }

  if (referenceFlowchart) {
    contextMessages.push({
      role: 'system',
      content: `以下是「${area}」功能区域的参考流程图，作为你生成流程图的结构基准：
\`\`\`mermaid
${referenceFlowchart}
\`\`\`
要求：
1. 参考图中所有涉及设备功能的关键节点（传感器检测、执行器控制、报警输出等）必须保留，不得删除或改变其语义
2. 可以在不违反上述约束的前提下，调整节点描述文字、增加辅助节点、改变流程表达方式
3. 流程结构与参考图保持相似，但不得完全照抄`,
    })
  }

  if (latestMermaidCode) {
    contextMessages.push({
      role: 'system',
      content: `当前已有流程图：\n\`\`\`mermaid\n${latestMermaidCode}\n\`\`\``,
    })
  }

  const boundedHistory = history.slice(-historyLimit)

  return [
    { role: 'system', content: systemPrompt },
    ...contextMessages,
    ...boundedHistory,
    { role: 'user', content: userMessage },
  ]
}
