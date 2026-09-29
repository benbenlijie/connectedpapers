import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, FileText, Loader2, Languages, Sparkles, Send } from 'lucide-react'
import {
  arxivAbsUrl,
  arxivHtmlUrl,
  arxivPdfUrl,
  extractOutline,
  sanitizeArticleHtml,
  type OutlineItem,
} from '../lib/article'
import { fetchProviders, translate, chunk, type PublicProvider } from '../lib/translator'
import { askAi, type AiAction } from '../lib/ai'
import { useReadingStore } from '../store/useReadingStore'
import { READING_STATUSES, type ReadingStatus } from '../lib/reading'
import { useHighlightsStore } from '../store/useHighlightsStore'
import {
  anchorToRange,
  applyHighlight,
  clearHighlights,
  rangeToAnchor,
  removeHighlightNodes,
  HIGHLIGHT_COLORS,
  type HighlightAnchor,
  type HighlightColor,
} from '../lib/highlights'
import {
  collectBlocks,
  ensureTranslationStyle,
  insertTranslation,
  markBlock,
  removeTranslations,
  SOURCE_ATTR,
  TRANSLATION_ATTR,
} from '../lib/readerBlocks'

type Status = 'loading' | 'ready' | 'error'

const TARGETS: { value: string; label: string }[] = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

const BATCH_SIZE = 15

const ReaderPage: React.FC = () => {
  const { arxivId } = useParams<{ arxivId: string }>()
  const [searchParams] = useSearchParams()
  const readingKey = searchParams.get('pid') || arxivId || ''
  const readingEntry = useReadingStore((s) => s.entries[readingKey])
  const setReadingStatus = useReadingStore((s) => s.setStatus)
  const navigate = useNavigate()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const cancelRef = useRef(false)
  const [status, setStatus] = useState<Status>('loading')
  const [html, setHtml] = useState('')
  const [outline, setOutline] = useState<OutlineItem[]>([])

  const [providers, setProviders] = useState<PublicProvider[]>([])
  const [providersReady, setProvidersReady] = useState(false)
  const [target, setTarget] = useState('zh')
  const [translated, setTranslated] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [translateError, setTranslateError] = useState<string | null>(null)

  const [aiOpen, setAiOpen] = useState(false)
  const [selection, setSelection] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const blocksRef = useRef<Element[]>([])
  const [pendingAnchor, setPendingAnchor] = useState<HighlightAnchor | null>(null)
  const [pendingText, setPendingText] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [activeHl, setActiveHl] = useState<string | null>(null)
  const addHighlight = useHighlightsStore((s) => s.addHighlight)
  const deleteHighlight = useHighlightsStore((s) => s.deleteHighlight)

  useEffect(() => {
    if (!arxivId) {
      setStatus('error')
      return
    }
    let cancelled = false
    setStatus('loading')
    fetch(arxivHtmlUrl(arxivId))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((raw) => {
        if (cancelled) return
        const clean = sanitizeArticleHtml(raw)
        setHtml(clean)
        setOutline(extractOutline(clean))
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [arxivId])

  useEffect(() => {
    let cancelled = false
    fetchProviders()
      .then((list) => {
        if (!cancelled) setProviders(list)
      })
      .catch(() => {
        if (!cancelled) setProviders([])
      })
      .finally(() => {
        if (!cancelled) setProvidersReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (status !== 'ready' || !readingKey) return
    const current = useReadingStore.getState().entries[readingKey]?.status
    if (current !== 'done' && current !== 'reading') {
      useReadingStore.getState().setStatus(readingKey, 'reading')
    }
  }, [status, readingKey])

  const jumpTo = useCallback((id: string) => {
    frameRef.current?.contentDocument?.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleFrameLoad = useCallback(() => {
    const doc = frameRef.current?.contentDocument
    if (!doc) return
    const bs = collectBlocks(doc)
    blocksRef.current = bs

    clearHighlights(doc)
    for (const hl of useHighlightsStore.getState().highlights[readingKey] ?? []) {
      const block = bs[hl.blockIndex]
      if (!block) continue
      const range = anchorToRange(doc, block, hl.start, hl.end)
      if (range) applyHighlight(doc, range, hl.id, hl.color)
    }

    doc.addEventListener('click', (e) => {
      const mark = (e.target as Element | null)?.closest?.('mark[data-hl-id]') as HTMLElement | null
      if (mark) {
        setActiveHl(mark.getAttribute('data-hl-id'))
        return
      }
      const node = (e.target as Element | null)?.closest?.(`[${TRANSLATION_ATTR}]`) as HTMLElement | null
      if (node) node.style.display = node.style.display === 'none' ? '' : 'none'
    })

    doc.addEventListener('mouseup', () => {
      const sel = doc.getSelection()
      const text = sel?.toString().trim() ?? ''
      if (!text || !sel || sel.rangeCount === 0) return
      setSelection(text)
      const anchor = rangeToAnchor(sel.getRangeAt(0), bs)
      if (anchor) {
        setPendingAnchor(anchor)
        setPendingText(text)
      }
    })

    let last = 0
    doc.addEventListener('scroll', () => {
      const now = Date.now()
      if (now - last < 500) return
      last = now
      const el = doc.documentElement
      const max = el.scrollHeight - el.clientHeight
      if (max > 0 && readingKey) {
        useReadingStore.getState().setProgress(readingKey, Math.round((el.scrollTop / max) * 100))
      }
    }, { passive: true })
  }, [readingKey])

  const saveHighlight = useCallback(
    (color: HighlightColor) => {
      if (!pendingAnchor) return
      const id = globalThis.crypto?.randomUUID?.() ?? `hl-${Date.now()}`
      addHighlight(readingKey, {
        id,
        ...pendingAnchor,
        text: pendingText,
        color,
        ...(noteDraft.trim() ? { note: noteDraft.trim() } : {}),
        createdAt: new Date().toISOString(),
      })
      const doc = frameRef.current?.contentDocument
      const block = blocksRef.current[pendingAnchor.blockIndex]
      if (doc && block) {
        const range = anchorToRange(doc, block, pendingAnchor.start, pendingAnchor.end)
        if (range) applyHighlight(doc, range, id, color)
      }
      setPendingAnchor(null)
      setPendingText('')
      setNoteDraft('')
    },
    [pendingAnchor, pendingText, noteDraft, readingKey, addHighlight],
  )

  const deleteActiveHighlight = useCallback(() => {
    if (!activeHl) return
    deleteHighlight(readingKey, activeHl)
    const doc = frameRef.current?.contentDocument
    if (doc) removeHighlightNodes(doc, activeHl)
    setActiveHl(null)
  }, [activeHl, readingKey, deleteHighlight])

  const recolorActiveHighlight = useCallback(
    (color: HighlightColor) => {
      if (!activeHl) return
      const list = useHighlightsStore.getState().highlights[readingKey] ?? []
      const hl = list.find((h) => h.id === activeHl)
      if (!hl) return
      const doc = frameRef.current?.contentDocument
      if (doc) removeHighlightNodes(doc, activeHl)
      deleteHighlight(readingKey, activeHl)
      addHighlight(readingKey, { ...hl, color })
      const block = blocksRef.current[hl.blockIndex]
      if (doc && block) {
        const range = anchorToRange(doc, block, hl.start, hl.end)
        if (range) applyHighlight(doc, range, hl.id, color)
      }
    },
    [activeHl, readingKey, deleteHighlight, addHighlight],
  )

  const untranslate = useCallback(() => {
    const doc = frameRef.current?.contentDocument
    if (doc) removeTranslations(doc)
    setTranslated(false)
    setProgress({ done: 0, total: 0 })
    setTranslateError(null)
  }, [])

  const runTranslate = useCallback(
    async (lang: string, doc: Document, blocks: Element[]) => {
      setTranslating(true)
      setTranslateError(null)
      setProgress({ done: 0, total: blocks.length })
      ensureTranslationStyle(doc)
      blocks.forEach((el, i) => markBlock(el, String(i)))
      cancelRef.current = false
      let done = 0
      try {
        for (const batch of chunk(blocks, BATCH_SIZE)) {
          if (cancelRef.current) break
          const texts = batch.map((el) => (el.textContent ?? '').trim())
          const result = await translate(texts, lang)
          if (cancelRef.current) break
          batch.forEach((el, k) => insertTranslation(doc, el, markId(el), result.translations[k]))
          done += batch.length
          setProgress({ done, total: blocks.length })
        }
        setTranslated(true)
      } catch (e) {
        setTranslateError(e instanceof Error ? e.message : '翻译失败')
      } finally {
        setTranslating(false)
      }
    },
    [],
  )

  const toggleTranslate = useCallback(() => {
    const doc = frameRef.current?.contentDocument
    if (!doc) return
    if (translated || translating) {
      cancelRef.current = true
      untranslate()
      return
    }
    const blocks = collectBlocks(doc)
    if (blocks.length === 0) return
    void runTranslate(target, doc, blocks)
  }, [translated, translating, target, untranslate, runTranslate])

  const onTargetChange = useCallback(
    (value: string) => {
      setTarget(value)
      const doc = frameRef.current?.contentDocument
      if (translated && doc) {
        removeTranslations(doc)
        setTranslated(false)
        const blocks = collectBlocks(doc)
        if (blocks.length > 0) void runTranslate(value, doc, blocks)
      }
    },
    [translated, runTranslate],
  )

  const aiEnabled = providers.some((p) => p.kind === 'openai')

  const runAi = useCallback(
    async (action: AiAction) => {
      if (action === 'ask' ? !question.trim() : !selection) return
      setAiLoading(true)
      setAiError(null)
      setAnswer('')
      try {
        const out = await askAi(
          action,
          { text: selection, question: action === 'ask' ? question : undefined },
          target,
        )
        setAnswer(out.answer)
      } catch (e) {
        setAiError(e instanceof Error ? e.message : 'AI 请求失败')
      } finally {
        setAiLoading(false)
      }
    },
    [selection, question, target],
  )

  useEffect(() => () => {
    cancelRef.current = true
  }, [])

  const abs = arxivId ? arxivAbsUrl(arxivId) : '#'
  const pdf = arxivId ? arxivPdfUrl(arxivId) : '#'
  const noProviders = providersReady && providers.length === 0

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      <header className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" /> 返回
          </button>
          <span className="truncate text-sm text-gray-300">arXiv:{arxivId}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTranslate}
              disabled={status !== 'ready' || noProviders}
              title={noProviders ? '未配置可用的翻译 provider' : undefined}
              className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1 text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-400"
            >
              {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
              {translated ? '隐藏译文' : '翻译'}
            </button>
            <select
              aria-label="目标语言"
              value={target}
              onChange={(e) => onTargetChange(e.target.value)}
              disabled={translating}
              className="rounded bg-gray-700 px-2 py-1 text-sm"
            >
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {translating && (
              <span className="text-xs text-gray-400">
                {progress.done}/{progress.total}
              </span>
            )}
          </div>
          <select
            aria-label="阅读状态"
            value={readingEntry?.status ?? ''}
            onChange={(e) => setReadingStatus(readingKey, (e.target.value || null) as ReadingStatus | null)}
            className="rounded bg-gray-700 px-2 py-1 text-sm"
          >
            <option value="">未标记</option>
            {READING_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {typeof readingEntry?.progress === 'number' && (
            <span className="text-xs text-gray-400">{readingEntry.progress}%</span>
          )}
          <button
            type="button"
            onClick={() => setAiOpen((o) => !o)}
            disabled={!aiEnabled}
            title={!aiEnabled ? '未配置可用的 AI provider（问答需要后端 LLM）' : undefined}
            className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-400"
          >
            <Sparkles className="h-3 w-3" /> AI 助手
          </button>
          <a
            href={abs}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
          >
            arXiv <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-green-400 hover:text-green-300"
          >
            PDF <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {translateError && (
        <div className="border-b border-red-800 bg-red-900/40 px-4 py-1 text-xs text-red-300">
          翻译失败：{translateError}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 flex-shrink-0 overflow-y-auto border-r border-gray-700 bg-gray-800 p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase text-gray-400">目录</h2>
          {outline.length === 0 ? (
            <p className="text-xs text-gray-500">无可用目录</p>
          ) : (
            <ul className="space-y-1">
              {outline.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(item.id)}
                    className="w-full truncate rounded px-2 py-1 text-left text-sm text-gray-300 hover:bg-gray-700"
                    style={{ paddingLeft: 8 + (item.level - 1) * 12 }}
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="relative flex-1 bg-white">
          {(pendingAnchor || activeHl) && (
            <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-gray-800/95 px-3 py-2 text-xs text-white shadow-lg">
              {pendingAnchor ? (
                <>
                  <span className="max-w-[14rem] truncate text-gray-300">{pendingText}</span>
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      aria-label={`高亮-${c.label}`}
                      onClick={() => saveHighlight(c.value)}
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: c.css }}
                    />
                  ))}
                  <input
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="备注(可选)"
                    className="w-28 rounded bg-gray-900 px-2 py-1 outline-none placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => saveHighlight('yellow')}
                    className="rounded bg-amber-600 px-2 py-0.5 hover:bg-amber-500"
                  >
                    批注
                  </button>
                  <button
                    type="button"
                    aria-label="取消高亮"
                    onClick={() => {
                      setPendingAnchor(null)
                      setPendingText('')
                      setNoteDraft('')
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span className="text-gray-300">高亮</span>
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      aria-label={`改色-${c.label}`}
                      onClick={() => recolorActiveHighlight(c.value)}
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: c.css }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={deleteActiveHighlight}
                    className="rounded bg-red-600 px-2 py-0.5 hover:bg-red-500"
                  >
                    删除
                  </button>
                  <button
                    type="button"
                    aria-label="关闭高亮操作"
                    onClick={() => setActiveHl(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          )}
          {status === 'loading' && (
            <div className="flex h-full items-center justify-center bg-gray-900 text-gray-300">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 正在加载论文…
            </div>
          )}
          {status === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-gray-900 text-center">
              <FileText className="h-10 w-10 text-gray-500" />
              <p className="text-gray-300">无法加载该论文的 HTML 版本</p>
              <p className="text-sm text-gray-500">该论文可能没有 arXiv HTML 版，或网络受限。</p>
              <div className="flex gap-3 text-sm">
                <a
                  href={abs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  在 arXiv 打开
                </a>
                <a
                  href={pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300"
                >
                  下载/查看 PDF
                </a>
              </div>
            </div>
          )}
          {status === 'ready' && (
            <iframe
              ref={frameRef}
              data-testid="reader-frame"
              title="arXiv HTML"
              className="h-full w-full border-0"
              sandbox="allow-same-origin"
              srcDoc={html}
              onLoad={handleFrameLoad}
            />
          )}
        </main>

        {aiOpen && (
          <aside className="flex w-80 flex-shrink-0 flex-col border-l border-gray-700 bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
              <span className="text-sm font-medium">AI 助手</span>
              <button
                type="button"
                aria-label="关闭 AI"
                onClick={() => setAiOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
              <div>
                <div className="mb-1 text-xs text-gray-400">选中文本</div>
                <div className="max-h-32 overflow-y-auto rounded bg-gray-900 p-2 text-xs text-gray-300">
                  {selection || '在正文中选中一段文本后可用'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => runAi('explain')}
                  disabled={!selection || aiLoading}
                  className="rounded bg-gray-700 px-3 py-1 text-xs hover:bg-gray-600 disabled:opacity-50"
                >
                  解释
                </button>
                <button
                  type="button"
                  onClick={() => runAi('summarize')}
                  disabled={!selection || aiLoading}
                  className="rounded bg-gray-700 px-3 py-1 text-xs hover:bg-gray-600 disabled:opacity-50"
                >
                  总结
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="就选中内容提问…"
                  className="flex-1 rounded bg-gray-900 px-2 py-1 text-xs outline-none placeholder:text-gray-500"
                />
                <button
                  type="button"
                  aria-label="提问"
                  onClick={() => runAi('ask')}
                  disabled={!question.trim() || aiLoading}
                  className="rounded bg-indigo-600 px-2 py-1 text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
              {aiError && <div className="text-xs text-red-400">{aiError}</div>}
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                  <Sparkles className="h-3 w-3" /> 回答
                  {aiLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
                <div className="whitespace-pre-wrap rounded bg-gray-900 p-2 text-xs leading-relaxed text-gray-200">
                  {answer || (aiLoading ? '思考中…' : '')}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

function markId(el: Element): string {
  return el.getAttribute(SOURCE_ATTR) ?? ''
}

export default ReaderPage
