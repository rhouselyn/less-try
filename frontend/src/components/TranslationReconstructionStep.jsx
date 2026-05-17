
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, ChevronRight, BookOpen, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { speakText } from '../utils/speech';

function TranslationReconstructionStep({ data, onNext, onBack, onComplete, loading, t, onOpenVocabList, exerciseIndexInUnit, totalExercisesInUnit, sentencePreview, sourceLang }) {
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [answerChecked, setAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const currentQ = (exerciseIndexInUnit ?? 0) + 1;
  const totalQ = totalExercisesInUnit ?? 10;

  const isLastExercise = currentQ >= totalQ;

  const handleTokenSelect = (token, index) => {
    if (answerChecked) return;
    setSelectedTokens([...selectedTokens, { token, index }]);
  };

  const handleRemoveToken = (index) => {
    if (answerChecked) return;
    const newSelected = [...selectedTokens];
    newSelected.splice(index, 1);
    setSelectedTokens(newSelected);
  };

  const stripPunctuation = (str) => str.replace(/[，。、；：！？,.:;!?]/g, '')

  const checkAnswer = () => {
    const userTokens = selectedTokens.map(t => stripPunctuation(t.token.toLowerCase()));
    const correctTokens = data.original_tokens.map(t => stripPunctuation(t.toLowerCase()));
    
    const correct = userTokens.length === correctTokens.length &&
      userTokens.every((token, index) => token === correctTokens[index]);
    
    setIsCorrect(correct);
    setAnswerChecked(true);
  };

  const handleNext = () => {
    setSelectedTokens([]);
    setAnswerChecked(false);
    setIsCorrect(false);
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto"
    >
      <div className="flex justify-between items-center mb-8">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors rounded-md hover:bg-stone-100"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back}
        </motion.button>
        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onOpenVocabList}
          className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors rounded-md hover:bg-stone-100"
        >
          <BookOpen className="w-4 h-4" />
          单词表
        </motion.button>
      </div>

      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-semibold text-stone-800 mb-4"
        >
          {t.translationReconstructionTitle}
        </motion.h2>
        <p className="text-lg text-stone-600">{t.reconstructSentence}</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-sm text-stone-500">第 {currentQ}/{totalQ} 题</span>
          <span className="text-stone-300">|</span>
          <span className="text-xs text-stone-400">翻译还原</span>
        </div>
      </div>

      <div className="mb-8 p-6 bg-white border border-stone-200/80 rounded-2xl">
        <div className="flex items-start gap-2 mb-6">
          <p className="text-lg text-stone-600 italic flex-1">
            {data.native_translation}
          </p>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => speakText(data.original_tokens?.join(' ') || '', sourceLang)}
            className="p-1.5 text-stone-400 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors shrink-0"
            title="点击发音"
          >
            <Lightbulb className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6 min-h-[60px]">
          {selectedTokens.map((item, idx) => (
            <div
              key={idx}
              className={`px-4 py-2 rounded-lg border min-w-[60px] text-center ${
                answerChecked
                  ? isCorrect
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                  : 'border-stone-300 bg-stone-50 cursor-pointer'
              }`}
            >
              <span
                className="text-stone-800"
                onClick={() => handleRemoveToken(idx)}
              >
                {item.token}
              </span>
            </div>
          ))}
        </div>

        {answerChecked && (
          <div className={`p-4 rounded-lg mb-4 ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-semibold mb-2">{isCorrect ? t.correct : t.incorrect}</p>
            {!isCorrect && (
              <p>
                {t.correctAnswer}: <span className="font-medium">{data.original_tokens.join(' ')}</span>
              </p>
            )}
            {isCorrect && isLastExercise && (
              <p className="font-medium mt-3 text-lg text-green-700">
                🎉 该单元学习已完成！
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-stone-800 mb-3">{t.selectWords}</h3>
        <div className="flex flex-wrap gap-3">
          {data.options.map((token, idx) => {
            const isSelected = selectedTokens.some(t => t && t.index === idx);
            return (
              <button
                key={idx}
                onClick={() => handleTokenSelect(token, idx)}
                disabled={isSelected || answerChecked}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  isSelected || answerChecked
                    ? 'border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed'
                    : 'border-stone-300 bg-white hover:border-stone-400 hover:shadow-sm'
                }`}
              >
                {token}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4">
        {!answerChecked ? (
          <motion.button
            whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
            whileTap={{ scale: 0.97, y: 0 }}
            onClick={checkAnswer}
            disabled={selectedTokens.length === 0}
            className="flex-1 py-4 bg-stone-800 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {t.checkAnswer}
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
            whileTap={{ scale: 0.97, y: 0 }}
            onClick={() => {
              handleNext();
            }}
            disabled={loading}
            className="flex-1 py-4 bg-stone-800 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.loading}
              </>
            ) : isLastExercise ? (
              '完成'
            ) : (
              <>
                下一题
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

export default TranslationReconstructionStep;
