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
    return [
      `当前「${promptArea}」流程图已通过全部检查。`,
      '请在保持现有功能不变的基础上，优化施工方案表述和 Mermaid 节点命名，使流程更清晰、更工程化。',
      '',
      '要求：',
      '- 保留已有已通过功能',
      '- 不添加未提及的新功能',
      '- 输出完整 Mermaid 流程图',
    ].join('\n')
  }

  const failedLines = failedItems.map((item, index) => {
    const comment = item.result?.comment?.trim()
    return comment
      ? `${index + 1}. ${item.criterion}（检查意见：${comment}）`
      : `${index + 1}. ${item.criterion}`
  })

  return [
    `请基于当前「${promptArea}」流程图进行修改，只补充以下未通过的功能点：`,
    ...failedLines,
    '',
    '要求：',
    '- 保留已有已通过功能',
    '- 不添加未提及的新功能',
    '- 每条新增或修改的功能都体现：感知设备 → 判定逻辑 → 执行动作 → 展示/联动效果',
    '- 输出完整 Mermaid 流程图',
  ].join('\n')
}
