import { describe, expect, test } from 'bun:test'
import { shouldClearJournalPlacementsForFlowchartChange } from './flowchartState'

describe('flowchart state', () => {
  test('clears journal placements only when a saved flowchart changes', () => {
    expect(shouldClearJournalPlacementsForFlowchartChange('graph TD\nA --> B', 'graph TD\nA --> C')).toBe(true)
    expect(shouldClearJournalPlacementsForFlowchartChange('graph TD\nA --> B', 'graph TD\nA --> B')).toBe(false)
    expect(shouldClearJournalPlacementsForFlowchartChange(null, 'graph TD\nA --> B')).toBe(false)
    expect(shouldClearJournalPlacementsForFlowchartChange('graph TD\nA --> B', null)).toBe(false)
  })
})
