import { describe, expect, test } from 'bun:test'
import { getHistoryPromptText } from '../src/pages/admin/AdminOverview'

describe('admin overview prompt text', () => {
  test('shows recorded student prompt when present', () => {
    expect(getHistoryPromptText('检测有人靠近时自动开门')).toBe('检测有人靠近时自动开门')
  })

  test('shows an empty-state label when prompt was not recorded', () => {
    expect(getHistoryPromptText(null)).toBe('未记录提示词')
    expect(getHistoryPromptText('   ')).toBe('未记录提示词')
  })
})
