import { describe, expect, test } from 'bun:test'
import { buildChatRequestPayload } from '../src/pages/chatRequest'

describe('buildChatRequestPayload', () => {
  test('keeps the student prompt separate from the AI-facing message', () => {
    expect(buildChatRequestPayload('大门区域', '检测有人靠近时自动开门')).toEqual({
      area: '大门区域',
      userPrompt: '检测有人靠近时自动开门',
      message: '请为「大门区域」功能模块生成流程图。\n用户需求：检测有人靠近时自动开门',
    })
  })
})
