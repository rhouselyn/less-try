# Fix Prompt Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix issues with prompts for word options, translation quizzes, and redundant tokens to ensure high-quality learning content.

**Architecture:** Update the prompts in `process_text_with_dictionary` and `generate_multiple_choice` methods to address the specific issues mentioned by the user.

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## Task 1: Fix word options in generate_multiple_choice method

**Files:**
- Modify: `/workspace/backend/nvidia_api.py:124-150`

- [ ] **Step 1: Update generate_multiple_choice prompt**

Update the prompt to ensure:
1. Error answers are meanings the word doesn't have at all
2. Word meanings are short (just a few words)
3. Error answers aren't just meanings not used in the sentence, but completely incorrect meanings

- [ ] **Step 2: Test the changes**

Test the generate_multiple_choice method to verify the word options are correct.

## Task 2: Fix translation quiz in process_text_with_dictionary method

**Files:**
- Modify: `/workspace/backend/nvidia_api.py:316-367`

- [ ] **Step 1: Update process_text_with_dictionary prompt**

Update the prompt to ensure:
1. The tokenized_translation is a natural translation of the whole sentence
2. The translation quiz uses the actual sentence translation, not word-by-word concatenation

- [ ] **Step 2: Test the changes**

Test the process_text_with_dictionary method to verify the translation quiz works correctly.

## Task 3: Fix redundant tokens in process_text_with_dictionary method

**Files:**
- Modify: `/workspace/backend/nvidia_api.py:316-367`

- [ ] **Step 1: Update redundant tokens generation**

Update the prompt to ensure:
1. Redundant tokens don't create another valid translation
2. Redundant tokens are clearly incorrect options

- [ ] **Step 2: Test the changes**

Test the process_text_with_dictionary method to verify the redundant tokens are correct.

## Task 4: Test the overall changes

**Files:**
- Test: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: Test text processing**

Send a test request to `/api/process-text` and verify all components work correctly.

- [ ] **Step 2: Test learning flow**

Test the learning flow to ensure multiple choice questions and translation quizzes work correctly.

- [ ] **Step 3: Verify the fixes**

Confirm all the issues have been addressed:
- Word options have proper error answers
- Word meanings are short
- Translation quizzes use proper sentence translations
- Redundant tokens don't create valid translations

---

## Risk Handling

1. **LLM Response Variability:** The LLM might not always follow the instructions perfectly. We need to ensure the prompt is clear and specific.
2. **Backward Compatibility:** The changes should not break existing functionality.
3. **Performance:** The changes should not significantly increase the response time.

## Expected Outcome

After implementing these changes, the learning content will be more accurate and effective:
- Word multiple choice questions will have clearly incorrect distractors
- Word meanings will be concise and to the point
- Translation quizzes will use natural sentence translations
- Redundant tokens will not create valid alternative translations