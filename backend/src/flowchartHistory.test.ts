import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { insertFlowchartHistory } from './flowchartHistory'

describe('flowchart history', () => {
  test('stores the student raw prompt with the generated flowchart', () => {
    const db = new Database(':memory:')

    db.query(`
      CREATE TABLE flowchart_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        mermaid_code TEXT NOT NULL,
        area TEXT,
        user_prompt TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run()

    insertFlowchartHistory(db, {
      groupId: 1,
      mermaidCode: 'graph TD\n  A --> B',
      area: '大门区域',
      userPrompt: '检测有人靠近时自动开门',
    })

    const row = db.query('SELECT user_prompt FROM flowchart_history').get() as { user_prompt: string }
    expect(row.user_prompt).toBe('检测有人靠近时自动开门')

    db.close()
  })
})
