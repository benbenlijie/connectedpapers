import { ApiError } from './errors'
import { resolvePaperId } from './ids'
import { getWorkByOpenAlexId } from './openalex'

/**
 * Map any accepted paper id to something S2's getPaper understands.
 * OpenAlex-only ids must be turned into a DOI/ARXIV path first.
 */
export async function toS2Input(paperId: string): Promise<string> {
  const resolved = resolvePaperId(paperId)
  if (resolved.kind === 'openalex') {
    const work = await getWorkByOpenAlexId(paperId)
    if (work?.doi) return `DOI:${work.doi}`
    if (work?.arxivId) return `ARXIV:${work.arxivId}`
    throw new ApiError('PAPER_FETCH_FAILED', '该 OpenAlex 论文缺少 DOI，无法构建引用网络', 502)
  }
  return resolved.s2Path
}
