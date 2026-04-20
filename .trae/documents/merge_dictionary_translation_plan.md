# Merge Dictionary and Translation Methods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `generate_dictionary` and `split_and_translate` methods into a single `process_text_with_dictionary` method to reduce LLM calls and improve performance.

**Architecture:** Replace the two separate LLM calls (one for translation, one for dictionary) with a single call that handles both tasks, then update all dependent code to use the new method structure.

**Tech Stack:** Python, FastAPI, NVIDIA API, React

---

## Task 1: Merge methods in nvidia_api.py

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: Add the new process_text_with_dictionary method**

Add the new method that combines the functionality of `split_and_translate` and `generate_dictionary`.

- [ ] **Step 2: Remove the old methods**

Remove the `split_and_translate` and `generate_dictionary` methods since they're now replaced by the new method.

## Task 2: Update text_processor.py to use the new method

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: Update process_translation method**

Modify the `process_translation` method to call the new `process_text_with_dictionary` method instead of the old `split_and_translate` method.

- [ ] **Step 2: Update extract_words_from_sentences method (if needed)**

Ensure the method still works with the new response structure.

## Task 3: Update main.py to handle the new response structure

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: Update process_text_background function**

Update the function to use the new method and handle the combined response structure, extracting both sentence translations and dictionary entries.

- [ ] **Step 2: Update get_word_details function**

Ensure it still works with the new data structure.

- [ ] **Step 3: Update get_unit_words function**

Ensure it still works with the new data structure.

## Task 4: Update frontend components

**Files:**
- Modify: `/workspace/frontend/src/components/DictionaryStep.jsx`
- Modify: `/workspace/frontend/src/components/WordDetail.jsx`

- [ ] **Step 1: Change button text in DictionaryStep.jsx**

Change "start random learning" to "start learning" in the button text.

- [ ] **Step 2: Remove study button in WordDetail.jsx**

Remove the "study this word" button from the word detail card.

## Task 5: Test the changes

**Files:**
- Test: `/workspace/backend/main.py`
- Test: `/workspace/frontend/src/App.jsx`

- [ ] **Step 1: Test text processing**

Send a test request to `/api/process-text` with sample text and verify the response contains both translations and dictionary entries.

- [ ] **Step 2: Test learning flow**

Test the learning flow to ensure it still works with the new data structure, including generating multiple choice questions and sentence quizzes.

- [ ] **Step 3: Test frontend changes**

Verify the button text has changed and the study button has been removed.

- [ ] **Step 4: Compare results**

Ensure the results are the same as before the merge, including translation quality and dictionary entries.

---

## Risk Handling

1. **API Compatibility:** The new method returns a different structure, so all dependent code must be updated to handle it.
2. **LLM Response Format:** The LLM might not always return the expected structure, so error handling should be in place.
3. **Performance:** While reducing LLM calls should improve performance, the single call might take longer to process. Monitor response times.
4. **Backward Compatibility:** Ensure the changes don't break existing functionality that depends on the old methods.