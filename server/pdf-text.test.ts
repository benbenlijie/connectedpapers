import { test, expect } from 'bun:test'
import { PDF_FIXTURE_PATH, pdfFixtureBytes, pdfFixtureResponse } from './test-fixtures'
import {
  MAX_PDF_BYTES,
  PdfTextUnavailable,
  pdfToText,
  sectionsFromPdfText,
  titleFromPdfText,
} from './pdf-text'

type Unpdf = typeof import('unpdf')

function fakeUnpdf(overrides: Partial<{ text: string; reject: string }> = {}): Unpdf {
  return {
    getDocumentProxy: async () => ({
      cleanup: async () => {},
    }),
    extractText: async () => {
      if (overrides.reject) throw new Error(overrides.reject)
      return { text: overrides.text ?? 'hello', totalPages: 1 }
    },
  } as unknown as Unpdf
}

test('pdfToText reads the text layer through unpdf', async () => {
  const text = await pdfToText(pdfFixtureBytes())
  expect(text).toContain('I. INTRODUCTION')
  expect(text).toContain('Graph neural networks')
})

test('pdfToText rejects an empty buffer', async () => {
  await expect(pdfToText(new Uint8Array(0), { importer: async () => fakeUnpdf() })).rejects.toThrow(
    PdfTextUnavailable,
  )
})

test('pdfToText skips oversized files without parsing them', async () => {
  const huge = new Uint8Array(MAX_PDF_BYTES + 1)
  await expect(pdfToText(huge, { importer: async () => fakeUnpdf() })).rejects.toThrow(/too large/)
})

test('pdfToText reports a PDF with no text layer', async () => {
  await expect(
    pdfToText(pdfFixtureBytes(), { importer: async () => fakeUnpdf({ text: '   ' }) }),
  ).rejects.toThrow(/text layer/)
})

test('the fixture itself is readable as a PDF', async () => {
  const bytes = pdfFixtureBytes()
  expect(bytes.byteLength).toBeGreaterThan(500)
  expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  expect(PDF_FIXTURE_PATH).toContain('mini-paper.pdf')
})

test('sectionsFromPdfText splits on numbered and lettered headings', () => {
  const sections = sectionsFromPdfText(
    [
      'XXX-X-XXXX-XXXX-X/XX/$XX.00 ©20XX IEEE',
      'Accelerating PageRank Algorithmic Tasks with',
      'a new Programmable Hardware Architecture',
      'Abstract— Addressing the growing demands of AI.',
      'I. INTRODUCTION',
      'With the rapid growth of artificial intelligence,',
      'researchers are increasingly leveraging its capabil-',
      'ities in bioinformatics.',
      'II. HARDWARE ARCHITECTURE',
      'A. Programmability',
      'Our innovation is a programmable computing architecture.',
      'Figure 1 (A) Overview of the architecture',
    ].join('\n'),
  )

  expect(sections.map((s) => s.heading)).toEqual([
    '',
    'Abstract',
    'Introduction',
    'Hardware Architecture',
    'Programmability',
  ])
  const intro = sections.find((s) => s.heading === 'Introduction')!
  // Hyphenated line breaks are repaired, figure captions are dropped.
  expect(intro.text).toContain('capabilities in bioinformatics')
  expect(sections.some((s) => s.text.includes('Figure 1'))).toBe(false)
  const abstract = sections.find((s) => s.heading === 'Abstract')!
  expect(abstract.text).toBe('Addressing the growing demands of AI.')
  // idx values stay contiguous after the empty-text filter.
  expect(sections.map((s) => s.idx)).toEqual([0, 1, 2, 3, 4])
})

test('sectionsFromPdfText drops running headers and page numbers', () => {
  const sections = sectionsFromPdfText(
    [
      'Author et al.: A Paper Title',
      '1. First Section',
      'Body of the first section.',
      '12',
      'Author et al.: A Paper Title',
      'Body continues here.',
      'Author et al.: A Paper Title',
      '2. Second Section',
      'Body of the second section.',
    ].join('\n'),
  )
  expect(sections.some((s) => s.text.includes('Author et al'))).toBe(false)
  expect(sections.find((s) => s.heading === 'First Section')?.text).toBe(
    'Body of the first section. Body continues here.',
  )
})

test('sectionsFromPdfText does not treat author lines as headings', () => {
  const sections = sectionsFromPdfText(
    ['1. Introduction', 'A. Smith et al. reported this in 2019.', 'The results are clear.'].join('\n'),
  )
  expect(sections.map((s) => s.heading)).toEqual(['Introduction'])
  expect(sections[0].text).toBe('A. Smith et al. reported this in 2019. The results are clear.')
})

test('sectionsFromPdfText returns nothing for empty input', () => {
  expect(sectionsFromPdfText('')).toEqual([])
  expect(sectionsFromPdfText('   \n  \n')).toEqual([])
})

test('titleFromPdfText keeps the title lines and skips furniture', () => {
  const text = [
    'XXX-X-XXXX-XXXX-X/XX/$XX.00 ©20XX IEEE',
    'Accelerating PageRank Algorithmic Tasks with',
    'a new Programmable Hardware Architecture',
    'A. Example, B. Sample',
    'Example University',
    'authors@example.edu',
    'Abstract— Addressing the growing demands.',
  ].join('\n')
  expect(titleFromPdfText(text)).toBe(
    'Accelerating PageRank Algorithmic Tasks with a new Programmable Hardware Architecture',
  )
  expect(titleFromPdfText('')).toBe('')
})
