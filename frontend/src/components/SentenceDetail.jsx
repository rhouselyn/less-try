import { motion } from 'framer-motion'

function SentenceDetail({ sentenceTranslation, t }) {
  const translationResult = sentenceTranslation?.translation_result

  return (
    <div className="border-l-2 border-warmorange-300 pl-3">
      <p className="text-[13px] text-umber-500 leading-relaxed italic">
        {translationResult?.grammar_explanation || t.loading}
      </p>
    </div>
  )
}

export default SentenceDetail
