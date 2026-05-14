import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('stickers routes', () => {
  let app: { handle: (request: Request) => Promise<Response> }
  let db: typeof import('../db').db
  let originalCwd: string
  let tempDir: string

  beforeAll(async () => {
    originalCwd = process.cwd()
    tempDir = mkdtempSync(join(tmpdir(), 'wangyi2-stickers-'))
    process.chdir(tempDir)

    const [{ Elysia }, { stickersRouter }, { journalRouter }, dbModule] = await Promise.all([
      import('elysia'),
      import('./stickers'),
      import('./journal'),
      import('../db'),
    ])

    db = dbModule.db
    app = new Elysia()
      .use(stickersRouter)
      .use(journalRouter)
  })

  afterAll(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('updates one sticker in place so existing journal placements keep using it', async () => {
    const createForm = new FormData()
    createForm.append('name', '树莓派')
    createForm.append('description', '边缘计算控制器')
    createForm.append('install_location', '机柜 A1')
    createForm.append('theme_color', '#805ad5')
    createForm.append('image', new File(['old image'], 'old.png', { type: 'image/png' }))
    const createResponse = await app.handle(new Request('http://test/api/stickers', {
      method: 'POST',
      body: createForm,
    }))
    const created = await createResponse.json() as { id: number; filename: string }

    db.query('INSERT INTO groups (name) VALUES (?)').run('第一组')
    const group = db.query('SELECT id FROM groups WHERE name = ?').get('第一组') as { id: number }
    db.query(
      'INSERT INTO journal_placements (group_id, sticker_id, x, y, scale, node_id, node_label) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(group.id, created.id, 0, 0, 1, 'A', '温湿度传感器')

    const updateForm = new FormData()
    updateForm.append('name', '新版树莓派')
    updateForm.append('description', '新版边缘计算控制器')
    updateForm.append('install_location', '机柜 B2')
    updateForm.append('theme_color', '#38a169')
    updateForm.append('image', new File(['new image'], 'new.webp', { type: 'image/webp' }))
    const updateResponse = await app.handle(new Request(`http://test/api/stickers/${created.id}`, {
      method: 'PUT',
      body: updateForm,
    }))

    expect(updateResponse.status).toBe(200)
    const updated = await updateResponse.json() as { id: number; name: string; description: string; install_location: string; theme_color: string; filename: string }
    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe('新版树莓派')
    expect(updated.description).toBe('新版边缘计算控制器')
    expect(updated.install_location).toBe('机柜 B2')
    expect(updated.theme_color).toBe('#38a169')
    expect(updated.filename).not.toBe(created.filename)

    const journalResponse = await app.handle(new Request(`http://test/api/groups/${group.id}/journal`))
    const placements = await journalResponse.json() as { sticker_id: number; sticker_name: string; sticker_filename: string; node_id: string; node_label: string }[]
    expect(placements).toHaveLength(1)
    expect(placements[0]).toMatchObject({
      sticker_id: created.id,
      sticker_name: '新版树莓派',
      sticker_filename: updated.filename,
      node_id: 'A',
      node_label: '温湿度传感器',
    })
  })

  test('saves journal placements by Mermaid node slot', async () => {
    const createForm = new FormData()
    createForm.append('name', 'MQTT网关')
    createForm.append('description', '数据汇聚')
    createForm.append('install_location', '弱电间')
    createForm.append('theme_color', '#34d399')
    createForm.append('image', new File(['gateway image'], 'gateway.png', { type: 'image/png' }))
    const createResponse = await app.handle(new Request('http://test/api/stickers', {
      method: 'POST',
      body: createForm,
    }))
    const created = await createResponse.json() as { id: number; filename: string }

    db.query('INSERT INTO groups (name) VALUES (?)').run('第二组')
    const group = db.query('SELECT id FROM groups WHERE name = ?').get('第二组') as { id: number }

    const saveResponse = await app.handle(new Request(`http://test/api/groups/${group.id}/journal`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placements: [{
          sticker_id: created.id,
          node_id: 'B',
          node_label: 'MQTT网关',
        }],
      }),
    }))

    expect(saveResponse.status).toBe(200)

    const journalResponse = await app.handle(new Request(`http://test/api/groups/${group.id}/journal`))
    const placements = await journalResponse.json() as { sticker_id: number; node_id: string; node_label: string; x: number; y: number; scale: number }[]
    expect(placements).toEqual([{
      id: expect.any(Number),
      sticker_id: created.id,
      x: 0,
      y: 0,
      scale: 1,
      sticker_name: 'MQTT网关',
      sticker_filename: created.filename,
      node_id: 'B',
      node_label: 'MQTT网关',
    }])
  })
})
