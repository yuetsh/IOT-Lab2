import { describe, expect, test } from 'bun:test'
import { DEVICE_DATA_BUTTON_LABEL, DEVICE_DATA_DIALOG_TITLE } from '../src/pages/deviceDataModal'

describe('student device data modal', () => {
  test('uses concise labels for the device data table dialog', () => {
    expect(DEVICE_DATA_BUTTON_LABEL).toBe('设备表格')
    expect(DEVICE_DATA_DIALOG_TITLE).toBe('设备表格')
  })
})
