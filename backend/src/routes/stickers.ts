import { Elysia, t } from 'elysia'
import { db } from '../db'
import { stickers } from '../schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { readFileSync, unlinkSync, writeFileSync } from 'fs'
import { extname, join } from 'path'

const uploadsDir = process.env.UPLOADS_PATH ?? 'uploads'
const stickersDir = join(uploadsDir, 'stickers')

export const stickersRouter = new Elysia({ prefix: '/api/stickers' })
  .get('/', () => {
    return db.select().from(stickers).orderBy(stickers.name).all()
  })
  .post('/', async ({ body }) => {
    const { name, description = '', install_location = '', theme_color = '#4299e1', image } = body
    const ext = extname(image.name) || '.png'
    const filename = `${randomUUID()}${ext}`
    const bytes = await image.arrayBuffer()
    writeFileSync(join(stickersDir, filename), Buffer.from(bytes))
    db.insert(stickers).values({ name, description, install_location, theme_color, filename }).run()
    return db.select().from(stickers).where(eq(stickers.filename, filename)).get()
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      install_location: t.Optional(t.String()),
      theme_color: t.Optional(t.String()),
      image: t.File()
    })
  })
  .put('/:id', async ({ params, body, set }) => {
    const stickerId = Number(params.id)
    const existing = db.select({ filename: stickers.filename }).from(stickers).where(eq(stickers.id, stickerId)).get()
    if (!existing) {
      set.status = 404
      return { error: 'Sticker not found' }
    }

    const { name, description = '', install_location = '', theme_color = '#4299e1', image } = body
    let filename = existing.filename
    if (image) {
      const ext = extname(image.name) || '.png'
      filename = `${randomUUID()}${ext}`
      const bytes = await image.arrayBuffer()
      writeFileSync(join(stickersDir, filename), Buffer.from(bytes))
    }

    db.update(stickers)
      .set({ name, description, install_location, theme_color, filename })
      .where(eq(stickers.id, stickerId))
      .run()

    if (image && existing.filename !== filename) {
      try { unlinkSync(join(stickersDir, existing.filename)) } catch {}
    }

    return db.select().from(stickers).where(eq(stickers.id, stickerId)).get()
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      install_location: t.Optional(t.String()),
      theme_color: t.Optional(t.String()),
      image: t.Optional(t.File())
    })
  })
  .delete('/:id', ({ params }) => {
    const stickerId = Number(params.id)
    const existing = db.select({ filename: stickers.filename }).from(stickers).where(eq(stickers.id, stickerId)).get()
    if (existing) {
      try { unlinkSync(join(stickersDir, existing.filename)) } catch {}
      db.delete(stickers).where(eq(stickers.id, stickerId)).run()
    }
    return { ok: true }
  })
  .get('/:id/image', ({ params, set }) => {
    const stickerId = Number(params.id)
    const existing = db.select({ filename: stickers.filename }).from(stickers).where(eq(stickers.id, stickerId)).get()
    if (!existing) { set.status = 404; return 'Not found' }
    const ext = extname(existing.filename).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml', '.webp': 'image/webp'
    }
    set.headers['content-type'] = mimeMap[ext] ?? 'application/octet-stream'
    return readFileSync(join(stickersDir, existing.filename))
  })
