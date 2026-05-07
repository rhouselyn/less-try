import React from 'react';
import { render, screen } from '@testing-library/react';
import AllUnitsStep from '../src/components/AllUnitsStep';

test('Phase 1 units should display completed status with green color and checkmark', () => {
  const mockPhase1Units = [
    { unit_id: 0, word_count: 10, completed: true },
    { unit_id: 1, word_count: 10, completed: false }
  ];
  
  const mockPhase2Units = [
    { unit_id: 0, sentences_count: 8, completed: true },
    { unit_id: 1, sentences_count: 8, completed: false }
  ];
  
  render(
    <AllUnitsStep
      phase1Units={mockPhase1Units}
      phase2Units={mockPhase2Units}
      currentPhase1Unit={1}
      currentPhase2Unit={0}
      onPhase1UnitClick={() => {}}
      onPhase2UnitClick={() => {}}
      onBack={() => {}}
      t={{
        back: '返回',
        phase1: '阶段一：单词学习',
        phase2: '阶段二：句子练习',
        loading: '加载中...'
      }}
    />
  );
  
  // Check phase 1 completed unit
  const phase1Units = screen.getAllByText('单元 1');
  const phase1CompletedUnit = phase1Units[0].closest('button');
  expect(phase1CompletedUnit).toHaveClass('border-green-500', 'bg-green-100');
  
  // Check phase 1 incomplete unit
  const phase2Units = screen.getAllByText('单元 2');
  const phase1IncompleteUnit = phase2Units[0].closest('button');
  expect(phase1IncompleteUnit).not.toHaveClass('border-green-500', 'bg-green-100');
});