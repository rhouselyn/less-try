import { motion } from 'framer-motion'

function SentenceDetail({ sentenceTranslation, t }) {
  const translationResult = sentenceTranslation?.translation_result

  return (
    <div className="border-l-[3px] border-[#ff006e] pl-3">
      <p className="text-[13px] text-[#4a4a6a] leading-relaxed italic">
        {translationResult?.grammar_explanation || t.loading}
      </p>
    </div>
  )
}

export default SentenceDetail
