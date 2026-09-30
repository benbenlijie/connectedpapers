import { chat, type ChatMessage, type ProviderConfig } from './llm'
import { config } from './config'

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

/** Split texts into sub-batches bounded by char budget and item count. An
 * oversized single text is kept alone so no segment is ever dropped. */
export function chunkTexts(texts: string[], maxChars: number, maxTexts: number): string[][] {
  const out: string[][] = []
  let cur: string[] = []
  let chars = 0
  for (const text of texts) {
    if (cur.length > 0 && (cur.length >= maxTexts || chars + text.length > maxChars)) {
      out.push(cur)
      cur = []
      chars = 0
    }
    cur.push(text)
    chars += text.length
  }
  if (cur.length > 0) out.push(cur)
  return out
}

export async function translateTexts(
  provider: ProviderConfig,
  texts: string[],
  target: string,
  source?: string,
): Promise<string[]> {
  const batches = chunkTexts(texts, config.llm.translateBatchChars, config.llm.translateBatchTexts)
  const out: string[] = []
  for (const batch of batches) {
    const content = await chat(provider, buildTranslateMessages(target, batch, source), {
      temperature: 0,
      timeoutMs: config.llm.translateTimeoutMs,
    })
    out.push(...parseTranslationArray(content, batch.length))
  }
  return out
}
