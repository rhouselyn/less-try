import { motion } from 'framer-motion'

function SentenceDetail({ sentenceTranslation, t }) {
  const translationResult = sentenceTranslation?.translation_result

  return (
    <div className="border-l-[var(--border-width)] border-[var(--color-accent)] pl-3">
      <p className="text-[13px] text-[var(--color-muted-dark)] leading-relaxed italic">
        {translationResult?.grammar_explanation || t.loading}
      </p>
    </div>
  )
}

export default SentenceDetail
