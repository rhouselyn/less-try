import { useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2, Brain } from 'lucide-react'

function WordDetail({ word, t }) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlayAudio = () => {
    setIsPlaying(true)
    setTimeout(() => setIsPlaying(false), 1000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-3"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-2xl font-semibold text-stone-800">{word.word}</span>
          {word.ipa && (
            <span className="text-sm text-stone-500 ml-2 ipa-font">/{word.ipa}/</span>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayAudio}
            className="p-1 ml-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors inline-flex items-center"
          >
            <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-pulse' : ''}`} />
          </motion.button>
        </div>
        {word.morphology && (
          <span className="px-2 py-0.5 bg-amber-50 text-stone-600 rounded text-xs font-medium">
            {word.morphology}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        <div>
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Brain className="w-3 h-3" />
            {t.definition}
          </h3>
          <p className="text-sm text-stone-700 leading-snug">
            {word.meaning || word.context_meaning}
          </p>
        </div>

        {word.variants_detail && word.variants_detail.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
              {t.variants}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {word.variants_detail.map((variant, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-amber-50 text-stone-600 rounded text-xs font-medium">
                    {variant.type}
                  </span>
                  <span className="text-stone-700 text-sm">{variant.form}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {word.examples && word.examples.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
              {t.examples}
            </h3>
            <div className="space-y-1.5">
              {word.examples.map((example, index) => (
                <div key={index} className="border-l-2 border-stone-200 pl-2.5">
                  <p className="text-stone-800 text-sm leading-snug">{example.sentence}</p>
                  <p className="text-stone-500 text-xs">{example.translation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {word.memory_hint && (
          <div>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
              {t.memoryHint}
            </h3>
            <p className="text-sm text-stone-700 leading-snug bg-amber-50 px-3 py-2 rounded border border-amber-200">
              {word.memory_hint}
            </p>
          </div>
        )}

        {word.context_sentences && word.context_sentences.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
              {t.originalSent}
            </h3>
            <div className="space-y-1.5">
              {word.context_sentences.map((sentenceObj, index) => {
                let sentence = typeof sentenceObj === 'string' ? sentenceObj : sentenceObj.sentence;
                let translation = null;
                if (typeof sentenceObj === 'object' && sentenceObj.translation) {
                  translation = sentenceObj.translation;
                } else if (word.context_translations && word.context_translations[index]) {
                  translation = word.context_translations[index];
                }
                return (
                  <div key={index} className="border-l-2 border-stone-200 pl-2.5">
                    <p className="text-stone-800 text-sm italic leading-snug">{sentence}</p>
                    {translation && (
                      <p className="text-stone-500 text-xs">{translation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default WordDetail
