# Learning App Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix issues with the learning app, including phase 1 unit completion display, phase 2 duplicate questions, and LLM temperature settings.

**Architecture:** The app consists of a FastAPI backend and a React frontend. We'll fix backend logic for question generation and progress tracking, and frontend UI for unit completion display.

**Tech Stack:** FastAPI, React, Python, JavaScript, LLM (Large Language Model)

---

## Task 1: Fix Phase 1 Unit Completion Display

**Files:**
- Modify: `/workspace/frontend/src/components/AllUnitsStep.jsx`
- Test: `/workspace/frontend/tests/AllUnitsStep.test.jsx`

- [ ] **Step 1: Write the failing test**

```javascript
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
      currentPhase1Unit={0}
      currentPhase2Unit={0}
      onPhase1UnitClick={() => {}}
      onPhase2UnitClick={() => {}}
    />
  );
  
  // Check phase 1 completed unit
  const phase1CompletedUnit = screen.getByText('单元 1 (10 个单词)');
  expect(phase1CompletedUnit).toHaveClass('bg-green-100', 'border-green-500');
  
  // Check phase 1 incomplete unit
  const phase1IncompleteUnit = screen.getByText('单元 2 (10 个单词)');
  expect(phase1IncompleteUnit).not.toHaveClass('bg-green-100', 'border-green-500');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test frontend/tests/AllUnitsStep.test.jsx`
Expected: FAIL because phase 1 units don't display completed status correctly

- [ ] **Step 3: Write minimal implementation**

```javascript
// Modify the phase 1 unit rendering part in AllUnitsStep.jsx
const phase1UnitClass = `p-6 rounded-xl border-2 transition-all cursor-pointer ${unit.completed ? 'bg-green-100 border-green-500' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'}`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test frontend/tests/AllUnitsStep.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AllUnitsStep.jsx frontend/tests/AllUnitsStep.test.jsx
git commit -m "fix: phase 1 unit completion display"
```

## Task 2: Fix Phase 2 Duplicate Questions

**Files:**
- Modify: `/workspace/backend/main.py`
- Test: `/workspace/backend/tests/test_phase2_questions.py`

- [ ] **Step 1: Write the failing test**

```python
def test_phase2_questions_not_duplicate():
    """Test that phase 2 questions are not duplicate"""
    import requests
    import json
    
    # Create a test file
    file_id = "test_file_phase2"
    test_text = "holy fucking god"
    
    # Process the text
    response = requests.post(
        "http://localhost:8000/api/process-text",
        json={"text": test_text}
    )
    assert response.status_code == 202
    
    # Wait for processing to complete
    import time
    time.sleep(5)
    
    # Get phase 2 units
    response = requests.get(f"http://localhost:8000/api/{file_id}/phase/2/units")
    assert response.status_code == 200
    units = response.json()
    
    # Get first unit's exercises
    unit_id = 0
    response = requests.get(f"http://localhost:8000/api/{file_id}/phase/2/unit/{unit_id}/exercise")
    assert response.status_code == 200
    first_exercise = response.json()
    
    # Get next exercise
    response = requests.post(
        f"http://localhost:8000/api/{file_id}/phase/2/unit/{unit_id}/next-exercise",
        json={"current_exercise_index": 0, "exercise_type": 0}
    )
    assert response.status_code == 200
    second_exercise = response.json()
    
    # Verify exercises are different
    assert first_exercise["sentence"] != second_exercise["sentence"]
    # Verify both exercise types are used (0 for masked, 1 for translation)
    assert 0 in [first_exercise.get("exercise_type"), second_exercise.get("exercise_type")]
    assert 1 in [first_exercise.get("exercise_type"), second_exercise.get("exercise_type")]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_phase2_questions.py -v`
Expected: FAIL because phase 2 questions are duplicate

- [ ] **Step 3: Write minimal implementation**

```python
# Modify get_phase_unit_exercise function in main.py
@app.get("/api/{file_id}/phase/{phase_number}/unit/{unit_id}/exercise")
async def get_phase_unit_exercise(file_id: str, phase_number: int, unit_id: int):
    """获取指定单元的练习"""
    try:
        # 加载数据
        sentences = storage.load_pipeline_data(file_id)
        if not sentences:
            raise HTTPException(status_code=404, detail="No sentences found")
        
        # 分组句子
        sentence_list = [s["sentence"] for s in sentences if "sentence" in s]
        units = text_processor.group_sentences_into_units(sentence_list, 8)
        
        if unit_id >= len(units):
            raise HTTPException(status_code=404, detail="Unit not found")
        
        unit_sentences = units[unit_id]
        
        # 加载进度
        progress = storage.load_phase_progress(file_id, phase_number)
        exercise_index = progress["exercise_index"]
        
        # 找到下一个有效练习，跳过只有单个token的句子
        while exercise_index < len(unit_sentences):
            sentence_idx = exercise_index
            
            current_sentence_data = unit_sentences[sentence_idx]
            current_sentence = current_sentence_data["sentence"]
            
            # 检查是否有多个token
            if has_multiple_tokens(current_sentence_data):
                print(f"[DEBUG] 找到有效练习，句子: {current_sentence}")
                break
            
            print(f"[DEBUG] 句子只有单个token，跳过: {current_sentence}")
            exercise_index += 1
        
        if exercise_index >= len(unit_sentences):
            # 没有更多有效练习
            return {
                "unit_completed": True,
                "message": "No more eligible sentences for exercises"
            }
        
        # 确定练习类型
        sentence_idx = exercise_index
        # 循环练习类型：0 for masked, 1 for translation
        exercise_type = exercise_index % 2
        
        current_sentence_data = unit_sentences[sentence_idx]
        current_sentence = current_sentence_data["sentence"]
        
        print(f"[DEBUG] 生成练习，句子: {current_sentence}, 练习类型: {exercise_type}")
        
        if exercise_type == 0:
            # 生成填空练习
            masked_sentence, correct_word, options = text_processor.generate_masked_sentence(
                current_sentence_data, 
                all_sentences=sentences  # 传递所有句子用于选择干扰词
            )
            
            return {
                "exercise_type": 0,
                "sentence": current_sentence,
                "masked_sentence": masked_sentence,
                "correct_word": correct_word,
                "options": options,
                "unit_completed": False
            }
        else:
            # 生成翻译练习
            tokens = current_sentence_data.get("tokens", [])
            target_translation = current_sentence_data.get("translation", "")
            
            # 打乱tokens
            import random
            shuffled_tokens = random.sample(tokens, len(tokens))
            
            return {
                "exercise_type": 1,
                "sentence": current_sentence,
                "translation": target_translation,
                "tokens": shuffled_tokens,
                "unit_completed": False
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] get_phase_unit_exercise: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Modify next_phase_exercise function in main.py
@app.post("/api/{file_id}/phase/{phase_number}/unit/{unit_id}/next-exercise")
async def next_phase_exercise(file_id: str, phase_number: int, unit_id: int, request: dict):
    """获取下一个练习"""
    try:
        current_exercise_index = request.get("current_exercise_index", 0)
        
        # 加载数据
        sentences = storage.load_pipeline_data(file_id)
        if not sentences:
            raise HTTPException(status_code=404, detail="No sentences found")
        
        # 分组句子
        sentence_list = [s["sentence"] for s in sentences if "sentence" in s]
        units = text_processor.group_sentences_into_units(sentence_list, 8)
        
        if unit_id >= len(units):
            raise HTTPException(status_code=404, detail="Unit not found")
        
        unit_sentences = units[unit_id]
        max_exercises = len(unit_sentences)
        
        # 找到下一个有效练习，跳过只有单个token的句子
        new_exercise_index = current_exercise_index + 1
        while new_exercise_index < max_exercises:
            sentence_idx = new_exercise_index
            current_sentence_data = unit_sentences[sentence_idx]
            
            if has_multiple_tokens(current_sentence_data):
                break
            
            print(f"[DEBUG] 句子只有单个token，跳过: {current_sentence_data['sentence']}")
            new_exercise_index += 1
        
        if new_exercise_index >= max_exercises:
            # 没有更多有效练习，保存进度
            storage.save_phase_progress(file_id, phase_number, unit_id + 1, 0)
            return {
                "unit_completed": True,
                "message": "No more eligible sentences for exercises"
            }
        
        # 保存新进度
        storage.save_phase_progress(file_id, phase_number, unit_id, new_exercise_index)
        
        # 确定练习类型
        sentence_idx = new_exercise_index
        exercise_type = new_exercise_index % 2
        
        current_sentence_data = unit_sentences[sentence_idx]
        current_sentence = current_sentence_data["sentence"]
        
        print(f"[DEBUG] 生成下一个练习，句子: {current_sentence}, 练习类型: {exercise_type}")
        
        if exercise_type == 0:
            # 生成填空练习
            masked_sentence, correct_word, options = text_processor.generate_masked_sentence(
                current_sentence_data, 
                all_sentences=sentences  # 传递所有句子用于选择干扰词
            )
            
            return {
                "exercise_type": 0,
                "sentence": current_sentence,
                "masked_sentence": masked_sentence,
                "correct_word": correct_word,
                "options": options,
                "unit_completed": False
            }
        else:
            # 生成翻译练习
            tokens = current_sentence_data.get("tokens", [])
            target_translation = current_sentence_data.get("translation", "")
            
            # 打乱tokens
            import random
            shuffled_tokens = random.sample(tokens, len(tokens))
            
            return {
                "exercise_type": 1,
                "sentence": current_sentence,
                "translation": target_translation,
                "tokens": shuffled_tokens,
                "unit_completed": False
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] next_phase_exercise: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_phase2_questions.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_phase2_questions.py
git commit -m "fix: phase 2 duplicate questions"
```

## Task 3: Fix LLM Temperature Setting

**Files:**
- Modify: `/workspace/backend/llm_utils.py`
- Test: `/workspace/backend/tests/test_llm_temperature.py`

- [ ] **Step 1: Write the failing test**

```python
def test_llm_temperature_is_zero():
    """Test that LLM temperature is set to 0 for consistent results"""
    import importlib
    llm_utils = importlib.import_module('llm_utils')
    
    # Check if temperature is set to 0
    assert hasattr(llm_utils, 'TEMPERATURE'), "TEMPERATURE constant not defined"
    assert llm_utils.TEMPERATURE == 0, f"Expected temperature 0, got {llm_utils.TEMPERATURE}"
    
    # Check if temperature is used in LLM calls
    import inspect
    source = inspect.getsource(llm_utils)
    assert 'temperature=TEMPERATURE' in source, "Temperature not used in LLM calls"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_llm_temperature.py -v`
Expected: FAIL because LLM temperature is not set to 0

- [ ] **Step 3: Write minimal implementation**

```python
# Modify llm_utils.py to set temperature to 0
TEMPERATURE = 0

# Use this temperature in all LLM calls
def generate_translation(text):
    # ... existing code ...
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        temperature=TEMPERATURE,  # Use the constant here
        # ... other parameters ...
    )
    # ... existing code ...
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_llm_temperature.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/llm_utils.py backend/tests/test_llm_temperature.py
git commit -m "fix: set LLM temperature to 0 for consistent results"
```

## Task 4: End-to-End Test for "holy fucking god"

**Files:**
- Create: `/workspace/tests/e2e_test.py`

- [ ] **Step 1: Write the end-to-end test**

```python
def test_holy_fucking_god():
    """End-to-end test for 'holy fucking god'"""
    import requests
    import time
    
    # Test data
    test_text = "holy fucking god"
    file_id = "test_holy_fucking_god"
    
    # Step 1: Process text
    print("Step 1: Processing text...")
    response = requests.post(
        "http://localhost:8000/api/process-text",
        json={"text": test_text}
    )
    assert response.status_code == 202, f"Expected 202, got {response.status_code}"
    print("✓ Text processing started")
    
    # Step 2: Wait for processing to complete
    print("Step 2: Waiting for processing to complete...")
    time.sleep(10)  # Give enough time for processing
    
    # Step 3: Check if processing is complete
    print("Step 3: Checking processing status...")
    response = requests.get(f"http://localhost:8000/api/{file_id}/processing-status")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    status = response.json()
    assert status["status"] == "completed", f"Expected completed, got {status['status']}"
    print("✓ Processing completed")
    
    # Step 4: Test phase 1
    print("Step 4: Testing phase 1...")
    response = requests.get(f"http://localhost:8000/api/{file_id}/phase/1/units")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    phase1_units = response.json()
    assert len(phase1_units["units"]) > 0, "No phase 1 units"
    print(f"✓ Phase 1 has {len(phase1_units['units'])} units")
    
    # Step 5: Test phase 2
    print("Step 5: Testing phase 2...")
    response = requests.get(f"http://localhost:8000/api/{file_id}/phase/2/units")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    phase2_units = response.json()
    assert len(phase2_units["units"]) > 0, "No phase 2 units"
    print(f"✓ Phase 2 has {len(phase2_units['units'])} units")
    
    # Step 6: Test phase 2 exercises
    print("Step 6: Testing phase 2 exercises...")
    unit_id = 0
    response = requests.get(f"http://localhost:8000/api/{file_id}/phase/2/unit/{unit_id}/exercise")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    first_exercise = response.json()
    assert "exercise_type" in first_exercise, "No exercise_type in response"
    print(f"✓ First exercise type: {first_exercise['exercise_type']}")
    
    # Step 7: Test next exercise
    print("Step 7: Testing next exercise...")
    response = requests.post(
        f"http://localhost:8000/api/{file_id}/phase/2/unit/{unit_id}/next-exercise",
        json={"current_exercise_index": 0, "exercise_type": first_exercise["exercise_type"]}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    second_exercise = response.json()
    assert "exercise_type" in second_exercise, "No exercise_type in response"
    print(f"✓ Second exercise type: {second_exercise['exercise_type']}")
    assert first_exercise["sentence"] != second_exercise["sentence"], "Exercises are duplicate"
    print("✓ Exercises are not duplicate")
    
    print("\n🎉 All tests passed! The app is working correctly for 'holy fucking god'.")
```

- [ ] **Step 2: Run the end-to-end test**

Run: `python -m pytest tests/e2e_test.py -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/e2e_test.py
git commit -m "test: add end-to-end test for 'holy fucking god'"
```

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-27-fix-learning-app.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**