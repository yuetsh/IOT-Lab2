import { describe, expect, test } from 'bun:test'
import {
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
})
