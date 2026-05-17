import { Elysia, t } from 'elysia'
import { db } from '../db'
import { journal_placements, stickers } from '../schema'
import { eq, and, isNotNull } from 'drizzle-orm'

export const journalRouter = new Elysia()
  .get('/api/groups/:id/journal', ({ params, query }) => {
    const area = query.area ?? ''
    return db.select({
      id: journal_placements.id,
      sticker_id: journal_placements.sticker_id,
      node_id: journal_placements.node_id,
      node_label: journal_placements.node_label,
      x: journal_placements.x,
      y: journal_placements.y,
      scale: journal_placements.scale,
      sticker_name: stickers.name,
      sticker_filename: stickers.filename,
    })
      .from(journal_placements)
      .innerJoin(stickers, eq(stickers.id, journal_placements.sticker_id))
      .where(and(
        eq(journal_placements.group_id, Number(params.id)),
        eq(journal_placements.area, area),
        isNotNull(journal_placements.node_id),
      ))
      .all()
  }, {
    query: t.Object({
      area: t.Optional(t.String()),
    })
  })
  .put('/api/groups/:id/journal', ({ params, body }) => {
    const groupId = Number(params.id)
    const area = body.area ?? ''
    db.delete(journal_placements)
      .where(and(eq(journal_placements.group_id, groupId), eq(journal_placements.area, area)))
      .run()
    for (const p of body.placements) {
      db.insert(journal_placements).values({
        group_id: groupId,
        area,
        sticker_id: p.sticker_id,
        node_id: p.node_id,
        node_label: p.node_label,
        x: p.x ?? 0,
        y: p.y ?? 0,
        scale: p.scale ?? 1.0,
      }).run()
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
