import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('admin routes', () => {
  let app: { handle: (request: Request) => Promise<Response> }
  let db: typeof import('../db').db
  let originalCwd: string
  let tempDir: string

  beforeAll(async () => {
    originalCwd = process.cwd()
    tempDir = mkdtempSync(join(tmpdir(), 'wangyi2-admin-'))
    process.chdir(tempDir)

    const [{ Elysia }, { groupsRouter }, { adminRouter }, dbModule] = await Promise.all([
      import('elysia'),
      import('./groups'),
      import('./admin'),
      import('../db'),
    ])

    db = dbModule.db
    app = new Elysia()
      .use(groupsRouter)
      .use(adminRouter)
  })

  afterAll(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('creates the judge experience group as statistics-excluded', async () => {
    const firstResponse = await app.handle(new Request('http://test/api/admin/judge-group', { method: 'POST' }))
    const first = await firstResponse.json() as { id: number; name: string; is_stats_excluded: number }
    expect(firstResponse.status).toBe(200)
    expect(first).toMatchObject({ name: '评委体验', is_stats_excluded: 1 })

    const secondResponse = await app.handle(new Request('http://test/api/admin/judge-group', { method: 'POST' }))
    const second = await secondResponse.json() as { id: number; name: string; is_stats_excluded: number }
    expect(secondResponse.status).toBe(200)
    expect(second.id).toBe(first.id)

    const groupsResponse = await app.handle(new Request('http://test/api/groups'))
    const groups = await groupsResponse.json() as { name: string; is_stats_excluded: number }[]
    expect(groups).toContainEqual(expect.objectContaining({ name: '评委体验', is_stats_excluded: 1 }))
  })

  test('excludes the judge experience group from admin statistics', async () => {
    db.query('INSERT INTO groups (name) VALUES (?)').run('统计组')
    await app.handle(new Request('http://test/api/admin/judge-group', { method: 'POST' }))

    const normal = db.query('SELECT id FROM groups WHERE name = ?').get('统计组') as { id: number }
    const judge = db.query('SELECT id FROM groups WHERE name = ?').get('评委体验') as { id: number }

    db.query("INSERT INTO messages (group_id, role, content) VALUES (?, 'user', ?)").run(normal.id, 'normal message')
    db.query("INSERT INTO messages (group_id, role, content) VALUES (?, 'user', ?)").run(judge.id, 'judge message')
    db.query("INSERT INTO messages (group_id, role, content) VALUES (?, 'user', ?)").run(judge.id, 'another judge message')

    const normalHistory = db.query(
      'INSERT INTO flowchart_history (group_id, area, mermaid_code) VALUES (?, ?, ?) RETURNING id'
    ).get(normal.id, '大门区域', 'graph TD\nA-->B') as { id: number }
    const judgeHistory = db.query(
      'INSERT INTO flowchart_history (group_id, area, mermaid_code) VALUES (?, ?, ?) RETURNING id'
    ).get(judge.id, '大门区域', 'graph TD\nA-->B') as { id: number }

    const passingResults = JSON.stringify([{ passed: true, comment: 'ok' }])
    db.query('INSERT INTO check_results (group_id, flowchart_history_id, area, results_json) VALUES (?, ?, ?, ?)')
      .run(normal.id, normalHistory.id, '大门区域', passingResults)
    db.query('INSERT INTO check_results (group_id, flowchart_history_id, area, results_json) VALUES (?, ?, ?, ?)')
      .run(judge.id, judgeHistory.id, '大门区域', passingResults)

    const summaryResponse = await app.handle(new Request('http://test/api/admin/summary'))
    const summary = await summaryResponse.json() as { overview: { total_groups: number; avg_messages: number }; groups: { name: string }[] }
    expect(summary.overview.total_groups).toBe(1)
    expect(summary.overview.avg_messages).toBe(1)
    expect(summary.groups.map(group => group.name)).toEqual(['统计组'])

    const progressResponse = await app.handle(new Request('http://test/api/admin/progress'))
    const progress = await progressResponse.json() as {
      checkTrend: { group_name: string }[]
      completionTimeline: { group_name: string; areas: Record<string, { total: number } | null> }[]
    }
    expect(progress.checkTrend.map(group => group.group_name)).toEqual(['统计组'])
    expect(progress.completionTimeline.map(group => group.group_name)).toEqual(['统计组'])
    expect(progress.completionTimeline[0].areas['大门区域']?.total).toBe(1)
  })
})
