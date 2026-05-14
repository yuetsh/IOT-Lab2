import { Elysia, t } from 'elysia'
import { db } from '../db'
import { randomUUID } from 'crypto'
import { readFileSync, unlinkSync, writeFileSync } from 'fs'
import { extname, join } from 'path'

const uploadsDir = process.env.UPLOADS_PATH ?? 'uploads'
const stickersDir = join(uploadsDir, 'stickers')

export const stickersRouter = new Elysia({ prefix: '/api/stickers' })
  .get('/', () => {
    return db.query('SELECT * FROM stickers ORDER BY name').all()
  })
  .post('/', async ({ body }) => {
    const { name, description = '', install_location = '', theme_color = '#4299e1', image } = body
    const ext = extname(image.name) || '.png'
    const filename = `${randomUUID()}${ext}`
    const bytes = await image.arrayBuffer()
    writeFileSync(join(stickersDir, filename), Buffer.from(bytes))
    db.query(
      'INSERT INTO stickers (name, description, install_location, theme_color, filename) VALUES (?, ?, ?, ?, ?)'
    ).run(name, description, install_location, theme_color, filename)
    const sticker = db.query('SELECT * FROM stickers WHERE filename = ?').get(filename)
    return sticker
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
    const sticker = db.query('SELECT filename FROM stickers WHERE id = ?').get(params.id) as { filename: string } | null
    if (!sticker) {
      set.status = 404
      return { error: 'Sticker not found' }
    }

    const { name, description = '', install_location = '', theme_color = '#4299e1', image } = body
    let filename = sticker.filename
    if (image) {
      const ext = extname(image.name) || '.png'
      filename = `${randomUUID()}${ext}`
      const bytes = await image.arrayBuffer()
      writeFileSync(join(stickersDir, filename), Buffer.from(bytes))
    }

    db.query(
      'UPDATE stickers SET name = ?, description = ?, install_location = ?, theme_color = ?, filename = ? WHERE id = ?'
    ).run(name, description, install_location, theme_color, filename, params.id)
    if (image && sticker.filename !== filename) {
      try { unlinkSync(join(stickersDir, sticker.filename)) } catch {}
    }

    return db.query('SELECT * FROM stickers WHERE id = ?').get(params.id)
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
    const sticker = db.query('SELECT filename FROM stickers WHERE id = ?').get(params.id) as { filename: string } | null
    if (sticker) {
      try { unlinkSync(join(stickersDir, sticker.filename)) } catch {}
      db.query('DELETE FROM stickers WHERE id = ?').run(params.id)
    }
    return { ok: true }
  })
  .get('/:id/image', ({ params, set }) => {
    const sticker = db.query('SELECT filename FROM stickers WHERE id = ?').get(params.id) as { filename: string } | null
    if (!sticker) { set.status = 404; return 'Not found' }
    const ext = extname(sticker.filename).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml', '.webp': 'image/webp'
    }
    set.headers['content-type'] = mimeMap[ext] ?? 'application/octet-stream'
    return readFileSync(join(stickersDir, sticker.filename))
  })
