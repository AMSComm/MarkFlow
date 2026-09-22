import React, { useState } from 'react'

interface ResizeHandleProps {
  onResize: (deltaX: number) => void
  onDoubleClick?: () => void
  className?: string
  title?: string
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  onResize,
  onDoubleClick,
  className = '',
  title = 'Drag to resize (Double-click to reset)',
}) => {
  const [isDragging, setIsDragging] = useState(false)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)

    const startX = e.clientX
    let lastX = startX

    // Set cursor on whole document during dragging
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - lastX
      lastX = moveEvent.clientX
      onResize(deltaX)
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onDoubleClick={onDoubleClick}
      title={title}
      className={`group relative z-20 flex h-full w-1.5 cursor-col-resize shrink-0 items-center justify-center transition-colors hover:bg-cyan-500/30 active:bg-cyan-500/50 ${
        isDragging ? 'bg-cyan-500/50' : 'bg-transparent'
      } ${className}`}
    >
      {/* 1px visible divider line */}
      <div
        className={`h-full w-[1px] transition-colors ${
          isDragging
            ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
            : 'bg-[#1e293b] group-hover:bg-cyan-400'
        }`}
      />
    </div>
  )
}
