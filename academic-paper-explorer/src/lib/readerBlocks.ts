export const BLOCK_SELECTOR = 'p, li, blockquote, figcaption, h2, h3, h4, td'
export const SOURCE_ATTR = 'data-cn-src'
export const TRANSLATION_ATTR = 'data-cn-translation'
export const TRANSLATION_FOR_ATTR = 'data-cn-for'

const HAS_LETTER = /[A-Za-z\u00C0-\u024F\u0400-\u04FF]/

export function isTranslatableBlock(el: Element): boolean {
  if (el.hasAttribute(TRANSLATION_FOR_ATTR) || el.hasAttribute(TRANSLATION_ATTR)) return false
  const text = (el.textContent ?? '').trim()
  if (text.length < 2) return false
  if (!HAS_LETTER.test(text)) return false
  return true
}

export function collectBlocks(doc: Document): Element[] {
  const out: Element[] = []
  for (const el of Array.from(doc.querySelectorAll(BLOCK_SELECTOR))) {
    if (!isTranslatableBlock(el)) continue
    if (out.some((parent) => parent !== el && parent.contains(el))) continue
    out.push(el)
  }
  return out
}

export function markBlock(el: Element, id: string): void {
  el.setAttribute(SOURCE_ATTR, id)
}

export function insertTranslation(doc: Document, block: Element, id: string, text: string): Element {
  const node = doc.createElement('div')
  node.setAttribute(TRANSLATION_ATTR, '')
  node.setAttribute(TRANSLATION_FOR_ATTR, id)
  node.className = 'cn-translation'
  node.textContent = text
  if (block.tagName === 'TD' || block.tagName === 'TH') block.appendChild(node)
  else block.insertAdjacentElement('afterend', node)
  return node
}

export function removeTranslations(doc: Document): void {
  doc.querySelectorAll(`[${TRANSLATION_ATTR}]`).forEach((el) => el.remove())
  doc.querySelectorAll(`[${SOURCE_ATTR}]`).forEach((el) => el.removeAttribute(SOURCE_ATTR))
}

export function setTranslationsVisible(doc: Document, visible: boolean): void {
  doc.querySelectorAll<HTMLElement>(`[${TRANSLATION_ATTR}]`).forEach((el) => {
    el.style.display = visible ? '' : 'none'
  })
}

export function ensureTranslationStyle(doc: Document): void {
  if (doc.querySelector('style[data-cn-style]')) return
  const style = doc.createElement('style')
  style.setAttribute('data-cn-style', '')
  style.textContent =
    '.cn-translation{margin:6px 0 14px;padding:8px 10px;border-left:3px solid #60a5fa;' +
    'background:rgba(96,165,250,.08);color:#1f2937;font-size:15px;line-height:1.7;border-radius:4px;cursor:pointer}'
  doc.head.appendChild(style)
}
