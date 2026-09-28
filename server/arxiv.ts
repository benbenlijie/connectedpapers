import { config } from './config'

export async function getArxiv(arxivId: string): Promise<{ title: string; abstract: string; year: number; authors: string[]; url: string; pdfUrl: string }> {
  const base = arxivId.replace(/v\d+$/, '')
  const res = await fetch(`${config.arxiv.base}/query?id_list=${base}`, { headers: { 'User-Agent': 'Academic-Paper-Explorer/1.0' } })
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
