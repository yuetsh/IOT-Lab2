import { describe, expect, test } from 'bun:test'
import { getGroupWorkspacePath, isGroupWorkspaceTab } from '../src/pages/groupRoutes'

describe('group workspace routes', () => {
  test('builds direct routes for chat and journal tabs', () => {
    expect(getGroupWorkspacePath(12, 'chat')).toBe('/group/12/chat')
    expect(getGroupWorkspacePath('12', 'journal')).toBe('/group/12/journal')
  })

  test('carries workspace context through route query parameters', () => {
    expect(getGroupWorkspacePath(12, 'journal', { area: '大厅安防', flowchartId: 45 })).toBe(
      '/group/12/journal?area=%E5%A4%A7%E5%8E%85%E5%AE%89%E9%98%B2&flowchartId=45'
    )
    expect(getGroupWorkspacePath(12, 'journal', { area: '大厅安防', flowchartId: null })).toBe(
      '/group/12/journal?area=%E5%A4%A7%E5%8E%85%E5%AE%89%E9%98%B2'
    )
  })

  test('accepts only route-backed workspace tabs', () => {
    expect(isGroupWorkspaceTab('chat')).toBe(true)
    expect(isGroupWorkspaceTab('journal')).toBe(true)
    expect(isGroupWorkspaceTab(undefined)).toBe(false)
    expect(isGroupWorkspaceTab('')).toBe(false)
    expect(isGroupWorkspaceTab('legacy')).toBe(false)
  })
})
