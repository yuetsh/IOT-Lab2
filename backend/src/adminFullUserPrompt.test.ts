import { describe, expect, test } from 'bun:test'

type CheckResult = { passed: boolean; comment: string }
type CheckRun = { created_at: string; results: CheckResult[] }
type HistoryRow = {
  id: number
  mermaid_code: string
  area: string | null
  user_prompt: string | null
  created_at: string
}
type HistoryEntry = {
  id: number
  mermaid_code: string
  created_at: string
  user_prompt: string | null
  check_runs: CheckRun[]
}

function mapHistoryRows(rows: HistoryRow[], checkMap: Map<number, CheckRun[]>): Record<string, HistoryEntry[]> {
  const areas: Record<string, HistoryEntry[]> = {}
  for (const h of rows) {
    const area = h.area ?? '未知区域'
    if (!areas[area]) areas[area] = []
    areas[area].push({
      id: h.id,
      mermaid_code: h.mermaid_code,
      created_at: h.created_at,
      user_prompt: h.user_prompt,
      check_runs: checkMap.get(h.id) ?? [],
    })
  }
  return areas
}

describe('admin full flowchart history mapping', () => {
  test('includes user_prompt on each history entry', () => {
    const areas = mapHistoryRows([
      {
        id: 12,
        mermaid_code: 'graph TD\n  A --> B',
        area: '大门区域',
        user_prompt: '有人靠近时自动开门',
        created_at: '2026-05-14 10:00:00',
      },
    ], new Map())

    expect(areas['大门区域'][0].user_prompt).toBe('有人靠近时自动开门')
  })
})
