import { db } from './db'
import { flowchart_history } from './schema'

type InsertFlowchartHistoryInput = {
  groupId: number
  mermaidCode: string
  area?: string | null
  userPrompt?: string | null
}

export function insertFlowchartHistory(input: InsertFlowchartHistoryInput) {
  db.insert(flowchart_history).values({
    group_id: input.groupId,
    mermaid_code: input.mermaidCode,
    area: input.area ?? null,
    user_prompt: input.userPrompt ?? null,
  }).run()
}
