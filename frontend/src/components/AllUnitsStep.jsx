import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, Star, Headphones, Loader2, Home, BookOpen, PenTool, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const UNITS_PER_PAGE = 30;

function AllUnitsStep({
  phase1Units,
  phase2Units,
  currentPhase1Unit,
  currentPhase2Unit,
  onPhase1UnitClick,
  onPhase2UnitClick,
  onBack,
  onHome,
  loading,
  t,
  unitStarCounts,
  skipListening,
  onSkipListeningChange,
  onlyNewWords,
  onOnlyNewWordsChange,
  generatingUnits,
  fileTitle,
  currentFileId
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const containerRef = useRef(null);
  const tabRef = useRef(0);
  const scrollRef = useRef(0);
  const pageRef = useRef(0);

  useEffect(() => {
    tabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    if (containerRef.current) {
      scrollRef.current = containerRef.current.scrollTop;
    }
  });

  useEffect(() => {
    const savedTab = tabRef.current;
    const savedPage = pageRef.current;
    const savedScroll = scrollRef.current;
    setActiveTab(savedTab);
    setPage(savedPage);
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = savedScroll;
      }
    });
  }, []);

  const isPhase1Unlocked = (index) => {
    if (index === 0) return true;
    for (let i = 0; i < index; i++) {
      if (!phase1Units[i]?.completed) return false;
    }
    return true;
  };

  const isPhase2Unlocked = (index) => {
    if (index === 0) return true;
    for (let i = 0; i < index; i++) {
      if (!phase2Units[i]?.completed) return false;
    }
    return true;
  };

  const phase1Completed = phase1Units.filter(u => u.completed).length;
  const phase2Completed = phase2Units.filter(u => u.completed).length;
  const phase1Total = phase1Units.length;
  const phase2Total = phase2Units.length;

  const tabs = [
    { key: 'phase1', label: t.phase1, icon: BookOpen, completed: phase1Completed, total: phase1Total },
    { key: 'phase2', label: t.phase2, icon: PenTool, completed: phase2Completed, total: phase2Total }
  ];

  const currentUnits = activeTab === 0 ? phase1Units : phase2Units;
  const totalPages = Math.max(1, Math.ceil(currentUnits.length / UNITS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedUnits = currentUnits.slice(safePage * UNITS_PER_PAGE, (safePage + 1) * UNITS_PER_PAGE);
  const pageOffset = safePage * UNITS_PER_PAGE;

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, page]);

  const renderUnitCard = (unit, index, onClick, keyPrefix, isUnlocked, phaseNumber) => {
    const isCompleted = unit.completed;
    const isGenerating = phaseNumber === 1 && generatingUnits?.has(index);
    const isLocked = !isUnlocked && !isCompleted && !isGenerating;
    const isCurrent = (phaseNumber === 1 && index === currentPhase1Unit) || (phaseNumber === 2 && index === currentPhase2Unit);
    const starKey = `${phaseNumber}-${index}`;
    const starCount = unitStarCounts?.[starKey];

    return (
      <motion.button
        key={`${keyPrefix}-unit-${index}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (index - pageOffset) * 0.03, duration: 0.25 }}
        whileHover={!isLocked && !isGenerating ? { y: -2, transition: { duration: 0.15 } } : {}}
        whileTap={!isLocked && !isGenerating ? { scale: 0.97 } : {}}
        onClick={isLocked || isGenerating ? undefined : onClick}
        disabled={isLocked || isGenerating}
        className={`relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 ${
          isCompleted
            ? 'bg-emerald-50/80 border border-emerald-200/50 hover:bg-emerald-50'
            : isGenerating
            ? 'bg-amber-50/50 border border-amber-200/30 cursor-not-allowed'
            : isLocked
            ? 'bg-stone-50/50 border border-stone-200/30 cursor-not-allowed'
            : isCurrent
            ? 'bg-amber-50/60 border border-amber-300/70 shadow-sm'
            : 'bg-white border border-stone-200/50 hover:border-amber-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
        }`}
        style={{ width: '3.75rem', height: '3.75rem' }}
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        ) : isLocked ? (
          <Lock className="w-3.5 h-3.5 text-stone-300" />
        ) : isCompleted ? (
          <>
            <span className="text-[13px] font-semibold text-emerald-600">{index + 1}</span>
            {typeof starCount === 'number' && (
              <div className="flex items-center justify-center gap-px mt-0.5">
                {[0, 1, 2].map((i) => (
                  <Star
                    key={i}
                    className={`w-2 h-2 ${
                      i < starCount
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-stone-200 fill-stone-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <span className={`text-[13px] font-semibold ${isCurrent ? 'text-amber-600' : 'text-stone-500'}`}>{index + 1}</span>
            {isCurrent && <div className="w-3 h-[2px] rounded-full mt-1 bg-amber-400" />}
          </>
        )}
      </motion.button>
    );
  };

  const renderPhaseContent = (phaseNumber) => {
    const units = phaseNumber === 1 ? phase1Units : phase2Units;
    const currentUnit = phaseNumber === 1 ? currentPhase1Unit : currentPhase2Unit;
    const onClick = phaseNumber === 1 ? onPhase1UnitClick : onPhase2UnitClick;
    const keyPrefix = phaseNumber === 1 ? 'phase1' : 'phase2';
    const isUnlockedFn = phaseNumber === 1 ? isPhase1Unlocked : isPhase2Unlocked;
    const completed = phaseNumber === 1 ? phase1Completed : phase2Completed;
    const total = phaseNumber === 1 ? phase1Total : phase2Total;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    if (phaseNumber === 2 && (units.length === 0 || (units.length === 1 && units[0]?.no_eligible_sentences))) {
      return (
        <div className="py-12 text-center">
          <p className="text-xs text-stone-400">{t.noPracticeContent || '暂无可练习内容'}</p>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-stone-400 tabular-nums">{completed}<span className="text-stone-300">/{total}</span></span>
          </div>
          {totalPages > 1 && (
            <span className="text-[11px] text-stone-300 tabular-nums">{safePage + 1}/{totalPages}</span>
          )}
        </div>

        <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden mb-5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              phaseNumber === 1 ? 'bg-emerald-400' : 'bg-blue-400'
            }`}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {pagedUnits.map((unit, i) => {
            const globalIndex = pageOffset + i;
            return renderUnitCard(
              unit,
              globalIndex,
              () => onClick(globalIndex),
              keyPrefix,
              isUnlockedFn(globalIndex),
              phaseNumber
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-5">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className={`p-1.5 rounded-lg transition-colors ${
                safePage === 0 ? 'text-stone-200 cursor-not-allowed' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === safePage
                      ? 'w-4 h-1.5 bg-stone-700'
                      : 'w-1.5 h-1.5 bg-stone-200 hover:bg-stone-300'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage === totalPages - 1}
              className={`p-1.5 rounded-lg transition-colors ${
                safePage === totalPages - 1 ? 'text-stone-200 cursor-not-allowed' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const ToggleSwitch = ({ checked, onChange, label, icon: Icon }) => (
    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
      <span className="text-[11px] text-stone-400 group-hover:text-stone-600 transition-colors flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked || false}
          onChange={(e) => onChange?.(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-7 h-4 bg-stone-200 peer-focus:outline-none rounded-full peer-checked:bg-amber-400 transition-colors" />
        <div className="absolute left-[1.5px] top-[1.5px] bg-white w-[13px] h-[13px] rounded-full transition-transform peer-checked:translate-x-3 shadow-sm" />
      </div>
    </label>
  );

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={onBack}
          className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors rounded-lg hover:bg-stone-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {fileTitle && (
          <span className="text-sm font-medium text-stone-500 truncate max-w-[240px]">
            {fileTitle}
          </span>
        )}

        <div className="flex-1 min-w-0" />

        <ToggleSwitch
          checked={onlyNewWords}
          onChange={onOnlyNewWordsChange}
          label={t.onlyNewWords || '只学新词'}
          icon={Sparkles}
        />

        <ToggleSwitch
          checked={skipListening}
          onChange={onSkipListeningChange}
          label={t.skipListening || '跳过听力'}
          icon={Headphones}
        />

        <button
          onClick={onHome}
          className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          title={t.backToHome || '返回主页'}
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-stone-800">
          {t.learningUnits || '学习单元'}
        </h2>
        <p className="text-[11px] text-stone-400 mt-1">{t.completeUnitsInOrder || '按顺序完成单元，解锁下一单元'}</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          <p className="text-xs text-stone-400">{t.loading}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="bg-stone-50/80 px-3 pt-2.5">
            <div className="flex gap-1 relative">
              {tabs.map((tab, i) => {
                const Icon = tab.icon;
                const isActive = activeTab === i;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(i); setPage(0); }}
                    className="relative flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-[13px] font-medium"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0 bg-white rounded-t-xl shadow-[0_-1px_4px_rgba(0,0,0,0.04)]"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <div className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                      isActive ? 'text-stone-800' : 'text-stone-400 hover:text-stone-600'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      {tab.total > 0 && (
                        <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full transition-colors duration-300 ${
                          isActive ? 'bg-stone-100 text-stone-500' : 'text-stone-300'
                        }`}>
                          {tab.completed}/{tab.total}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="relative h-[2px] mx-3">
              <motion.div
                className="absolute bottom-0 h-[2px] bg-stone-700 rounded-full"
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{
                  width: `${100 / tabs.length - 10}%`,
                  left: `${activeTab * (100 / tabs.length) + 5}%`,
                }}
              />
            </div>
          </div>

          <div className="px-5 pb-5 pt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {renderPhaseContent(activeTab + 1)}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default AllUnitsStep;
