import { useRef, useCallback, useEffect, useState } from 'react'

const HOVER_DELAY = 120

export function useDragSwap({ containerRef, onInsert, enabled, itemCount }) {
  const dragState = useRef(null)
  const [dragInfo, setDragInfo] = useState(null)
  const hoverTimerRef = useRef(null)

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const startDrag = useCallback((sourceType, sourceIdx, clientX, clientY, el, word) => {
    if (enabled && !enabled()) return
    const rect = el.getBoundingClientRect()
    const state = {
      sourceType,
      sourceIdx,
      word,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
      ghostX: rect.left,
      ghostY: rect.top,
      width: rect.width,
      height: rect.height,
      insertIdx: null,
      moved: false,
      confirmedInsertIdx: null,
    }
    dragState.current = state
    setDragInfo({
      sourceType,
      sourceIdx,
      word,
      ghostX: rect.left,
      ghostY: rect.top,
      width: rect.width,
      height: rect.height,
      insertIdx: null,
      confirmedInsertIdx: null,
    })
  }, [enabled])

  const computeInsertIdx = useCallback((clientX, clientY) => {
    if (!containerRef?.current) return null
    const slots = containerRef.current.querySelectorAll('[data-slot-idx]')
    let found = false
    let insertIdx = null
    for (let i = 0; i < slots.length; i++) {
      const slotRect = slots[i].getBoundingClientRect()
      const midX = slotRect.left + slotRect.width / 2
      if (clientY < slotRect.bottom && clientY > slotRect.top) {
        if (clientX < midX) {
          const idx = parseInt(slots[i].getAttribute('data-slot-idx'), 10)
          if (!isNaN(idx)) {
            insertIdx = idx
            found = true
            break
          }
        }
      }
    }
    if (!found) {
      const boxRect = containerRef.current.getBoundingClientRect()
      if (clientY > boxRect.top && clientY < boxRect.bottom &&
          clientX > boxRect.left && clientX < boxRect.right) {
        insertIdx = itemCount
      }
    }
    return insertIdx
  }, [containerRef, itemCount])

  const moveDrag = useCallback((clientX, clientY) => {
    const state = dragState.current
    if (!state) return

    const dx = Math.abs(clientX - (state.ghostX + state.offsetX))
    const dy = Math.abs(clientY - (state.ghostY + state.offsetY))
    if (!state.moved && dx < 5 && dy < 5) return
    state.moved = true

    const ghostX = clientX - state.offsetX
    const ghostY = clientY - state.offsetY
    state.ghostX = ghostX
    state.ghostY = ghostY

    const insertIdx = computeInsertIdx(clientX, clientY)
    state.insertIdx = insertIdx

    if (insertIdx !== null && insertIdx !== state.confirmedInsertIdx) {
      clearHoverTimer()
      hoverTimerRef.current = setTimeout(() => {
        state.confirmedInsertIdx = insertIdx
        setDragInfo(prev => prev ? {
          ...prev,
          confirmedInsertIdx: insertIdx,
        } : null)
      }, HOVER_DELAY)
    } else if (insertIdx === null) {
      clearHoverTimer()
      state.confirmedInsertIdx = null
    }

    setDragInfo(prev => prev ? {
      ...prev,
      ghostX,
      ghostY,
      insertIdx,
    } : null)
  }, [computeInsertIdx, clearHoverTimer])

  const endDrag = useCallback(() => {
    const state = dragState.current
    if (!state) return

    clearHoverTimer()

    if (state.moved && state.confirmedInsertIdx !== null) {
      onInsert(state.sourceType, state.sourceIdx, state.confirmedInsertIdx)
    }

    dragState.current = null
    setDragInfo(null)
  }, [onInsert, clearHoverTimer])

  const handleMouseDown = useCallback((e, sourceType, sourceIdx, word) => {
    if (e.button !== 0) return
    e.preventDefault()
    startDrag(sourceType, sourceIdx, e.clientX, e.clientY, e.currentTarget, word)
  }, [startDrag])

  const handleTouchStart = useCallback((e, sourceType, sourceIdx, word) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    startDrag(sourceType, sourceIdx, touch.clientX, touch.clientY, e.currentTarget, word)
  }, [startDrag])

  useEffect(() => {
    if (!dragInfo) return

    const onMouseMove = (e) => moveDrag(e.clientX, e.clientY)
    const onMouseUp = () => endDrag()
    const onTouchMove = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault()
        moveDrag(e.touches[0].clientX, e.touches[0].clientY)
      }
    }
    const onTouchEnd = () => endDrag()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [dragInfo, moveDrag, endDrag])

  useEffect(() => {
    return () => clearHoverTimer()
  }, [clearHoverTimer])

  return {
    dragInfo,
    handleMouseDown,
    handleTouchStart,
  }
}
