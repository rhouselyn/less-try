
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, ChevronRight } from 'lucide-react';
import { useState } from 'react';

function MaskedSentenceExerciseStep({ data, onNext, onBack, loading, t, onOpenVocabList }) {
  const [selectedWords, setSelectedWords] = useState([]);
  const [answerChecked, setAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleWordSelect = (word, index) => {
    if (answerChecked) return;
    // Find the first empty slot and fill it
    const newSelected = [...selectedWords];
    const emptyIndex = newSelected.findIndex(w => w === null || w === undefined);
    if (emptyIndex !== -1) {
      newSelected[emptyIndex] = { word, index };
    } else {
      newSelected.push({ word, index });
    }
    setSelectedWords(newSelected);
  };

  const handleRemoveWord = (index) => {
    if (answerChecked) return;
    const newSelected = [...selectedWords];
    newSelected[index] = null;
    setSelectedWords(newSelected);
  };

  const checkAnswer = () => {
    const userAnswerWords = selectedWords.filter(w => w).map(w => w.word.toLowerCase());
    const correctAnswerWords = data.answer_words.map(w => w.toLowerCase());
    
    const correct = userAnswerWords.length === correctAnswerWords.length &&
      userAnswerWords.every((word, index) => word === correctAnswerWords[index]);
    
    setIsCorrect(correct);
    setAnswerChecked(true);
  };

  const handleNext = () => {
    setSelectedWords([]);
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
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back}
        </motion.button>
        {onOpenVocabList && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onOpenVocabList}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100"
          >
            {t.vocabList}
          </motion.button>
        )}
      </div>

      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-semibold text-slate-900 mb-4"
        >
          {t.maskedSentenceTitle}
        </motion.h2>
        <p className="text-lg text-slate-600">{t.fillBlanks}</p>
      </div>

      <div className="mb-8 p-6 bg-white border border-slate-200 rounded-2xl">
        <p className="text-xl text-slate-900 mb-6">{data.masked_sentence}</p>

        <div className="flex flex-wrap gap-3 mb-6">
          {data.answer_words.map((_, idx) => (
            <div
              key={idx}
              className={`px-4 py-2 rounded-lg border min-w-[100px] text-center ${
                answerChecked
                  ? isCorrect
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                  : 'border-slate-300 bg-slate-50'
              }`}
            >
              {selectedWords[idx] ? (
                <span
                  className="cursor-pointer text-slate-900"
                  onClick={() => handleRemoveWord(idx)}
                >
                  {selectedWords[idx].word}
                </span>
              ) : (
                <span className="text-slate-400">____</span>
              )}
            </div>
          ))}
        </div>

        {answerChecked && (
          <div className={`p-4 rounded-lg mb-4 ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-semibold mb-2">{isCorrect ? t.correct : t.incorrect}</p>
            {!isCorrect && (
              <p>
                {t.correctAnswer}: <span className="font-medium">{data.answer_words.join(' ')}</span>
              </p>
            )}
            {isCorrect && data.unit_completed && (
              <p className="font-medium mt-3 text-lg text-green-700">
                🎉 该单元学习已完成！
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">{t.selectWords}</h3>
        <div className="flex flex-wrap gap-3">
          {data.options.map((word, idx) => {
            const isSelected = selectedWords.some(w => w && w.index === idx);
            return (
              <button
                key={idx}
                onClick={() => handleWordSelect(word, idx)}
                disabled={isSelected || answerChecked}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  isSelected || answerChecked
                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                    : 'border-slate-300 bg-white hover:border-black hover:shadow-sm'
                }`}
              >
                {word}
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
            disabled={selectedWords.length === 0}
            className="flex-1 py-4 bg-black text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {t.checkAnswer}
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
            whileTap={{ scale: 0.97, y: 0 }}
            onClick={handleNext}
            disabled={loading}
            className="flex-1 py-4 bg-black text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.loading}
              </>
            ) : data.unit_completed ? (
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

export default MaskedSentenceExerciseStep;
