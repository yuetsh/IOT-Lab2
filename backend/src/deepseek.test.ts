import { expect, test } from 'bun:test'
import { buildDeepSeekChatCompletionBody } from './deepseek'

test('builds DeepSeek V4 Flash non-thinking chat completion body', () => {
  const messages = [{ role: 'user' as const, content: '生成流程图' }]

  expect(buildDeepSeekChatCompletionBody(messages)).toEqual({
    model: 'deepseek-v4-flash',
    messages,
    stream: false,
    thinking: { type: 'disabled' },
  })
})
