import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../src/App';

jest.mock('../src/utils/api', () => ({
  api: {
    processText: jest.fn(),
    getStatus: jest.fn(),
    getVocab: jest.fn(),
    getSentences: jest.fn(),
    getRandomWord: jest.fn(),
    nextWord: jest.fn(),
    getWordDetails: jest.fn(),
    getLearningProgress: jest.fn(),
    getPhaseUnits: jest.fn(),
    getPhaseUnitExercise: jest.fn(),
    nextPhaseExercise: jest.fn(),
    setProgress: jest.fn(),
    setPhaseProgress: jest.fn(),
    getUnitStars: jest.fn(),
    saveUnitStars: jest.fn(),
    getAppSettings: jest.fn(),
    startWordGen: jest.fn(),
    stopWordGen: jest.fn(),
    getHistory: jest.fn(),
  }
}));

const { api } = require('../src/utils/api');

const mockTranslations = {
  title: 'Test',
  subtitle: 'Test App',
  back: 'Back',
  loading: 'Loading...',
  checkAnswer: 'Check',
  correct: 'Correct',
  incorrect: 'Incorrect',
  nextQuestion: 'Next',
  selectTokensHint: 'Select tokens',
  processing: 'Processing',
  sentTranslation: 'Translations',
  vocabList: 'Vocab',
  preparing: 'Preparing',
};

describe('Phase 1 quiz duplication bug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getAppSettings.mockResolvedValue({});
    api.startWordGen.mockResolvedValue({});
    api.stopWordGen.mockResolvedValue({});
    api.getUnitStars.mockResolvedValue({ stars: {} });
    api.saveUnitStars.mockResolvedValue({});
  });

  test('when nextWord returns a word after a sentence_quiz, step should change to learning', async () => {
    const mockPhase1Units = [
      { unit_id: 0, word_count: 8, exercises_count: 12, completed: false, start_index: 0, end_index: 12 }
    ];
    const mockPhase2Units = [
      { unit_id: 0, exercises_count: 0, completed: true }
    ];

    api.getPhaseUnits.mockResolvedValue({
      phase1: { units: mockPhase1Units, current_unit: 0 },
      phase2: { units: mockPhase2Units, current_unit: 0 }
    });
    api.getPhaseUnits.mockImplementation((fileId, phase) => {
      if (phase === 1) return Promise.resolve({ units: mockPhase1Units, current_unit: 0 });
      return Promise.resolve({ units: mockPhase2Units, current_unit: 0 });
    });

    api.setProgress.mockResolvedValue({ success: true });

    api.getRandomWord.mockResolvedValueOnce({
      type: 'sentence_quiz',
      original_sentence: 'ensembles são proibidos.',
      correct_translation: '集成是被禁止的。',
      correct_tokens: ['集成', '是', '被禁止的', '。'],
      tokens: ['被禁止的', '集成', '。', '是'],
      unit_end_index: 12,
      step_in_unit: 8,
      total_items_in_unit: 12,
      listening_count_in_unit: 1
    });

    api.nextWord.mockResolvedValueOnce({
      success: true,
      new_index: 9,
      unit_end_index: 12
    });

    api.getRandomWord.mockResolvedValueOnce({
      type: 'word',
      word: 'um',
      ipa: '/ũ/',
      correct_meaning: '一个',
      options: ['一个', '两个', '三个', '四个'],
      correct_index: 0,
      context: 'usar um único',
      unit_end_index: 12,
      step_in_unit: 9,
      total_items_in_unit: 12,
      listening_count_in_unit: 1
    });

    render(<App />);

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    expect(screen.queryByText('翻译题')).toBeNull();

    fireEvent.click(screen.getByText('开始学习'));

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByText('翻译题')).toBeInTheDocument();
    });

    const tokenButtons = screen.getAllByText(/集成|被禁止的|是|。/);
    for (const btn of tokenButtons) {
      fireEvent.click(btn);
    }

    fireEvent.click(screen.getByText('Check'));

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByText(/Correct|Incorrect/)).toBeInTheDocument();
    });

    const nextButton = screen.getByText('继续学习');
    fireEvent.click(nextButton);

    await act(async () => {
      await new Promise(r => setTimeout(r, 500));
    });

    await waitFor(() => {
      const stillOnQuiz = screen.queryByText('翻译题');
      expect(stillOnQuiz).toBeNull();
    }, { timeout: 3000 });
  });
});
