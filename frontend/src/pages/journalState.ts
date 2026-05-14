export function shouldClearPlacementsOnFlowchartChange(
  previousCode: string | null,
  nextCode: string | null
) {
  return previousCode !== null && nextCode !== null && previousCode !== nextCode
}

export type NodePlacement = {
  node_id?: string | null
}

export function normalizeMermaidNodeId(renderedId: string) {
  const flowchartMatch = renderedId.match(/^flowchart-(.+)-\d+$/)
  return flowchartMatch ? flowchartMatch[1] : renderedId
}

export function upsertNodePlacement<T extends NodePlacement>(placements: T[], placement: T) {
  const existingIndex = placements.findIndex(p => p.node_id === placement.node_id)
  if (existingIndex === -1) return [...placements, placement]

  return placements.map((p, index) => index === existingIndex ? placement : p)
}
