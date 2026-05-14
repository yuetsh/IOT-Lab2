import { Elysia, t } from 'elysia'
import { db } from '../db'

export const deviceSubmissionsRouter = new Elysia()
  .post('/api/groups/:id/device-submissions', ({ params, body }) => {
    const result = db.query(
      'INSERT INTO device_submissions (group_id, area, placements_json, mermaid_code) VALUES (?, ?, ?, ?)'
    ).run(Number(params.id), body.area ?? null, JSON.stringify(body.placements), body.mermaid_code ?? null)
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
