type CheckResult = {
  passed: boolean
  comment: string
}

type BuildFixPromptInput = {
  area: string
  criteria: string[]
  results: CheckResult[]
}

export function hasFailedCheckResults(results: CheckResult[] | null): boolean {
  return !!results?.some(result => !result.passed)
}

function getPromptAreaName(area: string): string {
  return area.replace(/(安防|区域)$/, '')
}

export function buildFixPrompt({ area, criteria, results }: BuildFixPromptInput): string {
  const promptArea = getPromptAreaName(area)
  const failedItems = criteria
    .map((criterion, index) => ({ criterion, result: results[index] }))
    .filter(item => !item.result?.passed)

  if (failedItems.length === 0) {
    return `当前「${promptArea}」流程图已通过全部检查，请优化节点描述和步骤表达，使流程更清晰工程化。`
  }

  const count = failedItems.length === 1 ? 1 : Math.random() < 0.5 ? 1 : 2
  const selected = failedItems.slice(0, count)
  const lines = selected.map((item, i) => {
    return `${i + 1}. ${item.criterion}`
  })

  return `请在当前「${promptArea}」流程图的基础上修改，可以保留现有节点，仅新增以下功能步骤：\n${lines.join('\n')}`
}
