import { describe, expect, test } from 'bun:test'
import { seedDevices } from './seedDevices'

describe('seed devices', () => {
  test('includes the full seeded sticker device list with installation metadata', () => {
    expect(seedDevices).toHaveLength(29)
    expect(seedDevices[0]).toEqual({
      name: '人体红外传感器',
      description: '图书馆大门处',
      install_location: '大门区域',
      theme_color: '#3182ce',
    })
    expect(seedDevices[seedDevices.length - 1]).toEqual({
      name: '移动互联终端',
      description: '放置在自助区的位置',
      install_location: '桌面上',
      theme_color: '#d53f8c',
    })
    expect(new Set(seedDevices.map(device => device.theme_color)).size).toBeGreaterThan(5)
  })
})
