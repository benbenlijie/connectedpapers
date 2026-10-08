import { describe, it, expect } from 'vitest'
import { anchorElement, highlightTargets, paint, repaintTranslations, restoreHighlights } from './readerHighlights'
import {
  failPendingTranslations,
  insertPlaceholder,
  insertTranslation,
  markBlock,
  toggleTranslation,
  updateTranslation,
} from './readerBlocks'
import type { Highlight } from './highlights'

const ARTICLE = '<p>Hello world</p><p>Second block</p>'

function doc(html: string = ARTICLE): Document {
  return new DOMParser().parseFromString(`<html><body>${html}</body></html>`, 'text/html')
}

function sourceBlocks(d: Document): Element[] {
  return Array.from(d.querySelectorAll('p'))
}

function translation(d: Document, block: Element, id: string, text: string): HTMLElement {
  markBlock(block, id)
  return insertTranslation(d, block, id, text) as HTMLElement
}

const sourceHl: Highlight = { id: 's1', blockIndex: 0, start: 0, end: 5, text: 'Hello', color: 'yellow' }
const translationHl: Highlight = {
  id: 't1',
  blockIndex: 0,
  start: 0,
  end: 2,
  surface: 'translation',
  text: '你好',
  color: 'green',
}

describe('anchorElement', () => {
  it('resolves a source anchor to its block and rejects a missing index', () => {
    const d = doc()
    const blocks = sourceBlocks(d)
    expect(anchorElement(d, blocks, sourceHl)).toBe(blocks[0])
    expect(anchorElement(d, blocks, { ...sourceHl, blockIndex: 9 })).toBeNull()
  })

  it('resolves a translation anchor only while the node is ready', () => {
    const d = doc()
    const blocks = sourceBlocks(d)
    markBlock(blocks[0], '0')
    const node = insertPlaceholder(d, blocks[0], '0') as HTMLElement

    expect(anchorElement(d, blocks, translationHl)).toBeNull()
    updateTranslation(d, '0', '你好，世界')
    expect(anchorElement(d, blocks, translationHl)).toBe(node)

    toggleTranslation(node)
    expect(anchorElement(d, blocks, translationHl)).toBeNull()
    toggleTranslation(node)
    expect(anchorElement(d, blocks, translationHl)).toBe(node)
  })

  it('ignores a failed translation node', () => {
    const d = doc()
    const blocks = sourceBlocks(d)
    markBlock(blocks[0], '0')
    insertPlaceholder(d, blocks[0], '0')
    failPendingTranslations(d)
    expect(anchorElement(d, blocks, translationHl)).toBeNull()
  })
})

describe('highlightTargets', () => {
  it('lists the translation node before the source block that contains it', () => {
    const d = doc('<table><tr><td>Cell text</td></tr></table>')
    const cell = d.querySelector('td')!
    const node = insertTranslation(d, cell, '0', '单元格') as HTMLElement

    const targets = highlightTargets(d, [cell])
    expect(targets[0]).toMatchObject({ element: node, blockIndex: 0, surface: 'translation' })
    expect(targets[1]).toMatchObject({ element: cell, blockIndex: 0 })
  })

  it('skips translation nodes that are not ready to be annotated', () => {
    const d = doc()
    const blocks = sourceBlocks(d)
    markBlock(blocks[0], '0')
    insertPlaceholder(d, blocks[0], '0')
    expect(highlightTargets(d, blocks)).toHaveLength(blocks.length)
  })
})

describe('paint / restoreHighlights', () => {
  it('paints each highlight onto its own layer', () => {
    const d = doc()
    const blocks = sourceBlocks(d)
    translation(d, blocks[0], '0', '你好，世界')

    expect(paint(d, blocks, sourceHl)).toBe(true)
    expect(paint(d, blocks, translationHl)).toBe(true)
    expect(d.querySelector('mark[data-hl-id="s1"]')?.textContent).toBe('Hello')
    expect(d.querySelector('mark[data-hl-id="t1"]')?.textContent).toBe('你好')
  })

  it('repaints over the translations restored on iframe load', () => {
    const d = doc()
    const blocks = sourceBlocks(d)
    translation(d, blocks[0], '0', '你好，世界')

    restoreHighlights(d, blocks, [sourceHl, translationHl])
    expect(d.querySelectorAll('mark[data-hl-id]')).toHaveLength(2)

    // A second restore must not nest marks (a reload reuses the same nodes).
    restoreHighlights(d, blocks, [sourceHl, translationHl])
    expect(d.querySelectorAll('mark[data-hl-id]')).toHaveLength(2)
    expect(blocks[0].textContent).toBe('Hello world')
  })

  it('drops a stale mark when its translation node is gone', () => {
    const d = doc()
    const blocks = sourceBlocks(d)
    translation(d, blocks[0], '0', '你好，世界')
    paint(d, blocks, translationHl)

    d.querySelector('.cn-translation')?.remove()
    restoreHighlights(d, blocks, [translationHl])
    expect(d.querySelector('mark[data-hl-id="t1"]')).toBeNull()
  })

  it('leaves both layers empty when nothing is stored', () => {
    const d = doc()
    restoreHighlights(d, sourceBlocks(d), [])
    expect(d.querySelector('mark')).toBeNull()
  })
})

describe('repaintTranslations', () => {
  it('only repaints translation highlights in the given block indices', () => {
    const d = doc()
    const blocks = sourceBlocks(d)
    translation(d, blocks[0], '0', '你好，世界')
    translation(d, blocks[1], '1', '第二段')

    const list: Highlight[] = [
      sourceHl,
      translationHl,
      { ...translationHl, id: 't2', blockIndex: 1, text: '第二' },
    ]
    repaintTranslations(d, blocks, list, [0])
    expect(d.querySelector('mark[data-hl-id="t1"]')?.textContent).toBe('你好')
    expect(d.querySelector('mark[data-hl-id="t2"]')).toBeNull()
    expect(d.querySelector('mark[data-hl-id="s1"]')).toBeNull()
  })

  it('does nothing for an empty index set', () => {
    const d = doc()
    const blocks = sourceBlocks(d)
    translation(d, blocks[0], '0', '你好，世界')
    repaintTranslations(d, blocks, [translationHl], [])
    expect(d.querySelector('mark')).toBeNull()
  })
})
