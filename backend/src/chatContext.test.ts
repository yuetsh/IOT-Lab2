import { describe, expect, test } from 'bun:test'
import { buildDeepSeekMessages } from './chatContext'

describe('buildDeepSeekMessages', () => {
  test('builds a bounded area context before the current user message', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `history-${i + 1}`,
    }))

    const messages = buildDeepSeekMessages({
      systemPrompt: 'system prompt',
      area: 'Lobby',
      latestMermaidCode: 'graph TD\n  A --> B',
      history,
      userMessage: 'please continue',
    })

    expect(messages[0]).toEqual({ role: 'system', content: 'system prompt' })
    expect(messages[1]).toEqual({
      role: 'system',
      content: '当前功能区域：Lobby',
    })
    expect(messages[2]).toEqual({
      role: 'system',
      content: '当前已有流程图：\n```mermaid\ngraph TD\n  A --> B\n```',
    })
    expect(messages.slice(3, -1).map(m => m.content)).toEqual([
      'history-3',
      'history-4',
      'history-5',
      'history-6',
      'history-7',
      'history-8',
      'history-9',
      'history-10',
    ])
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'please continue' })
  })

  test('omits empty optional context', () => {
    const messages = buildDeepSeekMessages({
      systemPrompt: 'system prompt',
      area: null,
      latestMermaidCode: null,
      history: [],
      userMessage: 'new request',
    })

    expect(messages).toEqual([
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: 'new request' },
    ])
  })
})
