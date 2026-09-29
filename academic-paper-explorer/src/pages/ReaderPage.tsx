import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, FileText, Loader2 } from 'lucide-react'
import {
  arxivAbsUrl,
  arxivHtmlUrl,
  arxivPdfUrl,
  extractOutline,
  sanitizeArticleHtml,
  type OutlineItem,
} from '../lib/article'

type Status = 'loading' | 'ready' | 'error'

const ReaderPage: React.FC = () => {
  const { arxivId } = useParams<{ arxivId: string }>()
  const navigate = useNavigate()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [html, setHtml] = useState('')
  const [outline, setOutline] = useState<OutlineItem[]>([])

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

  const jumpTo = useCallback((id: string) => {
    frameRef.current?.contentDocument?.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const abs = arxivId ? arxivAbsUrl(arxivId) : '#'
  const pdf = arxivId ? arxivPdfUrl(arxivId) : '#'

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
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default ReaderPage
