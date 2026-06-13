import { motion } from 'framer-motion'
import { Brain, Lightbulb, BookText, GitBranch, Volume2, Quote } from 'lucide-react'
import { speakText } from '../utils/speech'

function WordDetail({ word, t, onSentenceClick, sourceLang, hideContextSentences, hideDefinition, disableContextSentenceClick }) {

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      {!hideDefinition && (
        <div className="mb-2">
          <h3 className="label-warm mb-0.5 flex items-center gap-1">
            <Brain className="w-3 h-3 text-theme-primary" />
            {t.definition}
          </h3>
          <p className="text-[13px] text-theme-text leading-relaxed font-normal">
            {word.enriched_meaning || word.meaning || word.context_meaning}
          </p>
        </div>
      )}

      {word.variants_detail && word.variants_detail.length > 0 && (
        <div className="mb-2">
          <h3 className="label-warm mb-0.5 flex items-center gap-1">
            <GitBranch className="w-3 h-3 text-theme-primary" />
            {t.variants}
          </h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {word.variants_detail.map((variant, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="badge-ochre">
                  {variant.type}
                </span>
                <span className="text-theme-text text-[13px] font-normal">{variant.form}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {word.examples && word.examples.length > 0 && (
        <div className="mb-2">
          <h3 className="label-warm mb-0.5 flex items-center gap-1">
            <BookText className="w-3 h-3 text-theme-primary" />
            {t.examples}
          </h3>
          <div className="space-y-1">
            {word.examples.map((example, index) => (
              <div key={index} className="border-l-2 border-soft-200 pl-2.5">
                <div className="flex items-start gap-1.5">
                  <p className="text-theme-text text-[13px] leading-snug flex-1 font-normal">{example.sentence}</p>
                  {example.sentence && (
                    <button
                      onClick={(e) => { e.stopPropagation(); speakText(example.sentence, sourceLang) }}
                      className="p-0.5 text-soft-400 hover:text-theme-primary hover:bg-theme-bg-subtle rounded-2xl transition-colors shrink-0"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {example.translation && (
                  <p className="text-theme-text-muted text-[11px] leading-snug font-normal">{example.translation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {word.memory_hint && (
        <div className="mb-2">
          <h3 className="label-warm mb-0.5 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-theme-primary" />
            {t.memoryHint}
          </h3>
          <p className="text-[13px] text-theme-text leading-relaxed font-normal bg-theme-bg-subtle/70 px-3 py-2 rounded-2xl border border-soft-100">
            {word.memory_hint}
          </p>
        </div>
      )}

      {!hideContextSentences && word.context_sentences && word.context_sentences.length > 0 && (
        <div className="mb-2">
          <h3 className="label-warm mb-0.5 flex items-center gap-1">
            <Quote className="w-3 h-3 text-theme-primary" />
            {t.originalSent || '原文例句'}
          </h3>
          <div className="space-y-1">
            {word.context_sentences.map((cs, index) => (
              <div
                key={index}
                className={`border-l-2 border-soft-300 pl-2.5 rounded-r-2xl transition-colors ${disableContextSentenceClick ? '' : 'cursor-pointer hover:bg-theme-bg-subtle'}`}
                onClick={() => !disableContextSentenceClick && onSentenceClick && cs.sentence_index !== undefined && onSentenceClick(cs.sentence_index)}
              >
                <div className="flex items-start gap-1.5">
                  <p className="text-theme-text text-[13px] leading-snug flex-1 font-normal">{cs.sentence}</p>
                  {cs.sentence && (
                    <button
                      onClick={(e) => { e.stopPropagation(); speakText(cs.sentence, sourceLang) }}
                      className="p-0.5 text-soft-400 hover:text-theme-primary hover:bg-theme-bg-subtle rounded-2xl transition-colors shrink-0"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {cs.translation && (
                  <p className="text-theme-text-muted text-[11px] leading-snug font-normal">{cs.translation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default WordDetail
