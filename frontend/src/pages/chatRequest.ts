export function buildChatRequestPayload(area: string, text: string) {
  return {
    message: `请为「${area}」功能模块生成流程图。\n用户需求：${text}`,
    area,
    userPrompt: text,
  }
}
