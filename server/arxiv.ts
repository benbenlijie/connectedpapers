import { config } from './config'
import { createLimiter } from './rateLimit'

/** Identify ourselves and give arXiv a way to reach a human, as their terms ask. */
const USER_AGENT = 'CiteDuo/0.1.0 (+https://github.com/benbenlijie/citeduo)'

/**
 * arXiv API terms of use: "make no more than one request every three seconds,
 * and limit requests to a single connection at a time."
 * https://info.arxiv.org/help/api/tou.html
 */
const limiter = createLimiter(config.arxiv.apiMinIntervalMs)

export async function getArxiv(arxivId: string): Promise<{ title: string; abstract: string; year: number; authors: string[]; url: string; pdfUrl: string }> {
  const base = arxivId.replace(/v\d+$/, '')
  const res = await limiter(() =>
    fetch(`${config.arxiv.base}/query?id_list=${base}`, { headers: { 'User-Agent': USER_AGENT } }),
  )
  if (!res.ok) throw new Error(`arXiv ${res.status}`)
  const xml = await res.text()
  const title = xml.match(/<entry>[\s\S]*?<title>([\s\S]+?)<\/title>/)?.[1]?.trim()
  if (!title) throw new Error('无法从 arXiv 解析条目')
  const abstract = (xml.match(/<summary>([\s\S]+?)<\/summary>/)?.[1] ?? '').replace(/\s+/g, ' ').trim()
  const published = xml.match(/<published>(.+?)<\/published>/)?.[1]
  const authors = [...xml.matchAll(/<author>\s*<name>(.+?)<\/name>/g)].map((m) => m[1].trim())
  return {
    title,
    abstract,
    year: published ? new Date(published).getFullYear() : new Date().getFullYear(),
    authors,
    url: `https://arxiv.org/abs/${base}`,
    pdfUrl: `https://arxiv.org/pdf/${base}.pdf`,
  }
}
