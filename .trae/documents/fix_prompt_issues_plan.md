# Fix Prompt Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix several prompt issues in the process_text_with_dictionary method to improve the quality of generated content.

**Architecture:** Update the prompt in the process_text_with_dictionary method to address the specific issues mentioned by the user, including incorrect answer generation, meaning format, translation quiz structure, and redundant token generation.

**Tech Stack:** Python, NVIDIA API, FastAPI

---

## Task 1: Fix incorrect answer generation in multiple choice questions

**Files:**
- Modify: `/workspace/backend/nvidia_api.py:350-370`

- [ ] **Step 1: Update the prompt for multiple choice options**

Add specific instructions to ensure that incorrect options are completely unrelated to the word's actual meanings, not just meanings not used in the sentence context.

## Task 2: Simplify word meaning format in dictionary entries

**Files:**
- Modify: `/workspace/backend/nvidia_api.py:350-370`

- [ ] **Step 1: Update the prompt for word meanings**

Add instructions to ensure that context_meaning fields contain only a few independent words, not full sentence explanations.

## Task 3: Fix translation quiz structure

**Files:**
- Modify: `/workspace/backend/nvidia_api.py:350-370`

- [ ] **Step 1: Update the prompt for translation quiz**

Add instructions to ensure that the translation quiz uses the tokenized full sentence translation as the answer, not a combination of individual word meanings.

## Task 4: Improve redundant token generation

**Files:**
- Modify: `/workspace/backend/nvidia_api.py:350-370`

- [ ] **Step 1: Update the prompt for redundant tokens**

Add instructions to ensure that redundant tokens are generated in the target language and that combinations of incorrect answers don't form reasonable translations.

## Task 5: Test the changes

**Files:**
- Test: `/workspace/backend/main.py`

- [ ] **Step 1: Test text processing with the updated prompt**

Send a test request to `/api/process-text` with sample text and verify the output addresses all the issues.

- [ ] **Step 2: Test learning flow**

Test the learning flow to ensure the changes don't break existing functionality.

---

## Risk Handling

1. **Prompt Length:** The updated prompt may become longer, which could exceed token limits. Monitor the prompt length and adjust if necessary.
2. **LLM Response Variability:** The LLM may not always follow the instructions exactly. Add clear, specific instructions to minimize variability.
3. **Backward Compatibility:** Ensure the changes don't break existing functionality that depends on the current response format.