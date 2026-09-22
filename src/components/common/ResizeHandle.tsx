import React, { useState, useRef, useEffect } from 'react'

interface ResizeHandleProps {
  direction?: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
  onDoubleClick?: () => void
  className?: string
  title?: string
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  direction = 'horizontal',
  onResize,
  onDoubleClick,
  className = '',
  title = 'Drag to resize (Double-click to reset)',
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const onResizeRef = useRef(onResize)

  useEffect(() => {
    onResizeRef.current = onResize
  }, [onResize])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)

    let lastPos = direction === 'horizontal' ? e.clientX : e.clientY

    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault()
      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY
      const delta = currentPos - lastPos
      if (delta !== 0) {
        lastPos = currentPos
        onResizeRef.current(delta)
      }
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  if (direction === 'vertical') {
    return (
      <>
        {isDragging && (
          <div
            className="fixed inset-0 z-50 select-none cursor-row-resize"
          />
        )}
        <div
          onPointerDown={handlePointerDown}
          onDoubleClick={onDoubleClick}
          title={title}
          className={`group relative z-20 flex h-2 w-full cursor-row-resize shrink-0 items-center justify-center transition-colors hover:bg-cyan-500/20 active:bg-cyan-500/40 ${
            isDragging ? 'bg-cyan-500/40' : 'bg-transparent'
          } ${className}`}
        >
          {/* 1px horizontal divider line */}
          <div
            className={`w-full h-[1px] transition-colors ${
              isDragging
                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                : 'bg-[#1e293b] group-hover:bg-cyan-400'
            }`}
          />
        </div>
      </>
    )
  }

  return (
    <>
      {isDragging && (
        <div
          className="fixed inset-0 z-50 select-none cursor-col-resize"
        />
      )}
      <div
        onPointerDown={handlePointerDown}
        onDoubleClick={onDoubleClick}
        title={title}
        className={`group relative z-20 flex h-full w-2 cursor-col-resize shrink-0 items-center justify-center transition-colors hover:bg-cyan-500/20 active:bg-cyan-500/40 ${
          isDragging ? 'bg-cyan-500/40' : 'bg-transparent'
        } ${className}`}
      >
        {/* 1px vertical divider line */}
        <div
          className={`h-full w-[1px] transition-colors ${
            isDragging
              ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
              : 'bg-[#1e293b] group-hover:bg-cyan-400'
          }`}
        />
      </div>
    </>
  )
}
