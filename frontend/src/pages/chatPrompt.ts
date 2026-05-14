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

  const failedLines = failedItems.map((item, index) => {
    const comment = item.result?.comment?.trim()
    return comment
      ? `${index + 1}. ${item.criterion}（检查意见：${comment}）`
      : `${index + 1}. ${item.criterion}`
  })

  return [
    `请基于当前「${promptArea}」流程图进行修改，补充以下未通过的功能点：`,
    ...failedLines,
  ].join('\n')
}
