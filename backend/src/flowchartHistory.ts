import type { Database } from 'bun:sqlite'

type InsertFlowchartHistoryInput = {
  groupId: number
  mermaidCode: string
  area?: string | null
  userPrompt?: string | null
}

export function insertFlowchartHistory(db: Database, input: InsertFlowchartHistoryInput) {
  db.query(`
    INSERT INTO flowchart_history (group_id, mermaid_code, area, user_prompt)
    VALUES (?, ?, ?, ?)
  `).run(input.groupId, input.mermaidCode, input.area ?? null, input.userPrompt ?? null)
}
