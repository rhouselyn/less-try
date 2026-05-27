import { motion } from 'framer-motion'

function SentenceDetail({ sentenceTranslation, t }) {
  const translationResult = sentenceTranslation?.translation_result
  
  return (
    <p className="text-sm text-stone-600 leading-relaxed">
      {translationResult?.grammar_explanation || t.loading}
    </p>
  )
}

export default SentenceDetail