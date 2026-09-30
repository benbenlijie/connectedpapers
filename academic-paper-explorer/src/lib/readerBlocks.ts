export const BLOCK_SELECTOR = 'p, li, blockquote, figcaption, h2, h3, h4, td'
export const SOURCE_ATTR = 'data-cn-src'
export const TRANSLATION_ATTR = 'data-cn-translation'
export const TRANSLATION_FOR_ATTR = 'data-cn-for'
const TRANSLATION_FULL_ATTR = 'data-cn-full'
const COLLAPSED_CLASS = 'cn-translation--collapsed'
const COLLAPSED_LABEL = '译文已折叠，点击展开'
const PENDING_CLASS = 'cn-translation--pending'
const PENDING_LABEL = '翻译中…'
const FAILED_LABEL = '翻译失败'

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

/** Insert (or reuse) a per-block placeholder so each segment shows immediate
 * feedback while its translation is still in flight. */
export function insertPlaceholder(doc: Document, block: Element, id: string): Element {
  let node = doc.querySelector<HTMLElement>(`[${TRANSLATION_FOR_ATTR}="${id}"]`)
  if (!node) node = insertTranslation(doc, block, id, '') as HTMLElement
  node.classList.remove(COLLAPSED_CLASS)
  node.removeAttribute(TRANSLATION_FULL_ATTR)
  node.classList.add(PENDING_CLASS)
  node.textContent = PENDING_LABEL
  return node
}

/** Fill in a placeholder with its finished translation. */
export function updateTranslation(doc: Document, id: string, text: string): void {
  const node = doc.querySelector<HTMLElement>(`[${TRANSLATION_FOR_ATTR}="${id}"]`)
  if (!node) return
  node.classList.remove(PENDING_CLASS)
  node.classList.remove(COLLAPSED_CLASS)
  node.removeAttribute(TRANSLATION_FULL_ATTR)
  node.textContent = text
}

/** Mark any still-pending placeholders as failed, keeping finished segments. */
export function failPendingTranslations(doc: Document): void {
  doc.querySelectorAll<HTMLElement>(`[${TRANSLATION_ATTR}].${PENDING_CLASS}`).forEach((el) => {
    el.classList.remove(PENDING_CLASS)
    el.textContent = FAILED_LABEL
  })
}

export function removeTranslations(doc: Document): void {
  doc.querySelectorAll(`[${TRANSLATION_ATTR}]`).forEach((el) => el.remove())
  doc.querySelectorAll(`[${SOURCE_ATTR}]`).forEach((el) => el.removeAttribute(SOURCE_ATTR))
}

/** Fold/unfold a single translation node. Collapsed nodes keep a visible
 * placeholder so the toggle can be reversed with another click. */
export function toggleTranslation(node: HTMLElement): void {
  if (node.classList.contains(COLLAPSED_CLASS)) {
    const full = node.getAttribute(TRANSLATION_FULL_ATTR)
    node.classList.remove(COLLAPSED_CLASS)
    if (full !== null) {
      node.textContent = full
      node.removeAttribute(TRANSLATION_FULL_ATTR)
    }
  } else {
    node.setAttribute(TRANSLATION_FULL_ATTR, node.textContent ?? '')
    node.classList.add(COLLAPSED_CLASS)
    node.textContent = COLLAPSED_LABEL
  }
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
    'background:rgba(96,165,250,.08);color:#1f2937;font-size:15px;line-height:1.7;border-radius:4px;cursor:pointer}' +
    `.cn-translation.${COLLAPSED_CLASS}{padding:4px 10px;font-size:12px;color:#6b7280;font-style:italic;` +
    'background:rgba(107,114,128,.08);border-left-color:#9ca3af}' +
    `.cn-translation.${PENDING_CLASS}{color:#9ca3af;font-style:italic;` +
    'background:rgba(156,163,175,.10);border-left-color:#d1d5db}'
  doc.head.appendChild(style)
}
