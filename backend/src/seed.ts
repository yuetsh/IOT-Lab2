import { writeFileSync, unlinkSync, readdirSync } from 'fs'
import { join } from 'path'
import { db, sqlite, reinitSchema } from './db'
import { stickers, groups } from './schema'
import { seedDevices, type SeedDevice } from './seedDevices'

const groupNames = ['第一组', '第二组', '第三组', '第四组', '第五组', '第六组']
const uploadsDir = process.env.UPLOADS_PATH ?? 'uploads'
const stickersDir = join(uploadsDir, 'stickers')

function escapeSvgText(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function seedDeviceFilename(index: number) {
  return `seed-device-${String(index + 1).padStart(2, '0')}.svg`
}

function writeSeedDeviceImage(device: SeedDevice, filename: string) {
  const label = escapeSvgText(device.name.slice(0, 4))
  writeFileSync(
    join(stickersDir, filename),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#f7fafc"/><circle cx="64" cy="46" r="24" fill="${device.theme_color}"/><rect x="28" y="78" width="72" height="22" rx="11" fill="${device.theme_color}"/><text x="64" y="93" text-anchor="middle" font-size="14" font-family="sans-serif" fill="white">${label}</text></svg>`
  )
}

export function clearAll() {
  const tables = sqlite.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).all() as { name: string }[]

  sqlite.query('PRAGMA foreign_keys = OFF').run()
  for (const { name } of tables) {
    sqlite.query(`DROP TABLE IF EXISTS "${name}"`).run()
  }
  sqlite.query('PRAGMA foreign_keys = ON').run()

  reinitSchema()

  for (const file of readdirSync(stickersDir)) {
    try { unlinkSync(join(stickersDir, file)) } catch {}
  }
}

export function runSeed() {
  clearAll()

  for (let i = 0; i < seedDevices.length; i++) {
    const device = seedDevices[i]
    const filename = seedDeviceFilename(i)
    writeSeedDeviceImage(device, filename)
    db.insert(stickers).values({
      name: device.name,
      description: device.description,
      install_location: device.install_location,
      theme_color: device.theme_color,
      filename,
    }).run()
  }

  for (const name of groupNames) {
    db.insert(groups).values({ name }).run()
  }

  console.log('✅ 种子数据写入完成')
  console.log(`   ${groupNames.length} 个小组`)
  console.log(`   ${seedDevices.length} 个设备贴纸`)
}
