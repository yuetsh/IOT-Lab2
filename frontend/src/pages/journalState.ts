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
  const flowchartMatch = renderedId.match(/^(?:mermaid-\d+-)?flowchart-(.+)-\d+$/)
  return flowchartMatch ? flowchartMatch[1] : renderedId
}

export function upsertNodePlacement<T extends NodePlacement>(placements: T[], placement: T) {
  const placementNodeId = placement.node_id ? normalizeMermaidNodeId(placement.node_id) : placement.node_id
  const existingIndex = placements.findIndex(p => {
    const currentNodeId = p.node_id ? normalizeMermaidNodeId(p.node_id) : p.node_id
    return currentNodeId === placementNodeId
  })
  if (existingIndex === -1) return [...placements, placement]

  return placements.map((p, index) => index === existingIndex ? placement : p)
}
