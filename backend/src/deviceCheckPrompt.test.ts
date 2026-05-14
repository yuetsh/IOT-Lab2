import { describe, expect, test } from 'bun:test'
import { buildDeviceCheckPrompt, extractMermaidNodeLabels, filterResultsToCurrentFlowchart } from './routes/deviceCheck'

describe('device check prompt', () => {
  test('extracts current flowchart node labels from mermaid code', () => {
    const nodes = extractMermaidNodeLabels(`graph TD
  A[人体红外传感器持续检测]:::trigger --> B{检测到有人靠近?}:::decision
  B -->|有人| C[执行开门动作]:::action
  C --> D[持续监测人员是否离开]:::trigger`)

    expect(nodes).toEqual([
      { id: 'A', label: '人体红外传感器持续检测' },
      { id: 'B', label: '检测到有人靠近?' },
      { id: 'C', label: '执行开门动作' },
      { id: 'D', label: '持续监测人员是否离开' },
    ])
  })

  test('without correctMappings, prompt relies on AI inference from available devices', () => {
    const prompt = buildDeviceCheckPrompt({
      mermaidCode: `graph TD
  A[人体红外传感器持续检测]:::trigger --> B{检测到有人靠近?}:::decision`,
      placements: [
        { sticker_name: '雾化器', node_label: '启动雾化加湿装置' },
      ],
      availableDevices: [
        { name: '人体红外传感器', description: '安装在大门两侧，检测人员靠近与离开' },
      ],
    })

    expect(prompt).toContain('当前流程图节点')
    expect(prompt).toContain('A：人体红外传感器持续检测')
    expect(prompt).toContain('B：检测到有人靠近?')
    expect(prompt).toContain('已放置设备')
    expect(prompt).toContain('设备「雾化器」→ 节点「启动雾化加湿装置」')
    expect(prompt).toContain('当前功能区域可用设备')
    expect(prompt).toContain('人体红外传感器：安装在大门两侧，检测人员靠近与离开')
    expect(prompt).not.toContain('功能区域的设备-节点正确对应关系')
    expect(prompt).not.toContain('→ 正确设备')
  })

  test('with correctMappings, prompt includes reference device-node mapping', () => {
    const prompt = buildDeviceCheckPrompt({
      mermaidCode: `graph TD
  A[人体红外传感器持续检测]:::trigger --> B{检测到有人靠近?}:::decision`,
      placements: [
        { sticker_name: '人体红外传感器', node_label: '人体红外传感器持续检测' },
      ],
      availableDevices: [
        { name: '人体红外传感器', description: '安装在大门两侧，检测人员靠近与离开' },
      ],
      correctMappings: [
        { node: '持续检测人员靠近', devices: ['人体红外传感器'] },
        { node: '自动开启大门', devices: ['人体红外传感器'] },
      ],
    })

    expect(prompt).toContain('功能区域的设备-节点正确对应关系')
    expect(prompt).toContain('节点「持续检测人员靠近」→ 正确设备：人体红外传感器')
    expect(prompt).toContain('节点「自动开启大门」→ 正确设备：人体红外传感器')
    expect(prompt).toContain('优先根据「设备-节点正确对应关系」判断')
  })

  test('drops AI result items whose node is not in the current flowchart', () => {
    const results = filterResultsToCurrentFlowchart([
      { device_name: '人体红外传感器', node_label: '人体红外传感器持续检测', passed: true, comment: '正确' },
      { device_name: '雾化器', node_label: '启动雾化加湿装置', passed: true, comment: '不应出现在大门流程图' },
    ], `graph TD
  A[人体红外传感器持续检测]:::trigger --> B{检测到有人靠近?}:::decision`)

    expect(results).toEqual([
      { device_name: '人体红外传感器', node_label: '人体红外传感器持续检测', passed: true, comment: '正确' },
    ])
  })
})
