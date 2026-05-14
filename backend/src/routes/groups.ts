import { Elysia, t } from 'elysia'
import { db } from '../db'

export const groupsRouter = new Elysia({ prefix: '/api/groups' })
  .get('/', () => {
    return db.query('SELECT * FROM groups ORDER BY name').all()
  })
  .post('/', ({ body }) => {
    const { name } = body
    try {
      db.query('INSERT INTO groups (name) VALUES (?)').run(name)
      const group = db.query('SELECT * FROM groups WHERE name = ?').get(name)
      return group
    } catch {
      throw new Error('小组名已存在')
    }
  }, {
    body: t.Object({ name: t.String({ minLength: 1 }) })
  })
  .delete('/:id', ({ params }) => {
    db.query('DELETE FROM groups WHERE id = ?').run(params.id)
    return { ok: true }
  })
  .get('/:id/conversation', ({ params, query }) => {
    const { area, flowchartId } = query as Record<string, string | undefined>
    const messages = area
      ? db.query('SELECT id, role, content, created_at FROM messages WHERE group_id = ? AND area = ? ORDER BY created_at').all(params.id, area)
      : db.query('SELECT id, role, content, created_at FROM messages WHERE group_id = ? ORDER BY created_at').all(params.id)
    const flowchart = flowchartId
      ? db.query('SELECT id, mermaid_code, area, created_at as updated_at FROM flowchart_history WHERE group_id = ? AND id = ?').get(params.id, flowchartId)
      : area
        ? db.query('SELECT id, mermaid_code, area, created_at as updated_at FROM flowchart_history WHERE group_id = ? AND area = ? ORDER BY created_at DESC, id DESC LIMIT 1').get(params.id, area)
        : db.query('SELECT NULL as id, mermaid_code, area, updated_at FROM flowcharts WHERE group_id = ?').get(params.id)
    return { messages, flowchart: flowchart ?? null }
  })
  .get('/:id/flowchart-history', ({ params }) => {
    const groupId = params.id
    const histories = db.query(
      'SELECT id, mermaid_code, area, created_at FROM flowchart_history WHERE group_id = ? ORDER BY created_at ASC'
    ).all(groupId) as { id: number; mermaid_code: string; area: string | null; created_at: string }[]

    const checkRows = db.query(
      'SELECT flowchart_history_id, results_json, created_at FROM check_results WHERE group_id = ? ORDER BY created_at ASC'
    ).all(groupId) as { flowchart_history_id: number | null; results_json: string; created_at: string }[]

    // 按区域分组，每条 history 附带其 check_results
    const byArea: Record<string, { id: number; mermaid_code: string; created_at: string; check_results: { passed: boolean; comment: string }[] | null }[]> = {}
    for (const h of histories) {
      const area = h.area ?? '未知区域'
      if (!byArea[area]) byArea[area] = []
      const checks = checkRows.filter(c => c.flowchart_history_id === h.id)
      byArea[area].push({
        id: h.id,
        mermaid_code: h.mermaid_code,
        created_at: h.created_at,
        check_results: checks.length > 0 ? JSON.parse(checks[checks.length - 1].results_json) : null,
      })
    }
    return byArea
  })
