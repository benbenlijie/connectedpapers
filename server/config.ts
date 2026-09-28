import { env } from './env'

const num = (v: string | undefined, d: number) => (v ? Number(v) : d)

export const config = {
  crawl: {
    maxExecutionMs: num(Bun.env.CRAWL_MAX_MS, 45000),
    s2BatchSize: num(Bun.env.S2_BATCH_SIZE, 100),
    perBatchDelayMs: num(Bun.env.S2_BATCH_DELAY_MS, 1000),
    maxNodes: num(Bun.env.CRAWL_MAX_NODES, 200),
    defaultDepth: num(Bun.env.CRAWL_DEPTH, 2),
    refLimit: [12, 8, 5, 3] as const,
    citeLimit: [10, 5, 2, 0] as const,
  },
  cache: {
    networkTtlHours: num(Bun.env.NETWORK_TTL_HOURS, 24),
    paperTtlHours: num(Bun.env.PAPER_TTL_HOURS, 168),
    graphVersion: 1,
  },
  s2: {
    base: 'https://api.semanticscholar.org/graph/v1',
    apiKey: env.semanticScholarApiKey,
    contactEmail: env.contactEmail,
  },
  openalex: { base: 'https://api.openalex.org' },
  arxiv: { base: 'http://export.arxiv.org/api' },
  server: { port: env.port, hostname: env.hostname },
} as const
