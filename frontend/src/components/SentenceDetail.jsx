import { motion } from 'framer-motion'

function SentenceDetail({ sentenceTranslation, t }) {
  const translationResult = sentenceTranslation?.translation_result

  return (
    <div className="border-l-[3px] border-[#e63946] pl-3">
      <p className="text-[13px] text-[#2d2d4a] leading-relaxed italic font-sans">
        {translationResult?.grammar_explanation || t.loading}
      </p>
    </div>
  )
}

export default SentenceDetail
