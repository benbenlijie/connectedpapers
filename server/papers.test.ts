import { test, expect, describe, beforeEach } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { openDb } from './db'
import { getPaper, upsertPaper, ensurePaperStub } from './papers'

let database: Database

beforeEach(() => {
  database = openDb(':memory:')
})

describe('getPaper', () => {
  test('returns null for an unknown id', () => {
    expect(getPaper('nope', database)).toBeNull()
  })

  test('replays the stored S2 payload, references and citations included', () => {
    // `upsertPaper` keeps the payload in `raw`; replaying it is what lets a
    // rate-limited /api/connect answer from cache.
    upsertPaper(
      {
        paperId: 'A',
        title: '论文甲',
        year: 2021,
        citationCount: 7,
        references: [{ paperId: 'X', title: '共同祖先' }],
        citations: [{ paperId: 'M', title: '综述' }],
        fieldsOfStudy: ['NLP'],
      },
      database,
    )

    const paper = getPaper('A', database)!
    expect(paper.paperId).toBe('A')
    expect(paper.title).toBe('论文甲')
    expect(paper.year).toBe(2021)
    expect(paper.citationCount).toBe(7)
    expect(paper.references?.map((r) => r.paperId)).toEqual(['X'])
    expect(paper.citations?.map((c) => c.paperId)).toEqual(['M'])
    expect(paper.fieldsOfStudy).toEqual(['NLP'])
  })

  test('finds a paper by its DOI, arXiv id or S2 id', () => {
    upsertPaper({ paperId: 'A', title: '论文甲', externalIds: { DOI: '10.1/x', ArXiv: '2101.00001' } }, database)
    expect(getPaper('10.1/x', database)?.paperId).toBe('A')
    expect(getPaper('2101.00001', database)?.paperId).toBe('A')
    expect(getPaper('A', database)?.paperId).toBe('A')
  })

  test('rebuilds a paper from columns when raw is unusable', () => {
    upsertPaper({ paperId: 'A', title: '论文甲', year: 2019, citationCount: 3 }, database)
    database.run('update papers set raw = ? where id = ?', ['not json', 'A'])

    const paper = getPaper('A', database)!
    expect(paper.paperId).toBe('A')
    expect(paper.title).toBe('论文甲')
    expect(paper.year).toBe(2019)
    expect(paper.citationCount).toBe(3)
  })

  test('reads the stub rows the graph builder leaves behind', () => {
    ensurePaperStub('STUB', database)
    const paper = getPaper('STUB', database)!
    expect(paper.paperId).toBe('STUB')
    expect(paper.title).toBe('STUB')
    expect(paper.authors).toEqual([])
  })
})
