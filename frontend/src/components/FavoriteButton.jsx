import { useState, useEffect, useCallback } from 'react'
import { Star } from 'lucide-react'
import { api } from '../utils/api'

/**
 * 收藏星星按钮组件
 * @param {string} word - 单词
 * @param {string} sourceLang - 源语言
 * @param {function} t - 翻译函数
 * @param {boolean} initialFavorited - 初始收藏状态（可选）
 * @param {function} onFavoriteChange - 收藏状态变更回调（可选）
 * @param {boolean} favoritesMode - 是否在收藏页面中（始终显示填充状态）
 */
function FavoriteButton({ word, sourceLang, t, initialFavorited, onFavoriteChange, favoritesMode }) {
  const [favorited, setFavorited] = useState(initialFavorited || false)

  useEffect(() => {
    if (initialFavorited !== undefined) {
      setFavorited(initialFavorited)
    }
  }, [initialFavorited])

  const handleToggle = useCallback(async (e) => {
    if (e) e.stopPropagation()
    try {
      const result = await api.toggleFavorite(word, sourceLang)
      setFavorited(result.favorited)
      if (onFavoriteChange) {
        onFavoriteChange(word, result.favorited)
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }, [word, sourceLang, onFavoriteChange])

  const isFilled = favoritesMode || favorited

  return (
    <button
      onClick={handleToggle}
      className={`p-1.5 rounded-none transition-colors ${
        isFilled
          ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-50'
          : 'text-aged-300 hover:text-amber-400 hover:bg-amber-50'
      }`}
      title={isFilled ? (t.favorited || '已收藏') : (t.favorite || '收藏')}
    >
      <Star className={`w-3.5 h-3.5 ${isFilled ? 'fill-current' : ''}`} />
    </button>
  )
}

export default FavoriteButton
