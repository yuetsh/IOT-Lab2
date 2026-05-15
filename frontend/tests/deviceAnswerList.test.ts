import { describe, expect, test } from 'bun:test'
import { DEVICE_ANSWER_AREA_COLORS, DEVICE_ANSWER_BUTTON_LABEL, DEVICE_ANSWER_LIST } from '../src/pages/admin/deviceAnswerList'

describe('admin device answer list', () => {
  test('uses the expected button label', () => {
    expect(DEVICE_ANSWER_BUTTON_LABEL).toBe('答案清单')
  })

  test('includes multi-device standard answers used by device selection', () => {
    expect(DEVICE_ANSWER_LIST).toContainEqual({
      area: '身份识别',
      node: '读者RFID刷卡',
      devices: ['超高频中距离一体机', '超高频标签'],
    })
    expect(DEVICE_ANSWER_LIST).toContainEqual({
      area: 'LED显示',
      node: '实时显示当前日期与时间',
      devices: ['串口服务器', 'LED显示器'],
    })
  })

  test('defines a distinct color for each functional area', () => {
    const areas = new Set(DEVICE_ANSWER_LIST.map(row => row.area))

    expect(Object.keys(DEVICE_ANSWER_AREA_COLORS).sort()).toEqual([...areas].sort())
    expect(new Set(Object.values(DEVICE_ANSWER_AREA_COLORS))).toHaveLength(areas.size)
  })
})
