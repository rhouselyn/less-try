
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

function TranslationReconstructionStep({ data, onNext, onBack, loading, t }) {
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [answerChecked, setAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

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

  const checkAnswer = () => {
    const userTokens = selectedTokens.map(t => t.token.toLowerCase());
    const correctTokens = data.original_tokens.map(t => t.toLowerCase());
    
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
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </motion.button>

      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-semibold text-slate-900 mb-4"
        >
          {t.translationReconstructionTitle}
        </motion.h2>
        <p className="text-lg text-slate-600">{t.reconstructSentence}</p>
      </div>

      <div className="mb-8 p-6 bg-white border border-slate-200 rounded-2xl">
        <p className="text-lg text-slate-600 mb-6 italic">
          {data.native_translation}
        </p>

        <div className="flex flex-wrap gap-3 mb-6 min-h-[60px]">
          {selectedTokens.map((item, idx) => (
            <div
              key={idx}
              className={`px-4 py-2 rounded-lg border min-w-[60px] text-center ${
                answerChecked
                  ? isCorrect
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                  : 'border-slate-300 bg-slate-50 cursor-pointer'
              }`}
            >
              <span
                className="text-slate-900"
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
          </div>
        )}
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">{t.selectWords}</h3>
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
                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                    : 'border-slate-300 bg-white hover:border-black hover:shadow-sm'
                }`}
              >
                {token}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center">
        {!answerChecked ? (
          <button
            onClick={checkAnswer}
            className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            {t.checkAnswer}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            {t.continue}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default TranslationReconstructionStep;
