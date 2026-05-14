import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { seedDevices } from './seedDevices'

describe('seed devices', () => {
  test('includes the full seeded sticker device list with installation metadata', () => {
    expect(seedDevices).toHaveLength(27)
    expect(seedDevices[0]).toEqual({
      name: '人体红外传感器',
      description: '安装在大门两侧，检测人员靠近与离开',
      install_location: '大门区域',
      theme_color: '#3182ce',
    })
    expect(seedDevices[seedDevices.length - 1]).toEqual({
      name: 'ADAM-4017模拟量采集器',
      description: '安装在设备间操作箱内，采集温湿度、CO₂、空气质量等模拟传感器信号',
      install_location: '设备间',
      theme_color: '#4a5568',
    })
    expect(new Set(seedDevices.map(device => device.theme_color)).size).toBeGreaterThan(5)
  })
})

describe('runSeed', () => {
  test('seeds only six groups and the device stickers', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'wangyi2-seed-'))
    const dbPath = join(tempDir, 'data.sqlite')
    const uploadsDir = join(tempDir, 'uploads')
    const repoRoot = join(import.meta.dir, '../..')
    let db: Database | null = null

    try {
      const result = Bun.spawnSync({
        cmd: ['bun', 'run', 'backend/src/runSeed.ts'],
        cwd: repoRoot,
        env: {
          ...process.env,
          DATABASE_PATH: dbPath,
          UPLOADS_PATH: uploadsDir,
        },
      })

      expect(result.exitCode).toBe(0)
      db = new Database(dbPath)

      const groups = db.query('SELECT name FROM groups ORDER BY id').all() as { name: string }[]
      expect(groups.map(group => group.name)).toEqual([
        '第一组',
        '第二组',
        '第三组',
        '第四组',
        '第五组',
        '第六组',
      ])

      const count = (table: string) => (
        db!.query(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }
      ).count

      expect(count('stickers')).toBe(seedDevices.length)
      expect(count('messages')).toBe(0)
      expect(count('flowcharts')).toBe(0)
      expect(count('flowchart_history')).toBe(0)
      expect(count('check_results')).toBe(0)
    } finally {
      db?.close()
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
