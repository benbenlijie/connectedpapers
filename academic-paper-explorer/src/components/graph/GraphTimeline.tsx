import React, { useEffect } from 'react'
import { Pause, Play, X } from 'lucide-react'
import { useUiStore } from '../../store/useUiStore'

interface Props {
  minYear: number
  maxYear: number
}

const GraphTimeline: React.FC<Props> = ({ minYear, maxYear }) => {
  const { timelineYear, timelinePlaying, setTimelineYear, setTimelinePlaying } = useUiStore()
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

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-gray-800/90 px-4 py-2 text-xs text-white">
      <button onClick={() => setTimelinePlaying(!timelinePlaying)} title={timelinePlaying ? '暂停' : '播放'}>
        {timelinePlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <input
        type="range"
        min={minYear}
        max={maxYear}
        value={value}
        onChange={(e) => {
          setTimelinePlaying(false)
          setTimelineYear(parseInt(e.target.value))
        }}
        className="w-48"
      />
      <span className="w-10 tabular-nums">{value}</span>
      {timelineYear != null && (
        <button
          onClick={() => {
            setTimelinePlaying(false)
            setTimelineYear(null)
          }}
          title="清除时间过滤"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

export default GraphTimeline
