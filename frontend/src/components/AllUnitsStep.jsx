
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';

function AllUnitsStep({ 
  phase1Units, 
  phase2Units, 
  currentPhase1Unit, 
  currentPhase2Unit, 
  onPhase1UnitClick, 
  onPhase2UnitClick, 
  onBack, 
  loading, 
  t 
}) {
  const renderUnitCard = (unit, index, isCurrent, onClick, keyPrefix) => {
    const isCompleted = unit.completed;
    
    return (
      <motion.button
        key={`${keyPrefix}-unit-${index}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.03 }}
        onClick={onClick}
        className={`relative p-4 border rounded-xl transition-all text-left min-h-[100px] ${
          isCompleted
            ? 'border-[#788c5d] bg-[#788c5d]/10'
            : isCurrent
            ? 'border-[#d97757] bg-[#d97757]/10 shadow-sm'
            : 'border-[#e8e6dc] bg-white hover:border-[#b0aea5] hover:shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <span className="text-base font-medium text-[#141413]">
              单元 {index + 1}
            </span>
            <p className="text-sm text-[#b0aea5] mt-1">
              {unit.no_eligible_sentences ? '无需练习' : `${unit.word_count || unit.exercises_count || unit.sentences_count || 0} ${unit.word_count ? '个单词' : '个题目'}`}
            </p>
          </div>
          {isCompleted && (
            <div className="w-6 h-6 rounded-full bg-[#788c5d] flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
          {isCurrent && !isCompleted && (
            <span className="text-xs font-medium text-[#d97757] bg-[#d97757]/10 px-2 py-1 rounded">
              当前
            </span>
          )}
        </div>
      </motion.button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto"
    >
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-[#b0aea5] hover:text-[#141413] transition-colors rounded-lg hover:bg-[#e8e6dc]/50 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </motion.button>

      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-semibold text-[#141413] mb-2"
        >
          学习单元
        </motion.h2>
        <p className="text-base text-[#b0aea5]">选择单元开始学习</p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-lg text-[#b0aea5]">{t.loading}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-medium text-[#141413] mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#d97757] text-white rounded-full flex items-center justify-center text-xs font-medium">1</span>
              {t.phase1}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {phase1Units.map((unit, index) => 
                renderUnitCard(
                  unit, 
                  index, 
                  index === currentPhase1Unit, 
                  () => onPhase1UnitClick(index),
                  'phase1'
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-[#141413] mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#6a9bcc] text-white rounded-full flex items-center justify-center text-xs font-medium">2</span>
              {t.phase2}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {phase2Units.map((unit, index) => 
                renderUnitCard(
                  unit, 
                  index, 
                  index === currentPhase2Unit, 
                  () => onPhase2UnitClick(index),
                  'phase2'
                )
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default AllUnitsStep;
