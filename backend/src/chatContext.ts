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
      content: `以下是「${area}」功能区域的完整参考流程图，作为最终目标结构参考：
\`\`\`mermaid
${referenceFlowchart}
\`\`\`
注意：每次只根据用户本次要求新增对应步骤，向这个目标结构逐步靠近，不要一次性补全所有节点。`,
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
