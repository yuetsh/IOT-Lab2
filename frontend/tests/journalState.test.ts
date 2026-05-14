import { describe, expect, test } from 'bun:test'
import {
  countAssignedDeviceTargets,
  getDeviceTargetNodes,
  getPlacementsForFlowNodes,
  normalizeMermaidNodeId,
  shouldClearPlacementsOnFlowchartChange,
  upsertNodePlacement,
} from '../src/pages/journalState'

describe('journal placement state', () => {
  test('clears placements when switching from one flowchart to another', () => {
    expect(shouldClearPlacementsOnFlowchartChange('graph TD\nA --> B', 'graph TD\nA --> C')).toBe(true)
  })

  test('keeps placements during initial flowchart load or no-op updates', () => {
    expect(shouldClearPlacementsOnFlowchartChange(null, 'graph TD\nA --> B')).toBe(false)
    expect(shouldClearPlacementsOnFlowchartChange('graph TD\nA --> B', null)).toBe(false)
    expect(shouldClearPlacementsOnFlowchartChange('graph TD\nA --> B', 'graph TD\nA --> B')).toBe(false)
  })

  test('normalizes Mermaid rendered node ids back to flowchart node ids', () => {
    expect(normalizeMermaidNodeId('flowchart-A-0')).toBe('A')
    expect(normalizeMermaidNodeId('flowchart-mqtt_gateway-12')).toBe('mqtt_gateway')
    expect(normalizeMermaidNodeId('mermaid-4-flowchart-MS-8')).toBe('MS')
    expect(normalizeMermaidNodeId('mermaid-8-flowchart-A1-0')).toBe('A1')
    expect(normalizeMermaidNodeId('plain-node')).toBe('plain-node')
  })

  test('replaces the existing device when placing into the same node slot', () => {
    const next = upsertNodePlacement([
      {
        node_id: 'A',
        node_label: '温湿度传感器',
        sticker_id: 1,
        sticker_name: '旧设备',
        sticker_filename: 'old.svg',
        x: 0,
        y: 0,
        scale: 1,
      },
      {
        node_id: 'B',
        node_label: 'MQTT网关',
        sticker_id: 3,
        sticker_name: '网关',
        sticker_filename: 'gateway.svg',
        x: 0,
        y: 0,
        scale: 1,
      },
    ], {
      node_id: 'A',
      node_label: '温湿度传感器',
      sticker_id: 2,
      sticker_name: '新设备',
      sticker_filename: 'new.svg',
      x: 0,
      y: 0,
      scale: 1,
    })

    expect(next).toHaveLength(2)
    expect(next.find(p => p.node_id === 'A')).toMatchObject({
      sticker_id: 2,
      sticker_name: '新设备',
    })
    expect(next.find(p => p.node_id === 'B')).toMatchObject({
      sticker_id: 3,
      sticker_name: '网关',
    })
  })

  test('replaces placements saved with Mermaid render-specific node ids', () => {
    const next = upsertNodePlacement([
      {
        node_id: 'mermaid-4-flowchart-MS-8',
        node_label: '门磁传感器',
        sticker_id: 1,
        sticker_name: '旧设备',
        sticker_filename: 'old.svg',
        x: 0,
        y: 0,
        scale: 1,
      },
    ], {
      node_id: 'MS',
      node_label: '门磁传感器',
      sticker_id: 2,
      sticker_name: '新设备',
      sticker_filename: 'new.svg',
      x: 0,
      y: 0,
      scale: 1,
    })

    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({
      node_id: 'MS',
      sticker_id: 2,
    })
  })

  test('treats every rendered flowchart node as a device target', () => {
    const nodes = [
      { id: 'A', label: '人体红外传感器持续检测' },
      { id: 'B', label: '是否有人靠近?' },
      { id: 'C', label: '自动开启大门' },
      { id: 'D', label: '持续监测人员是否离开' },
      { id: 'E', label: '人员是否离开?' },
      { id: 'F', label: '自动关闭大门' },
    ]

    expect(getDeviceTargetNodes('大门区域', nodes).map(n => n.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
  })

  test('counts assigned devices on any rendered flowchart node', () => {
    const nodes = [
      { id: 'A', label: '读者RFID刷卡' },
      { id: 'B', label: '身份识别是否通过?' },
      { id: 'C', label: '自动开启闸机' },
      { id: 'G', label: '触发声光报警装置' },
    ]
    const placements = [
      { node_id: 'A' },
      { node_id: 'flowchart-B-2' },
      { node_id: 'C' },
      { node_id: 'G' },
    ]

    expect(countAssignedDeviceTargets('身份识别', nodes, placements)).toBe(4)
  })

  test('keeps submissions limited to nodes in the current flowchart', () => {
    const nodes = [
      { id: 'A', label: '人体红外传感器持续检测' },
      { id: 'B', label: '检测到有人靠近?' },
    ]
    const placements = [
      { node_id: 'A' },
      { node_id: 'flowchart-B-2' },
      { node_id: 'O' },
      { node_id: null },
    ]

    expect(getPlacementsForFlowNodes(nodes, placements)).toEqual([
      { node_id: 'A' },
      { node_id: 'flowchart-B-2' },
    ])
  })
})
