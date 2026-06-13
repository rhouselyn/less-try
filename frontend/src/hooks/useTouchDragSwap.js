import { useRef, useCallback } from 'react'

export function useTouchDragSwap({ containerRef, getItemAtPoint, onSwap, enabled }) {
  const dragState = useRef(null)
  const ghostRef = useRef(null)

  const handleTouchStart = useCallback((e, sourceIdx) => {
    if (enabled && !enabled()) return
    const touch = e.touches[0]
    dragState.current = {
      sourceIdx,
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
    }
  }, [enabled])

  const handleTouchMove = useCallback((e) => {
    if (!dragState.current) return
    const touch = e.touches[0]
    const state = dragState.current

    if (!state.moved) {
      const dx = Math.abs(touch.clientX - state.startX)
      const dy = Math.abs(touch.clientY - state.startY)
      if (dx < 10 && dy < 10) return
      state.moved = true

      const el = e.currentTarget
      const rect = el.getBoundingClientRect()
      const ghost = el.cloneNode(true)
      ghost.style.position = 'fixed'
      ghost.style.left = rect.left + 'px'
      ghost.style.top = rect.top + 'px'
      ghost.style.width = rect.width + 'px'
      ghost.style.height = rect.height + 'px'
      ghost.style.zIndex = '9999'
      ghost.style.opacity = '0.85'
      ghost.style.pointerEvents = 'none'
      ghost.style.transform = 'scale(1.08)'
      ghost.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'
      ghost.style.transition = 'transform 0.1s, box-shadow 0.1s'
      document.body.appendChild(ghost)
      ghostRef.current = ghost

      el.style.opacity = '0.3'
    }

    if (ghostRef.current) {
      const rect = ghostRef.current.getBoundingClientRect()
      ghostRef.current.style.left = (touch.clientX - rect.width / 2) + 'px'
      ghostRef.current.style.top = (touch.clientY - rect.height / 2) + 'px'
    }

    e.preventDefault()
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (!dragState.current) return
    const state = dragState.current

    if (ghostRef.current) {
      document.body.removeChild(ghostRef.current)
      ghostRef.current = null
    }

    const el = e.currentTarget
    if (el) el.style.opacity = ''

    if (state.moved) {
      const touch = e.changedTouches[0]
      const targetIdx = getItemAtPoint(touch.clientX, touch.clientY)
      if (targetIdx !== null && targetIdx !== undefined && targetIdx !== state.sourceIdx) {
        onSwap(state.sourceIdx, targetIdx)
      }
    }

    dragState.current = null
  }, [getItemAtPoint, onSwap])

  return { handleTouchStart, handleTouchMove, handleTouchEnd }
}
