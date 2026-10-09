import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * A hand-written one-page PDF (`mini-paper.pdf`, <1KB) with a title, two
 * numbered sections, a lettered subsection and a references block. It exists so
 * the PDF fallback can be tested end-to-end through the real parser without
 * committing a multi-megabyte paper.
 */
export const PDF_FIXTURE_PATH = fileURLToPath(new URL('./fixtures/mini-paper.pdf', import.meta.url))

export function pdfFixtureBytes(): Uint8Array {
  return new Uint8Array(readFileSync(PDF_FIXTURE_PATH))
}

export function pdfFixtureResponse(): Response {
  return new Response(pdfFixtureBytes(), { status: 200, headers: { 'Content-Type': 'application/pdf' } })
}
