import { writeFileSync } from 'fs'
import { join } from 'path'
import { db } from './db'
import { seedDevices, type SeedDevice } from './seedDevices'

const groupNames = ['第一组', '第二组', '第三组', '第四组', '第五组', '第六组']
const uploadsDir = process.env.UPLOADS_PATH ?? 'uploads'

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
    join(uploadsDir, 'stickers', filename),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#f7fafc"/><circle cx="64" cy="46" r="24" fill="${device.theme_color}"/><rect x="28" y="78" width="72" height="22" rx="11" fill="${device.theme_color}"/><text x="64" y="93" text-anchor="middle" font-size="14" font-family="sans-serif" fill="white">${label}</text></svg>`
  )
}

export function runSeed() {
  db.query('DELETE FROM check_results').run()
  db.query('DELETE FROM flowchart_history').run()
  db.query('DELETE FROM flowcharts').run()
  db.query('DELETE FROM journal_placements').run()
  db.query('DELETE FROM messages').run()
  db.query('DELETE FROM groups').run()
  db.query('DELETE FROM stickers').run()
  db.query(
    "DELETE FROM sqlite_sequence WHERE name IN ('groups','messages','flowcharts','flowchart_history','check_results','journal_placements','stickers')"
  ).run()

  for (let i = 0; i < seedDevices.length; i++) {
    const device = seedDevices[i]
    const filename = seedDeviceFilename(i)
    writeSeedDeviceImage(device, filename)
    db.query(
      'INSERT INTO stickers (name, description, install_location, theme_color, filename) VALUES (?, ?, ?, ?, ?)'
    ).run(device.name, device.description, device.install_location, device.theme_color, filename)
  }

  for (const name of groupNames) {
    db.query('INSERT INTO groups (name) VALUES (?)').run(name)
  }

  console.log('✅ 种子数据写入完成')
  console.log(`   ${groupNames.length} 个小组`)
  console.log(`   ${seedDevices.length} 个设备贴纸`)
}
