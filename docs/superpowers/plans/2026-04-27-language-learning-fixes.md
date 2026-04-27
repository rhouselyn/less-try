# Language Learning App Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix issues with the language learning app, including unit completion display, exercise type variety, and LLM consistency.

**Architecture:** The app consists of a FastAPI backend and React frontend. We'll modify both to fix the identified issues.

**Tech Stack:** FastAPI, React, Framer Motion, Axios

---

## Task 1: Fix Phase 1 Unit Completion Display

**Files:**
- Modify: `/workspace/frontend/src/components/AllUnitsStep.jsx`
- Test: Manually test phase 1 unit completion

- [ ] **Step 1: Analyze current AllUnitsStep component**

```javascript
// Check how phase 2 units display completion status
```

- [ ] **Step 2: Modify AllUnitsStep to show phase 1 completion**

```javascript
// Update the component to display phase 1 units with green color and checkmark when completed
```

- [ ] **Step 3: Test phase 1 unit completion display**

Run the app, complete a phase 1 unit, and verify it shows green with checkmark.

## Task 2: Fix Phase 2 Exercise Type Variety

**Files:**
- Modify: `/workspace/backend/main.py`
- Test: Manually test phase 2 exercises

- [ ] **Step 1: Analyze current phase 2 exercise generation**

```python
# Check how exercise types are selected
```

- [ ] **Step 2: Fix exercise type selection**

```python
# Ensure both exercise types (masked sentence and translation reconstruction) are used
```

- [ ] **Step 3: Test phase 2 exercise variety**

Run the app, complete phase 2 exercises, and verify both exercise types are used.

## Task 3: Fix LLM Temperature Setting

**Files:**
- Modify: `/workspace/backend/text_processor.py`
- Test: Run multiple times to verify consistent results

- [ ] **Step 1: Find LLM temperature setting**

```python
# Locate where the temperature is set in the LLM API calls
```

- [ ] **Step 2: Set temperature to 0**

```python
# Change temperature parameter to 0 for consistent results
```

- [ ] **Step 3: Test LLM consistency**

Run the app multiple times with the same input and verify consistent results.

## Task 4: Test Full Workflow with "holy fucking god"

**Files:**
- Test: Manually test the entire workflow

- [ ] **Step 1: Start the app**

Run both backend and frontend servers.

- [ ] **Step 2: Input "holy fucking god"**

Enter the test text and start processing.

- [ ] **Step 3: Test phase 1**

Complete the phase 1 unit, verify it shows as completed, and verify translation questions only appear after completing all words.

- [ ] **Step 4: Test phase 2**

Complete the phase 2 unit, verify both exercise types are used, and verify it shows as completed.

- [ ] **Step 5: Verify all fixes**

Ensure all issues are fixed and the workflow works correctly.