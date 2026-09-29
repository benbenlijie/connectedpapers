import { describe, it, expect } from 'vitest'
import {
  collectBlocks,
  markBlock,
  insertTranslation,
  removeTranslations,
  setTranslationsVisible,
  ensureTranslationStyle,
  SOURCE_ATTR,
  TRANSLATION_ATTR,
} from './readerBlocks'

function doc(html: string): Document {
  return new DOMParser().parseFromString(`<html><body>${html}</body></html>`, 'text/html')
}

describe('collectBlocks', () => {
  it('selects text-bearing blocks and skips empty or numeric-only ones', () => {
    const d = doc('<p>Real sentence here.</p><p>42</p><p>   </p><h2>Intro</h2><li>Item text</li>')
    const texts = collectBlocks(d).map((el) => el.textContent)
    expect(texts).toEqual(['Real sentence here.', 'Intro', 'Item text'])
  })

  it('skips a paragraph nested inside an already-selected block', () => {
    const d = doc('<li>Outer item<p>Inner paragraph text</p></li>')
    const blocks = collectBlocks(d)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].textContent).toBe('Outer itemInner paragraph text')
  })

  it('skips existing translation nodes', () => {
    const d = doc('<p data-cn-for="1">translated text</p><p>Original text</p>')
    expect(collectBlocks(d).map((el) => el.textContent)).toEqual(['Original text'])
  })

  it('returns an empty list for a document with no blocks', () => {
    expect(collectBlocks(doc('<div>no block elements</div>'))).toEqual([])
  })
})

describe('markBlock / insertTranslation', () => {
  it('marks a source block and inserts a sibling translation', () => {
    const d = doc('<p>Hello world</p>')
    const block = collectBlocks(d)[0]
    markBlock(block, '0')
    expect(block.getAttribute(SOURCE_ATTR)).toBe('0')

    const node = insertTranslation(d, block, '0', '你好，世界')
    expect(node.getAttribute(TRANSLATION_ATTR)).toBe('')
    expect(node.textContent).toBe('你好，世界')
    expect(block.nextElementSibling).toBe(node)
  })

  it('inserts table-cell translations inside the cell', () => {
    const d = doc('<table><tr><td>Cell text here</td></tr></table>')
    const cell = collectBlocks(d)[0]
    const node = insertTranslation(d, cell, '0', '单元格')
    expect(cell.contains(node)).toBe(true)
  })
})

describe('removeTranslations / setTranslationsVisible', () => {
  it('removes inserted translations and source markers', () => {
    const d = doc('<p>Hello world</p>')
    const block = collectBlocks(d)[0]
    markBlock(block, '0')
    insertTranslation(d, block, '0', '你好')
    removeTranslations(d)
    expect(d.body.innerHTML).not.toContain('data-cn')
    expect(d.body.innerHTML).toContain('Hello world')
  })

  it('toggles visibility of translation nodes', () => {
    const d = doc('<p>Hello world</p>')
    const block = collectBlocks(d)[0]
    const node = insertTranslation(d, block, '0', '你好')
    setTranslationsVisible(d, false)
    expect((node as HTMLElement).style.display).toBe('none')
    setTranslationsVisible(d, true)
    expect((node as HTMLElement).style.display).toBe('')
  })
})

describe('ensureTranslationStyle', () => {
  it('injects the style tag once', () => {
    const d = doc('<p>Hello world</p>')
    ensureTranslationStyle(d)
    ensureTranslationStyle(d)
    expect(d.querySelectorAll('style[data-cn-style]')).toHaveLength(1)
  })
})
