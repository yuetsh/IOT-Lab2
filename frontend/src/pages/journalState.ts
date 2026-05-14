export function shouldClearPlacementsOnFlowchartChange(
  previousCode: string | null,
  nextCode: string | null
) {
  return previousCode !== null && nextCode !== null && previousCode !== nextCode
}

export type NodePlacement = {
  node_id?: string | null
  sticker_id?: number
}

export type DeviceTargetNode = {
  id: string
  label: string
}

export function normalizeMermaidNodeId(renderedId: string) {
  const flowchartMatch = renderedId.match(/^(?:mermaid-\d+-)?flowchart-(.+)-\d+$/)
  return flowchartMatch ? flowchartMatch[1] : renderedId
}

export function upsertNodePlacement<T extends NodePlacement>(placements: T[], placement: T) {
  const placementNodeId = placement.node_id ? normalizeMermaidNodeId(placement.node_id) : placement.node_id
  const alreadyExists = placements.some(p => {
    const currentNodeId = p.node_id ? normalizeMermaidNodeId(p.node_id) : p.node_id
    return currentNodeId === placementNodeId && p.sticker_id === placement.sticker_id
  })
  if (alreadyExists) return placements
  return [...placements, placement]
}

export function getDeviceTargetNodes<T extends DeviceTargetNode>(_area: string | null | undefined, nodes: T[]) {
  return nodes
}

export function getPlacementsForFlowNodes<T extends DeviceTargetNode, P extends NodePlacement>(nodes: T[], placements: P[]) {
  const nodeIds = new Set(nodes.map(node => normalizeMermaidNodeId(node.id)))
  return placements.filter(placement => {
    if (!placement.node_id) return false
    return nodeIds.has(normalizeMermaidNodeId(placement.node_id))
  })
}

export function countAssignedDeviceTargets<T extends DeviceTargetNode>(
  area: string | null | undefined,
  nodes: T[],
  placements: NodePlacement[]
) {
  const targetIds = new Set(getDeviceTargetNodes(area, nodes).map(node => normalizeMermaidNodeId(node.id)))
  const assignedTargetIds = new Set<string>()

  for (const placement of placements) {
    if (!placement.node_id) continue
    const nodeId = normalizeMermaidNodeId(placement.node_id)
    if (targetIds.has(nodeId)) assignedTargetIds.add(nodeId)
  }

  return assignedTargetIds.size
}
