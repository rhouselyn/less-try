import { motion } from 'framer-motion'
import { Brain, Lightbulb, BookText, GitBranch, Volume2, Quote } from 'lucide-react'
import { speakText } from '../utils/speech'

function WordDetail({ word, t, onSentenceClick, sourceLang, hideContextSentences, hideDefinition, disableContextSentenceClick }) {

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="py-3.5"
    >
      <div className="space-y-3">
        {!hideDefinition && (
        <div>
          <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Brain className="w-3 h-3" />
            {t.definition}
          </h3>
          <p className="text-[13px] text-stone-700 leading-relaxed pl-5">
            {word.enriched_meaning || word.meaning || word.context_meaning}
          </p>
        </div>
        )}

        {word.variants_detail && word.variants_detail.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" />
              {t.variants}
            </h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1 pl-5">
              {word.variants_detail.map((variant, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[11px] font-medium">
                    {variant.type}
                  </span>
                  <span className="text-stone-600 text-[13px]">{variant.form}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {word.examples && word.examples.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <BookText className="w-3 h-3" />
              {t.examples}
            </h3>
            <div className="space-y-1.5 pl-5">
              {word.examples.map((example, index) => (
                <div key={index} className="border-l-[1.5px] border-stone-300 pl-2.5">
                  <div className="flex items-start gap-1.5">
                    <p className="text-stone-700 text-[13px] leading-snug flex-1">{example.sentence}</p>
                    {example.sentence && (
                      <button
                        onClick={(e) => { e.stopPropagation(); speakText(example.sentence, sourceLang) }}
                        className="p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors shrink-0"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-stone-400 text-[11px] leading-snug mt-0.5">{example.translation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {word.memory_hint && (
          <div>
            <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Lightbulb className="w-3 h-3" />
              {t.memoryHint}
            </h3>
            <div className="pl-5">
              <p className="text-[13px] text-stone-600 leading-relaxed bg-amber-50/70 px-3 py-2 rounded-lg border border-amber-100">
                {word.memory_hint}
              </p>
            </div>
          </div>
        )}

        {!hideContextSentences && word.context_sentences && word.context_sentences.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Quote className="w-3 h-3" />
              {t.originalSent || '原文例句'}
            </h3>
            <div className="space-y-1.5 pl-5">
              {word.context_sentences.map((cs, index) => (
                <div
                  key={index}
                  className={`border-l-[1.5px] border-amber-300 pl-2.5 rounded-r transition-colors ${disableContextSentenceClick ? '' : 'cursor-pointer hover:bg-amber-50/40'}`}
                  onClick={() => !disableContextSentenceClick && onSentenceClick && cs.sentence_index !== undefined && onSentenceClick(cs.sentence_index)}
                >
                  <div className="flex items-start gap-1.5">
                    <p className="text-stone-700 text-[13px] leading-snug flex-1">{cs.sentence}</p>
                    {cs.sentence && (
                      <button
                        onClick={(e) => { e.stopPropagation(); speakText(cs.sentence, sourceLang) }}
                        className="p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors shrink-0"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {cs.translation && (
                    <p className="text-stone-400 text-[11px] leading-snug mt-0.5">{cs.translation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </motion.div>
  )
}

export default WordDetail
