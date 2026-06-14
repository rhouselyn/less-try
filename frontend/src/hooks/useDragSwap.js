import { useRef, useCallback, useEffect, useState } from 'react'

export function useDragSwap({ containerRef, getItemAtPoint, onInsert, enabled, itemCount }) {
  const dragState = useRef(null)
  const [dragInfo, setDragInfo] = useState(null)

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
    })
  }, [enabled])

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

    let insertIdx = null
    if (containerRef?.current) {
      const slots = containerRef.current.querySelectorAll('[data-slot-idx]')
      let found = false
      for (let i = 0; i < slots.length; i++) {
        const slotRect = slots[i].getBoundingClientRect()
        const midX = slotRect.left + slotRect.width / 2
        const midY = slotRect.top + slotRect.height / 2
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
    }
    state.insertIdx = insertIdx

    setDragInfo(prev => prev ? {
      ...prev,
      ghostX,
      ghostY,
      insertIdx,
    } : null)
  }, [containerRef, itemCount])

  const endDrag = useCallback(() => {
    const state = dragState.current
    if (!state) return

    if (state.moved && state.insertIdx !== null) {
      onInsert(state.sourceType, state.sourceIdx, state.insertIdx)
    }

    dragState.current = null
    setDragInfo(null)
  }, [onInsert])

  const cancelDrag = useCallback(() => {
    dragState.current = null
    setDragInfo(null)
  }, [])

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
    const onTouchEnd = (e) => {
      endDrag()
    }

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

  return {
    dragInfo,
    handleMouseDown,
    handleTouchStart,
    cancelDrag,
  }
}
