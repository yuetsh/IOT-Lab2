export type DeepSeekChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const DEEPSEEK_CHAT_COMPLETIONS_URL = 'https://api.deepseek.com/chat/completions'

export function buildDeepSeekChatCompletionBody(messages: DeepSeekChatMessage[]) {
  return {
    model: 'deepseek-v4-flash',
    messages,
    stream: false,
    thinking: { type: 'disabled' },
  }
}
