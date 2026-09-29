import { chat, type ChatMessage, type ProviderConfig } from './llm'

export function buildTranslateMessages(target: string, texts: string[], source?: string): ChatMessage[] {
  const from = source ? ` from ${source}` : ''
  return [
    {
      role: 'system',
      content:
        `You are a professional translation engine. Translate each segment${from} into ${target}. ` +
        'Preserve technical terms, formulas, citations, numbers and code. ' +
        'Return ONLY a JSON array of strings with exactly the same length and order as the input. ' +
        'Do not add prose or code fences.',
    },
    { role: 'user', content: JSON.stringify(texts) },
  ]
}

export function parseTranslationArray(content: string, expected: number): string[] {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('译文不是有效的 JSON 数组')
  }
  if (!Array.isArray(parsed) || parsed.length !== expected || parsed.some((x) => typeof x !== 'string')) {
    throw new Error('译文数组的长度或元素类型与输入不匹配')
  }
  return parsed as string[]
}

export async function translateTexts(
  provider: ProviderConfig,
  texts: string[],
  target: string,
  source?: string,
): Promise<string[]> {
  const content = await chat(provider, buildTranslateMessages(target, texts, source), { temperature: 0 })
  return parseTranslationArray(content, texts.length)
}
