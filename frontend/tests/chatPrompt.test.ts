import { describe, expect, test } from 'bun:test'
import { buildFixPrompt, hasFailedCheckResults } from '../src/pages/chatPrompt'

describe('buildFixPrompt', () => {
  test('builds a prompt for failed check items only', () => {
    const prompt = buildFixPrompt({
      area: '大厅安防',
      criteria: [
        '实时监测大厅温湿度数据',
        '实时监测大厅空气质量/CO2浓度',
        '环境数据超标时自动发出预警提示',
      ],
      results: [
        { passed: true, comment: '已体现' },
        { passed: false, comment: '缺少 CO2 传感器节点' },
        { passed: false, comment: '' },
      ],
    })

    expect(prompt).toContain('请基于当前「大厅」流程图进行修改')
    expect(prompt).toContain('1. 实时监测大厅空气质量/CO2浓度（检查意见：缺少 CO2 传感器节点）')
    expect(prompt).toContain('2. 环境数据超标时自动发出预警提示')
    expect(prompt).not.toContain('实时监测大厅温湿度数据')
    expect(prompt).toContain('保留已有已通过功能')
    expect(prompt).toContain('输出完整 Mermaid 流程图')
  })

  test('builds a confirmation prompt when all check items pass', () => {
    const prompt = buildFixPrompt({
      area: '大门区域',
      criteria: ['有人靠近时，自动控制大门开启'],
      results: [{ passed: true, comment: '已体现' }],
    })

    expect(prompt).toContain('当前「大门」流程图已通过全部检查')
    expect(prompt).toContain('请在保持现有功能不变的基础上')
  })
})

describe('hasFailedCheckResults', () => {
  test('returns true only when at least one check item fails', () => {
    expect(hasFailedCheckResults([
      { passed: true, comment: '已体现' },
      { passed: false, comment: '缺少节点' },
    ])).toBe(true)

    expect(hasFailedCheckResults([
      { passed: true, comment: '已体现' },
      { passed: true, comment: '已体现' },
    ])).toBe(false)

    expect(hasFailedCheckResults(null)).toBe(false)
  })
})
