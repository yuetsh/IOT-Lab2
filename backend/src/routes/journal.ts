import { Elysia, t } from 'elysia'
import { db } from '../db'

export const journalRouter = new Elysia()
  .get('/api/groups/:id/journal', ({ params, query }) => {
    const area = query.area ?? ''
    return db.query(`
      SELECT jp.id, jp.sticker_id, jp.node_id, jp.node_label, jp.x, jp.y, jp.scale,
             s.name as sticker_name, s.filename as sticker_filename
      FROM journal_placements jp
      JOIN stickers s ON s.id = jp.sticker_id
      WHERE jp.group_id = ?
        AND jp.area = ?
        AND jp.node_id IS NOT NULL
    `).all(params.id, area)
  }, {
    query: t.Object({
      area: t.Optional(t.String()),
    })
  })
  .put('/api/groups/:id/journal', ({ params, body }) => {
    const groupId = Number(params.id)
    const area = body.area ?? ''
    db.query('DELETE FROM journal_placements WHERE group_id = ? AND area = ?').run(groupId, area)
    const insert = db.prepare(
      'INSERT INTO journal_placements (group_id, area, sticker_id, node_id, node_label, x, y, scale) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (const p of body.placements) {
      insert.run(groupId, area, p.sticker_id, p.node_id, p.node_label, p.x ?? 0, p.y ?? 0, p.scale ?? 1.0)
    }
    return { ok: true }
  }, {
    body: t.Object({
      area: t.Optional(t.String()),
      placements: t.Array(t.Object({
        sticker_id: t.Number(),
        node_id: t.String(),
        node_label: t.String(),
        x: t.Optional(t.Number()),
        y: t.Optional(t.Number()),
        scale: t.Optional(t.Number())
      }))
    })
  })
