import React, { useEffect, useRef } from 'react'

export interface NodeMenuItem {
  label: string
  onSelect: () => void
}

interface NodeContextMenuProps {
  x: number
  y: number
  items: NodeMenuItem[]
  onClose: () => void
}

const NodeContextMenu: React.FC<NodeContextMenuProps> = ({ x, y, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: x, top: y }}
      className="fixed z-50 min-w-[12rem] overflow-hidden rounded-lg border border-gray-600 bg-gray-800 py-1 text-sm text-gray-100 shadow-xl"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={() => {
            item.onSelect()
            onClose()
          }}
          className="block w-full px-3 py-1.5 text-left hover:bg-gray-700"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default NodeContextMenu
