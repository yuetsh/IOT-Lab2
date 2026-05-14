import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { seedDevices } from './seedDevices'

describe('seed devices', () => {
  test('includes the reduced key sticker device list with installation metadata', () => {
    expect(seedDevices.map(device => device.name)).toEqual([
      '人体红外传感器',
      '超高频中距离一体机',
      '超高频标签',
      '红外对射传感器',
      '报警灯',
      '温湿度传感器',
      '空气质量传感器',
      '二氧化碳传感器',
      '烟雾传感器',
      '火焰传感器',
      'LED显示器',
      '串口服务器',
      '土壤水分传感器',
      '液位传感器',
      '水温传感器',
      '雾化器',
      '加热棒',
      '超高频中距离一体机',
      '超高频标签',
      '小票打印机',
    ])
    expect(seedDevices[0]).toEqual({
      name: '人体红外传感器',
      description: '安装在大门两侧，检测人员靠近与离开',
      install_location: '大门区域',
      theme_color: '#3182ce',
    })
    expect(seedDevices[seedDevices.length - 1]).toEqual({
      name: '小票打印机',
      description: '放置在自助借还台，借还成功后自动打印小票凭证',
      install_location: '自助系统',
      theme_color: '#d53f8c',
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
