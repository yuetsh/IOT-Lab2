import { Elysia, t } from 'elysia'
import { db } from '../db'
import { device_submissions } from '../schema'
import { eq, and, isNull } from 'drizzle-orm'

function normalizePlacements(placements: { sticker_id: number; node_id: string; node_label: string }[]) {
  return JSON.stringify(
    [...placements].sort((a, b) => a.node_id.localeCompare(b.node_id) || a.sticker_id - b.sticker_id)
      .map(p => ({ sticker_id: p.sticker_id, node_id: p.node_id, node_label: p.node_label }))
  )
}

export const deviceSubmissionsRouter = new Elysia()
  .post('/api/groups/:id/device-submissions', ({ params, body }) => {
    const groupId = Number(params.id)
    const area = body.area ?? null
    const mermaidCode = body.mermaid_code ?? null
    const normalizedNew = normalizePlacements(body.placements)

    const areaCondition = area === null ? isNull(device_submissions.area) : eq(device_submissions.area, area)
    const codeCondition = mermaidCode === null ? isNull(device_submissions.mermaid_code) : eq(device_submissions.mermaid_code, mermaidCode)

    const existing = db.select({ id: device_submissions.id, placements_json: device_submissions.placements_json })
      .from(device_submissions)
      .where(and(eq(device_submissions.group_id, groupId), areaCondition, codeCondition))
      .all()

    for (const sub of existing) {
      const parsed = JSON.parse(sub.placements_json) as { sticker_id: number; node_id: string; node_label: string }[]
      if (normalizePlacements(parsed) === normalizedNew) {
        return { ok: true, submission_id: sub.id }
      }
    }

    const inserted = db.insert(device_submissions)
      .values({ group_id: groupId, area, placements_json: JSON.stringify(body.placements), mermaid_code: mermaidCode })
      .returning({ id: device_submissions.id })
      .get()
    return { ok: true, submission_id: inserted.id }
  }, {
    body: t.Object({
      area: t.Optional(t.Nullable(t.String())),
      placements: t.Array(t.Object({
        sticker_id: t.Number(),
        node_id: t.String(),
        node_label: t.String(),
        sticker_name: t.String(),
        sticker_filename: t.String(),
      })),
      mermaid_code: t.Optional(t.Nullable(t.String())),
    })
  })
  .get('/api/groups/:id/device-submissions', ({ params }) => {
    const rows = db.select({
      id: device_submissions.id,
      area: device_submissions.area,
      placements_json: device_submissions.placements_json,
      created_at: device_submissions.created_at,
    })
      .from(device_submissions)
      .where(eq(device_submissions.group_id, Number(params.id)))
      .orderBy(device_submissions.created_at)
      .all()
    return rows.map(r => ({
      id: r.id,
      area: r.area,
      placements: JSON.parse(r.placements_json) as { sticker_id: number; node_id: string; node_label: string; sticker_name: string; sticker_filename: string }[],
      created_at: r.created_at,
    }))
  })
