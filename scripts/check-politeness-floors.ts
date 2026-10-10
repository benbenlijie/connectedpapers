/**
 * Network-free guard: the default upstream spacing in server/config.ts must
 * stay at or above each source's published floor.
 *
 * Run: bun run scripts/check-politeness-floors.ts
 * Wired into CI via .github/workflows/ci.yml.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Floor = {
  /** Human label for the check failure message. */
  name: string
  /** Env var whose default in config.ts we assert. */
  env: string
  /** Minimum allowed default (ms). */
  floorMs: number
  /** Where the floor is published. */
  sourceUrl: string
  /** Optional note when the floor is a project policy, not a literal vendor rule. */
  note?: string
}

/**
 * Published (or project-policy) floors. Keep the source URL next to each number
 * so a future change can be argued against the same document.
 */
const FLOORS: Floor[] = [
  {
    name: 'arXiv API',
    env: 'ARXIV_API_MIN_INTERVAL_MS',
    floorMs: 3000,
    sourceUrl: 'https://info.arxiv.org/help/api/tou.html',
    note: 'Terms: at most one request every three seconds, single connection.',
  },
  {
    name: 'arXiv paper-page content',
    env: 'ARXIV_CONTENT_MIN_INTERVAL_MS',
    // robots.txt asks crawlers for Crawl-delay: 15. This app is not a crawler
    // (one page per user open, then cache), so the project policy floor is 1000.
    // Raise the default to 15000 for a literal robots.txt reading.
    floorMs: 1000,
    sourceUrl: 'https://arxiv.org/robots.txt',
    note: 'Project politeness floor (1000 ms). robots.txt Crawl-delay is 15 s for crawlers.',
  },
  {
    name: 'Semantic Scholar anonymous',
    env: 'S2_MIN_INTERVAL_MS',
    // Default when no API key: 1000. Keyed default (100) is a separate branch
    // in config.ts and is checked below via the ternary parse.
    floorMs: 1000,
    sourceUrl: 'https://www.semanticscholar.org/product/api',
    note: 'Anonymous shared-pool spacing used when SEMANTIC_SCHOLAR_API_KEY is unset.',
  },
  {
    name: 'OpenAlex',
    env: 'OPENALEX_MIN_INTERVAL_MS',
    floorMs: 200,
    sourceUrl: 'https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication',
    note: 'Default polite-pool spacing (mailto / API key raise the effective quota).',
  },
]

const configPath = resolve(import.meta.dir, '..', 'server', 'config.ts')
const source = readFileSync(configPath, 'utf8')

function defaultFor(env: string): number | null {
  // Plain: num(Bun.env.FOO, 3000)
  const plain = new RegExp(
    String.raw`num\(\s*Bun\.env\.${env}\s*,\s*(\d+)\s*\)`,
  )
  const plainMatch = source.match(plain)
  if (plainMatch) return Number(plainMatch[1])

  // S2 keyed ternary: num(Bun.env.S2_MIN_INTERVAL_MS, env.semanticScholarApiKey ? 100 : 1000)
  const ternary = new RegExp(
    String.raw`num\(\s*Bun\.env\.${env}\s*,\s*[^?]+?\?\s*(\d+)\s*:\s*(\d+)\s*\)`,
  )
  const ternaryMatch = source.match(ternary)
  if (ternaryMatch) {
    // Return the anonymous (false-branch) default; keyed is checked separately.
    return Number(ternaryMatch[2])
  }

  return null
}

function keyedS2Default(): number | null {
  const ternary = /num\(\s*Bun\.env\.S2_MIN_INTERVAL_MS\s*,\s*[^?]+?\?\s*(\d+)\s*:\s*(\d+)\s*\)/
  const m = source.match(ternary)
  return m ? Number(m[1]) : null
}

const failures: string[] = []

for (const floor of FLOORS) {
  const actual = defaultFor(floor.env)
  if (actual === null) {
    failures.push(
      `${floor.name}: could not find default for ${floor.env} in server/config.ts`,
    )
    continue
  }
  if (actual < floor.floorMs) {
    failures.push(
      `${floor.name}: default ${actual} ms is below published floor ${floor.floorMs} ms ` +
        `(${floor.env}). Source: ${floor.sourceUrl}` +
        (floor.note ? ` — ${floor.note}` : ''),
    )
  } else {
    console.log(
      `ok  ${floor.name}: default ${actual} ms >= floor ${floor.floorMs} ms (${floor.sourceUrl})`,
    )
  }
}

// Keyed S2 default must stay at or above 100 ms (1 req/s with a key).
const keyed = keyedS2Default()
const keyedFloor = 100
if (keyed === null) {
  failures.push('Semantic Scholar keyed: could not parse keyed default in server/config.ts')
} else if (keyed < keyedFloor) {
  failures.push(
    `Semantic Scholar keyed: default ${keyed} ms is below floor ${keyedFloor} ms ` +
      `(S2_MIN_INTERVAL_MS with API key). Source: https://www.semanticscholar.org/product/api`,
  )
} else {
  console.log(
    `ok  Semantic Scholar keyed: default ${keyed} ms >= floor ${keyedFloor} ms ` +
      `(https://www.semanticscholar.org/product/api)`,
  )
}

if (failures.length) {
  console.error('\nPoliteness floor check failed:')
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}

console.log('\nAll upstream politeness floors hold.')
