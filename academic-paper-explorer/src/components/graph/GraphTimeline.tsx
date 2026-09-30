import React, { useEffect } from 'react'
import { Pause, Play } from 'lucide-react'
import { useUiStore } from '../../store/useUiStore'

interface Props {
  minYear: number
  maxYear: number
}

const GraphTimeline: React.FC<Props> = ({ minYear, maxYear }) => {
  const { timelineYear, timelinePlaying, setTimelineYear, setTimelinePlaying } = useUiStore()
  const active = timelineYear != null
  const value = timelineYear ?? maxYear

  useEffect(() => {
    if (!timelinePlaying) return
    const id = setInterval(() => {
      const current = useUiStore.getState().timelineYear ?? maxYear
      if (current >= maxYear) {
        setTimelinePlaying(false)
        return
      }
      setTimelineYear(Math.min(maxYear, current + 1))
    }, 700)
    return () => clearInterval(id)
  }, [timelinePlaying, maxYear, setTimelineYear, setTimelinePlaying])

  const togglePlay = () => {
    if (timelinePlaying) {
      setTimelinePlaying(false)
      return
    }
    // Start from the earliest year when idle so playback has somewhere to go.
    if (timelineYear == null || timelineYear >= maxYear) setTimelineYear(minYear)
    setTimelinePlaying(true)
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-gray-800/90 px-4 py-2 text-xs text-white">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="font-medium text-gray-300">时间轴</span>
        <span className="rounded bg-gray-700 px-2 py-0.5 tabular-nums" title="当前筛选到的年份">
          {active ? `≤ ${value} 年` : '全部年份'}
        </span>
        <button
          type="button"
          aria-label={timelinePlaying ? '暂停' : '播放'}
          onClick={togglePlay}
          title={timelinePlaying ? '暂停播放' : '逐年播放'}
          className="rounded p-1 hover:bg-gray-700"
        >
          {timelinePlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setTimelinePlaying(false)
            setTimelineYear(null)
          }}
          disabled={!active}
          className="rounded px-2 py-0.5 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          title="显示全部年份"
        >
          全部
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-8 text-right text-[10px] tabular-nums text-gray-400">{minYear}</span>
        <input
          type="range"
          aria-label="时间轴年份"
          min={minYear}
          max={maxYear}
          value={value}
          onChange={(e) => {
            setTimelinePlaying(false)
            setTimelineYear(parseInt(e.target.value))
          }}
          className="w-56"
        />
        <span className="w-8 text-[10px] tabular-nums text-gray-400">{maxYear}</span>
      </div>
      <div className="mt-0.5 text-center text-[10px] text-gray-500">
        拖动或播放：仅显示该年份及更早发表的论文
      </div>
    </div>
  )
}

export default GraphTimeline
