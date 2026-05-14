export const GROUP_WORKSPACE_TABS = ['chat', 'journal'] as const

export type GroupWorkspaceTab = typeof GROUP_WORKSPACE_TABS[number]

export interface GroupWorkspaceRouteContext {
  area?: string | null
  flowchartId?: number | string | null
}

export function isGroupWorkspaceTab(tab: string | undefined): tab is GroupWorkspaceTab {
  return tab === 'chat' || tab === 'journal'
}

export function getGroupWorkspacePath(
  groupId: number | string,
  tab: GroupWorkspaceTab,
  context: GroupWorkspaceRouteContext = {}
): string {
  const params = new URLSearchParams()

  if (context.area) params.set('area', context.area)
  if (context.flowchartId != null && context.flowchartId !== '') {
    params.set('flowchartId', String(context.flowchartId))
  }

  const query = params.toString()
  return `/group/${groupId}/${tab}${query ? `?${query}` : ''}`
}
