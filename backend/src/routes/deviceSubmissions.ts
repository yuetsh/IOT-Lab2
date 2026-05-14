import { Elysia, t } from 'elysia'
import { db } from '../db'

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

    const existing = db.query(
      'SELECT id, placements_json FROM device_submissions WHERE group_id = ? AND area IS ? AND mermaid_code IS ?'
    ).all(groupId, area, mermaidCode) as { id: number; placements_json: string }[]

    for (const sub of existing) {
      const parsed = JSON.parse(sub.placements_json) as { sticker_id: number; node_id: string; node_label: string }[]
      if (normalizePlacements(parsed) === normalizedNew) {
        return { ok: true, submission_id: sub.id }
      }
    }

    const result = db.query(
      'INSERT INTO device_submissions (group_id, area, placements_json, mermaid_code) VALUES (?, ?, ?, ?)'
    ).run(groupId, area, JSON.stringify(body.placements), mermaidCode)
    return { ok: true, submission_id: Number(result.lastInsertRowid) }
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
    const rows = db.query(
      'SELECT id, area, placements_json, created_at FROM device_submissions WHERE group_id = ? ORDER BY created_at ASC'
    ).all(Number(params.id)) as { id: number; area: string | null; placements_json: string; created_at: string }[]
    return rows.map(r => ({
      id: r.id,
      area: r.area,
      placements: JSON.parse(r.placements_json) as { sticker_id: number; node_id: string; node_label: string; sticker_name: string; sticker_filename: string }[],
      created_at: r.created_at,
    }))
  })
