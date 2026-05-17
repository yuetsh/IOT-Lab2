import { Elysia, t } from 'elysia'
import { db } from '../db'
import { groups, messages, flowcharts, flowchart_history, check_results } from '../schema'
import { eq, and, isNotNull, desc, asc } from 'drizzle-orm'

export const groupsRouter = new Elysia({ prefix: '/api/groups' })
  .get('/', () => {
    return db.select({
      id: groups.id,
      name: groups.name,
      is_stats_excluded: groups.is_stats_excluded,
      created_at: groups.created_at,
    }).from(groups).orderBy(asc(groups.id)).all()
  })
  .post('/', ({ body }) => {
    const { name } = body
    try {
      db.insert(groups).values({ name }).run()
      return db.select({
        id: groups.id,
        name: groups.name,
        is_stats_excluded: groups.is_stats_excluded,
        created_at: groups.created_at,
      }).from(groups).where(eq(groups.name, name)).get()
    } catch {
      throw new Error('小组名已存在')
    }
  }, {
    body: t.Object({ name: t.String({ minLength: 1 }) })
  })
  .delete('/:id', ({ params }) => {
    db.delete(groups).where(eq(groups.id, Number(params.id))).run()
    return { ok: true }
  })
  .get('/:id/conversation', ({ params, query }) => {
    const { area, flowchartId } = query as Record<string, string | undefined>
    const groupId = Number(params.id)

    const msgs = area
      ? db.select({ id: messages.id, role: messages.role, content: messages.content, created_at: messages.created_at })
          .from(messages)
          .where(and(eq(messages.group_id, groupId), eq(messages.area, area)))
          .orderBy(asc(messages.created_at))
          .all()
      : db.select({ id: messages.id, role: messages.role, content: messages.content, created_at: messages.created_at })
          .from(messages)
          .where(eq(messages.group_id, groupId))
          .orderBy(asc(messages.created_at))
          .all()

    let flowchart: { id: number | null; mermaid_code: string; area: string | null; updated_at: string | null } | null = null
    if (flowchartId) {
      flowchart = db.select({
        id: flowchart_history.id,
        mermaid_code: flowchart_history.mermaid_code,
        area: flowchart_history.area,
        updated_at: flowchart_history.created_at,
      })
        .from(flowchart_history)
        .where(and(eq(flowchart_history.group_id, groupId), eq(flowchart_history.id, Number(flowchartId))))
        .get() ?? null
    } else if (area) {
      flowchart = db.select({
        id: flowchart_history.id,
        mermaid_code: flowchart_history.mermaid_code,
        area: flowchart_history.area,
        updated_at: flowchart_history.created_at,
      })
        .from(flowchart_history)
        .where(and(eq(flowchart_history.group_id, groupId), eq(flowchart_history.area, area)))
        .orderBy(desc(flowchart_history.created_at), desc(flowchart_history.id))
        .limit(1)
        .get() ?? null
    } else {
      const fc = db.select({
        mermaid_code: flowcharts.mermaid_code,
        area: flowcharts.area,
        updated_at: flowcharts.updated_at,
      })
        .from(flowcharts)
        .where(eq(flowcharts.group_id, groupId))
        .get()
      flowchart = fc ? { id: null, ...fc } : null
    }

    return { messages: msgs, flowchart }
  })
  .get('/:id/areas-with-flowcharts', ({ params }) => {
    const rows = db.selectDistinct({ area: flowchart_history.area })
      .from(flowchart_history)
      .where(and(eq(flowchart_history.group_id, Number(params.id)), isNotNull(flowchart_history.area)))
      .all()
    return rows.map(r => r.area)
  })
  .get('/:id/flowchart-history', ({ params }) => {
    const groupId = Number(params.id)

    const histories = db.select({
      id: flowchart_history.id,
      mermaid_code: flowchart_history.mermaid_code,
      area: flowchart_history.area,
      created_at: flowchart_history.created_at,
    })
      .from(flowchart_history)
      .where(eq(flowchart_history.group_id, groupId))
      .orderBy(asc(flowchart_history.created_at))
      .all()

    const checkRows = db.select({
      flowchart_history_id: check_results.flowchart_history_id,
      results_json: check_results.results_json,
      created_at: check_results.created_at,
    })
      .from(check_results)
      .where(eq(check_results.group_id, groupId))
      .orderBy(asc(check_results.created_at))
      .all()

    const byArea: Record<string, { id: number; mermaid_code: string; created_at: string; check_results: { passed: boolean; comment: string }[] | null }[]> = {}
    for (const h of histories) {
      const area = h.area ?? '未知区域'
      if (!byArea[area]) byArea[area] = []
      const checks = checkRows.filter(c => c.flowchart_history_id === h.id)
      byArea[area].push({
        id: h.id,
        mermaid_code: h.mermaid_code,
        created_at: h.created_at!,
        check_results: checks.length > 0 ? JSON.parse(checks[checks.length - 1].results_json) : null,
      })
    }
    return byArea
  })
