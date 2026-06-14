import { useState, useEffect, useCallback } from 'react'
import { Star } from 'lucide-react'
import { api } from '../utils/api'

/**
 * 收藏星星按钮组件
 * @param {string} word - 单词
 * @param {string} sourceLang - 源语言
 * @param {function} t - 翻译函数
 * @param {Set} favoritedSet - 收藏单词集合，用于批量判断收藏状态
 * @param {function} onFavoriteChange - 收藏状态变更回调（可选）
 */
function FavoriteButton({ word, sourceLang, t, favoritedSet, onFavoriteChange }) {
  const isFromSet = favoritedSet && favoritedSet.size > 0
  const isInSet = isFromSet && (favoritedSet.has(word) || favoritedSet.has(word.toLowerCase()))
  const [favorited, setFavorited] = useState(isInSet)

  useEffect(() => {
    if (isFromSet) {
      setFavorited(favoritedSet.has(word) || favoritedSet.has(word.toLowerCase()))
    }
  }, [favoritedSet, word])

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

  return (
    <button
      onClick={handleToggle}
      className={`p-1.5 rounded-none transition-colors ${
        favorited
          ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-50'
          : 'text-aged-300 hover:text-amber-400 hover:bg-amber-50'
      }`}
      title={favorited ? (t.favorited || '已收藏') : (t.favorite || '收藏')}
    >
      <Star className={`w-3.5 h-3.5 ${favorited ? 'fill-current' : ''}`} />
    </button>
  )
}

export default FavoriteButton
