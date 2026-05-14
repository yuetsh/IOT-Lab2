export function shouldClearJournalPlacementsForFlowchartChange(
  previousCode: string | null,
  nextCode: string | null
) {
  return previousCode !== null && nextCode !== null && previousCode !== nextCode
}
