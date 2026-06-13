import { motion } from 'framer-motion'

function SentenceDetail({ sentenceTranslation, t }) {
  const translationResult = sentenceTranslation?.translation_result

  return (
    <div className="border-l-2 border-soft-300 pl-3">
      <p className="text-[13px] text-theme-text-secondary leading-relaxed italic font-normal">
        {translationResult?.grammar_explanation || t.loading}
      </p>
    </div>
  )
}

export default SentenceDetail
