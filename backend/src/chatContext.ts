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
  history: ConversationMessage[]
  userMessage: string
  historyLimit?: number
}

const DEFAULT_HISTORY_LIMIT = 8

export function buildDeepSeekMessages({
  systemPrompt,
  area,
  latestMermaidCode,
  history,
  userMessage,
  historyLimit = DEFAULT_HISTORY_LIMIT,
}: BuildDeepSeekMessagesInput): DeepSeekMessage[] {
  const contextMessages: DeepSeekMessage[] = []

  if (area) {
    contextMessages.push({ role: 'system', content: `当前功能区域：${area}` })
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
