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
            <Brain className="w-3 h-3 text-[#e63946]" />
            {t.definition}
          </h3>
          <p className="text-[13px] text-[#1a1a2e] leading-relaxed font-sans">
            {word.enriched_meaning || word.meaning || word.context_meaning}
          </p>
        </div>
      )}

      {word.variants_detail && word.variants_detail.length > 0 && (
        <div className="mb-2">
          <h3 className="label-warm mb-0.5 flex items-center gap-1">
            <GitBranch className="w-3 h-3 text-[#e63946]" />
            {t.variants}
          </h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {word.variants_detail.map((variant, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="badge-ochre">
                  {variant.type}
                </span>
                <span className="text-[#1a1a2e] text-[13px] font-sans">{variant.form}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {word.examples && word.examples.length > 0 && (
        <div className="mb-2">
          <h3 className="label-warm mb-0.5 flex items-center gap-1">
            <BookText className="w-3 h-3 text-[#e63946]" />
            {t.examples}
          </h3>
          <div className="space-y-1">
            {word.examples.map((example, index) => (
              <div key={index} className="border-l-[3px] border-[#e63946] pl-2.5">
                <div className="flex items-start gap-1.5">
                  <p className="text-[#1a1a2e] text-[13px] leading-snug flex-1 font-sans">{example.sentence}</p>
                  {example.sentence && (
                    <button
                      onClick={(e) => { e.stopPropagation(); speakText(example.sentence, sourceLang) }}
                      className="p-0.5 text-[#e63946] hover:text-[#e63946] hover:bg-[#fef3e2] rounded transition-colors shrink-0"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {example.translation && (
                  <p className="text-[#4a4a6a] text-[11px] leading-snug font-sans">{example.translation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {word.memory_hint && (
        <div className="mb-2">
          <h3 className="label-warm mb-0.5 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-[#e63946]" />
            {t.memoryHint}
          </h3>
          <p className="text-[13px] text-[#1a1a2e] leading-relaxed bg-[#fef3e2] px-3 py-2 rounded-lg border-[3px] border-[#1a1a2e] font-sans">
            {word.memory_hint}
          </p>
        </div>
      )}

      {!hideContextSentences && word.context_sentences && word.context_sentences.length > 0 && (
        <div className="mb-2">
          <h3 className="label-warm mb-0.5 flex items-center gap-1">
            <Quote className="w-3 h-3 text-[#e63946]" />
            {t.originalSent || '原文例句'}
          </h3>
          <div className="space-y-1">
            {word.context_sentences.map((cs, index) => (
              <div
                key={index}
                className={`border-l-[3px] border-[#e63946] pl-2.5 rounded-r transition-colors ${disableContextSentenceClick ? '' : 'cursor-pointer hover:bg-[#f4a261]/20'}`}
                onClick={() => !disableContextSentenceClick && onSentenceClick && cs.sentence_index !== undefined && onSentenceClick(cs.sentence_index)}
              >
                <div className="flex items-start gap-1.5">
                  <p className="text-[#1a1a2e] text-[13px] leading-snug flex-1 font-sans">{cs.sentence}</p>
                  {cs.sentence && (
                    <button
                      onClick={(e) => { e.stopPropagation(); speakText(cs.sentence, sourceLang) }}
                      className="p-0.5 text-[#e63946] hover:text-[#e63946] hover:bg-[#fef3e2] rounded transition-colors shrink-0"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {cs.translation && (
                  <p className="text-[#4a4a6a] text-[11px] leading-snug font-sans">{cs.translation}</p>
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
