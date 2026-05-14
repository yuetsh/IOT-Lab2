import { Elysia, t } from 'elysia'
import { db } from '../db'

export const deviceSubmissionsRouter = new Elysia()
  .post('/api/groups/:id/device-submissions', ({ params, body }) => {
    db.query(
      'INSERT INTO device_submissions (group_id, placements_json) VALUES (?, ?)'
    ).run(Number(params.id), JSON.stringify(body.placements))
    return { ok: true }
  }, {
    body: t.Object({
      placements: t.Array(t.Object({
        sticker_id: t.Number(),
        node_id: t.String(),
        node_label: t.String(),
        sticker_name: t.String(),
        sticker_filename: t.String(),
      }))
    })
  })
  .get('/api/groups/:id/device-submissions', ({ params }) => {
    const rows = db.query(
      'SELECT id, placements_json, created_at FROM device_submissions WHERE group_id = ? ORDER BY created_at ASC'
    ).all(Number(params.id)) as { id: number; placements_json: string; created_at: string }[]
    return rows.map(r => ({
      id: r.id,
      placements: JSON.parse(r.placements_json) as { sticker_id: number; node_id: string; node_label: string; sticker_name: string; sticker_filename: string }[],
      created_at: r.created_at,
    }))
  })
