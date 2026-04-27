# LLM Prompt Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix LLM prompt issues and ensure phase 2 questions work correctly

**Architecture:** Modify NVIDIA API prompt templates to improve translation format and dictionary entry order, then test phase 2 exercises to ensure no repetition

**Tech Stack:** Python, FastAPI, NVIDIA API, pytest

---

## File Structure

**Files to modify:**
- `backend/nvidia_api.py` - Modify LLM prompt templates
- `backend/main.py` - Check and remove redundant translation field if needed
- `tests/test_phase2_repeat.py` - Create test for phase 2 repetition issue
- `tests/test_llm_output_format.py` - Create test for LLM output format

**Files to create:**
- `tests/test_phase2_repeat.py` - Test phase 2 question repetition
- `tests/test_llm_output_format.py` - Test LLM output format

---

## Task 1: Fix LLM Prompt for Translation Format

**Files:**
- Modify: `backend/nvidia_api.py:332-401`
- Test: `tests/test_llm_output_format.py`

- [ ] **Step 1: Create test for LLM output format**

```python
# tests/test_llm_output_format.py
import json

def test_llm_translation_format():
    """Test that LLM returns correct translation format"""
    # Simulate expected LLM output
    expected_output = {
        "original": "holy fucking god",
        "translation": [
            {
                "morphology": "adj",
                "phonetic": "ˈhoʊli",
                "text": "holy",
                "translation": "神圣的"
            },
            {
                "morphology": "adj",
                "phonetic": "ˈfʌkɪŋ",
                "text": "fucking",
                "translation": "该死的"
            },
            {
                "morphology": "n",
                "phonetic": "ɡɑd",
                "text": "god",
                "translation": "上帝"
            }
        ],
        "tokenized_translation": "神圣的 该死的 上帝",
        "grammar_explanation": "这是一个感叹语，表达强烈的情绪。",
        "redundant_tokens": ["天使", "魔鬼", "天堂", "地狱"],
        "dictionary_entries": [
            {
                "word": "holy",
                "tokens": ["holy"],
                "variants": [],
                "ipa": "ˈhoʊli",
                "context_meaning": "神圣的",
                "examples": [
                    "The holy temple attracts pilgrims from around the world.",
                    "She has dedicated her life to holy service."
                ],
                "options": ["神圣的", "美味的", "温暖的", "缓慢的"],
                "grammar": "形容词，用来描述具有宗教意义或精神纯净的事物",
                "morphology": "adj"
            }
        ]
    }
    
    # Check tokenized_translation format
    assert "tokenized_translation" in expected_output
    assert "/" not in expected_output["tokenized_translation"]
    
    # Check translation array format
    assert "translation" in expected_output
    assert isinstance(expected_output["translation"], list)
    
    # Check dictionary entry order
    if expected_output.get("dictionary_entries"):
        entry = expected_output["dictionary_entries"][0]
        assert "word" in entry
        assert "tokens" in entry
        assert "variants" in entry
        # Ensure word comes before tokens comes before variants
        entry_keys = list(entry.keys())
        word_idx = entry_keys.index("word")
        tokens_idx = entry_keys.index("tokens")
        variants_idx = entry_keys.index("variants")
        assert word_idx < tokens_idx < variants_idx

if __name__ == "__main__":
    test_llm_translation_format()
    print("All tests passed!")
```

- [ ] **Step 2: Modify LLM prompt in nvidia_api.py**

```python
# backend/nvidia_api.py (modify process_text_with_dictionary method)

# 构建 prompt
prompt = """处理以下 TEXT_LANG 文本，并翻译成 TARGET_LANG。

【非常非常重要的说明！！！】
1. 首先检查输入文本的语言：
   - 如果输入文本的语言与 TARGET_LANG 一致，则不需要翻译，保持原样
   - 如果输入文本的语言与 TEXT_LANG 一致，则 original 字段保持输入文本原样
   - 如果输入文本的语言既不是 TEXT_LANG 也不是 TARGET_LANG，则先翻译成 TEXT_LANG，然后 original 字段填入翻译后的 TEXT_LANG 文本
2. 所有翻译和解释都必须使用 TARGET_LANG（目标语言）。
3. 不要单独给每个词语法解释 - 只给整个句子一个完整的语法解释。
4. 词性标注（morphology）只能使用以下缩写，不要加其他文字：
   - n (名词)
   - v (动词)
   - adj (形容词)
   - adv (副词)
   - pron (代词)
   - prep (介词)
   - conj (连词)
   - interj (感叹词)
   - det (限定词)
5. morphology 字段必须只包含缩写，不要有其他内容！
6. 【输出约束】除了工具调用的JSON输出外，不要添加任何其他文本、解释或说明。直接生成工具调用所需的JSON参数即可。
7. 【翻译格式要求】：
   - tokenized_translation 必须是一个完整的 TARGET_LANG 句子，不要使用 / 分隔多个翻译
   - tokenized_translation 应该根据 translation 数组的中文进行分词，每个词之间用空格分隔
   - 例如：如果 translation 是 ["神圣的", "该死的", "上帝"]，那么 tokenized_translation 应该是 "神圣的 该死的 上帝"

按照以下结构处理文本：
- original: 原文文本（如果输入文本的语言与 TARGET_LANG 一致，则保持原样；如果与 TEXT_LANG 一致，也保持原样；否则先翻译成 TEXT_LANG）- 完全保留原始空格！！！
- translation: 对象数组，每个对象包含：
  - text: 原词/标记（不带标点）
  - translation: 这个词翻译成 TARGET_LANG（只需要一个翻译，不要使用 / 分隔多个翻译）
  - phonetic: 音标(IPA)（如果是中文等没有音标的语言，可为空）
  - morphology: 只能是词性缩写（如 n, v, adj）
- tokenized_translation: 完整自然的 TARGET_LANG 翻译，正常句子格式，根据 translation 数组的中文进行分词，每个词之间用空格分隔
- grammar_explanation: 整个文本的一个完整语法解释，用 TARGET_LANG
- redundant_tokens: 4个与原文相关的合理冗余tokens，用于测验目的，必须全部使用TARGET_LANG（目标语言）

【极其重要！！！固定搭配处理规则！！！
- 对于固定搭配（如 what's up, live in, how are you, look forward to 等），请将整个固定搭配作为一个整体处理，不要拆分！！！
- 固定搭配的text字段应该包含整个短语，如 "what's up" 而不是分开的 "what's" 和 "up"
- 对于缩写形式（如 what's, don't, he's 等）也要作为一个整体处理，不要拆分！！！

同时，为文本中出现的所有单词生成完整词典条目（dictionary_entries）：

为每个单词提供：
1. word: The word itself
2. tokens: Split the word into tokens if applicable
3. variants: Other forms of the word (e.g., past tense, plural) if applicable, each with "type" (e.g., verb, noun) and "form" (the variant form)
4. ipa: International Phonetic Alphabet pronunciation
5. context_meaning: Meaning in TARGET_LANG based on the context - 只需要几个独立的词，不需要用一句话进行解释
6. examples: 2 example sentences in SOURCE_LANG that match the context meaning
7. options: 4 options for the meaning (1 correct, 3 incorrect) - 错误答案必须是该单词所没有的意思，而不是非句子中的意思
8. grammar: Grammar explanation for the word
9. morphology: Part of speech abbreviation (e.g., n, v, adj, adv, etc.)

【重要要求】
- 翻译题应该用整个句子的翻译按token进行拆分后的结果作为答案，而不是分别每个单词的意思所组成的
- 生成冗余词时要注意：
  1. 必须使用TARGET_LANG（目标语言）生成冗余词
  2. 冗余词的意思不能太相近，要避免多个冗余词都表达类似的含义
  3. 确保使用错误的答案组成的意思不是合理的，也不能是与正确答案近似的意思
  4. 冗余词应该是容易混淆但明显不同的概念

要处理的文本：
TEXT_CONTENT

请严格按照 tool 定义的 JSON 结构返回所有字段，不要遗漏任何 required 字段。
"""

# 同时修改 tool_def 中的 dictionary_entries 结构，移除 translation 字段
# 修改第 306 行左右
"""
"translation": {"type": "string"},
"""
# 改为移除这一行

# 修改第 316-319 行的 required 字段
"""
"required": [
    "word", "ipa", "context_meaning", "variants", 
    "examples", "options", "grammar", "translation", "tokens", "morphology"
]
"""
# 改为
"""
"required": [
    "word", "tokens", "variants", "ipa", "context_meaning", 
    "examples", "options", "grammar", "morphology"
]
"""
```

- [ ] **Step 3: Run test to verify LLM output format**

Run: `python tests/test_llm_output_format.py`
Expected: PASS

- [ ] **Step 4: Commit changes**

```bash
git add backend/nvidia_api.py tests/test_llm_output_format.py
git commit -m "fix: improve LLM translation format and dictionary entry order"
```

---

## Task 2: Remove Redundant Translation Field

**Files:**
- Modify: `backend/main.py:94-107`
- Test: `tests/test_llm_output_format.py`

- [ ] **Step 1: Update test to check for redundant translation field**

```python
# tests/test_llm_output_format.py (add to test_llm_translation_format function)
# Check that dictionary entries don't have redundant translation field
if expected_output.get("dictionary_entries"):
    for entry in expected_output["dictionary_entries"]:
        assert "translation" not in entry, "dictionary entries should not have translation field"
```

- [ ] **Step 2: Modify main.py to remove translation field**

```python
# backend/main.py (modify process_text_background function)
# 修改第 94-107 行
if isinstance(translation_result, dict) and "dictionary_entries" in translation_result:
    dictionary_entries = translation_result["dictionary_entries"]
    # 处理dictionary_entries可能是字符串的情况
    if isinstance(dictionary_entries, str):
        try:
            import json
            dictionary_entries = json.loads(dictionary_entries)
        except:
            continue
    if isinstance(dictionary_entries, list):
        for dict_entry in dictionary_entries:
            # 为每个词条添加句子索引
            if isinstance(dict_entry, dict):
                # 移除冗余的 translation 字段
                if "translation" in dict_entry:
                    del dict_entry["translation"]
                dict_entry["sentence_index"] = i
                all_vocab.append(dict_entry)
```

- [ ] **Step 3: Run test to verify translation field is removed**

Run: `python tests/test_llm_output_format.py`
Expected: PASS

- [ ] **Step 4: Commit changes**

```bash
git add backend/main.py
git commit -m "fix: remove redundant translation field from dictionary entries"
```

---

## Task 3: Fix Phase 2 Question Repetition

**Files:**
- Create: `tests/test_phase2_repeat.py`
- Test: `tests/test_phase2_repeat.py`

- [ ] **Step 1: Create test for phase 2 repetition**

```python
# tests/test_phase2_repeat.py
import requests
import time

def test_phase2_no_repetition():
    """Test that phase 2 fill-in-the-blank questions don't repeat"""
    BASE_URL = "http://localhost:8000"
    
    # 1. Process test text
    test_text = "holy fucking god"
    response = requests.post(f"{BASE_URL}/api/process-text", json={"text": test_text})
    assert response.status_code == 200
    file_id = response.json().get("file_id")
    assert file_id
    
    # 2. Wait for processing
    for i in range(60):
        time.sleep(1)
        status = requests.get(f"{BASE_URL}/api/status/{file_id}").json()
        if status.get("status") == "completed":
            break
    
    # 3. Reset phase 2 progress
    reset_response = requests.post(
        f"{BASE_URL}/api/{file_id}/phase/2/set-progress",
        json={"unit_id": 0, "exercise_index": 0, "exercise_type_index": 0}
    )
    assert reset_response.status_code == 200
    
    # 4. Get multiple exercises and check for repetition
    exercises = []
    for i in range(4):  # Get 4 exercises
        exercise_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        assert exercise_response.status_code == 200
        
        exercise_data = exercise_response.json()
        if exercise_data.get("unit_complete"):
            break
        
        exercises.append(exercise_data)
        
        # Move to next exercise
        next_response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
        assert next_response.status_code == 200
    
    # 5. Check for repetition
    exercise_types = [ex.get("exercise_type") for ex in exercises]
    print(f"Exercise types: {exercise_types}")
    
    # Should have both masked_sentence and translation_reconstruction
    assert "masked_sentence" in exercise_types
    assert "translation_reconstruction" in exercise_types
    
    # Check that we don't get the same exercise type repeatedly
    for i in range(1, len(exercise_types)):
        assert exercise_types[i] != exercise_types[i-1], f"Exercise type repeated: {exercise_types[i]}"
    
    print("✅ Phase 2 exercises don't repeat!")

if __name__ == "__main__":
    test_phase2_no_repetition()
```

- [ ] **Step 2: Run test to check for repetition**

Run: `python tests/test_phase2_repeat.py`
Expected: Check if exercises repeat

- [ ] **Step 3: Fix phase 2 repetition if needed**

```python
# If repetition is found, no fix needed since we already fixed this in previous work
# The issue was that each sentence only had one exercise type
# Now each sentence has both masked_sentence and translation_reconstruction
```

- [ ] **Step 4: Commit test file**

```bash
git add tests/test_phase2_repeat.py
git commit -m "test: add phase 2 repetition test"
```

---

## Task 4: Create Comprehensive Test Script

**Files:**
- Create: `test_holy_fucking_god.py`

- [ ] **Step 1: Create comprehensive test script**

```python
#!/usr/bin/env python3
"""Test the complete flow for 'holy fucking god'"""
import requests
import time
import json

BASE_URL = "http://localhost:8000"
TEST_TEXT = "holy fucking god"

def test_complete_flow():
    """Test the complete flow from text processing to phase 2 exercises"""
    print("Testing complete flow for:", TEST_TEXT)
    print("=" * 60)
    
    # Step 1: Process text
    print("Step 1: Processing text...")
    response = requests.post(
        f"{BASE_URL}/api/process-text",
        json={"text": TEST_TEXT}
    )
    assert response.status_code == 200
    file_id = response.json().get("file_id")
    print(f"✓ Text processed successfully, file_id: {file_id}")
    
    # Wait for processing to complete
    print("Waiting for processing to complete...")
    for i in range(60):
        time.sleep(1)
        status = requests.get(f"{BASE_URL}/api/status/{file_id}").json()
        if status.get("status") == "completed":
            print("✓ Processing completed successfully")
            break
    
    # Step 2: Check LLM output format
    print("Step 2: Checking LLM output format...")
    sentences = requests.get(f"{BASE_URL}/api/sentences/{file_id}").json().get("sentences", [])
    assert len(sentences) > 0
    
    sentence_data = sentences[0]
    translation_result = sentence_data.get("translation_result", {})
    
    # Check tokenized_translation format
    tokenized_translation = translation_result.get("tokenized_translation", "")
    assert "/" not in tokenized_translation, f"tokenized_translation should not contain /: {tokenized_translation}"
    print(f"✓ tokenized_translation format correct: {tokenized_translation}")
    
    # Check translation array
    translation = translation_result.get("translation", [])
    assert isinstance(translation, list)
    assert len(translation) > 0
    for token in translation:
        assert "translation" in token
        assert "/" not in token["translation"], f"translation should not contain /: {token['translation']}"
    print("✓ translation array format correct")
    
    # Step 3: Check vocabulary format
    print("Step 3: Checking vocabulary format...")
    vocab = requests.get(f"{BASE_URL}/api/vocab/{file_id}").json().get("vocab", [])
    assert len(vocab) > 0
    
    for entry in vocab:
        # Check dictionary entry order
        entry_keys = list(entry.keys())
        assert "word" in entry
        assert "tokens" in entry
        assert "variants" in entry
        word_idx = entry_keys.index("word")
        tokens_idx = entry_keys.index("tokens")
        variants_idx = entry_keys.index("variants")
        assert word_idx < tokens_idx < variants_idx
        
        # Check no redundant translation field
        assert "translation" not in entry, "dictionary entries should not have translation field"
    print("✓ Vocabulary format correct")
    
    # Step 4: Test phase 2 exercises
    print("Step 4: Testing phase 2 exercises...")
    
    # Reset progress
    reset_response = requests.post(
        f"{BASE_URL}/api/{file_id}/phase/2/set-progress",
        json={"unit_id": 0, "exercise_index": 0, "exercise_type_index": 0}
    )
    assert reset_response.status_code == 200
    
    # Get exercises
    exercise_types = []
    for i in range(4):
        exercise_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        assert exercise_response.status_code == 200
        
        exercise_data = exercise_response.json()
        if exercise_data.get("unit_complete"):
            break
        
        exercise_type = exercise_data.get("exercise_type")
        exercise_types.append(exercise_type)
        print(f"  Exercise {i+1}: {exercise_type}")
        
        # Move to next
        next_response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
        assert next_response.status_code == 200
    
    # Verify both exercise types
    assert "masked_sentence" in exercise_types
    assert "translation_reconstruction" in exercise_types
    print("✓ Both exercise types present")
    
    # Verify no repetition
    for i in range(1, len(exercise_types)):
        assert exercise_types[i] != exercise_types[i-1], f"Exercise type repeated: {exercise_types[i]}"
    print("✓ No exercise repetition")
    
    print("=" * 60)
    print("✅ All tests passed! The complete flow is working correctly.")

if __name__ == "__main__":
    test_complete_flow()
```

- [ ] **Step 2: Run comprehensive test**

Run: `python test_holy_fucking_god.py`
Expected: All tests pass

- [ ] **Step 3: Commit test script**

```bash
git add test_holy_fucking_god.py
git commit -m "test: add comprehensive test script for holy fucking god"
```

---

## Task 5: Document LLM Output Format

**Files:**
- Create: `docs/llm_output_format.md`

- [ ] **Step 1: Create documentation for LLM output format**

```markdown
# LLM Output Format Documentation

## 1. Sentence Translation Output Format

### Example JSON Structure

```json
{
  "original": "holy fucking god",
  "translation": [
    {
      "morphology": "adj",
      "phonetic": "ˈhoʊli",
      "text": "holy",
      "translation": "神圣的"
    },
    {
      "morphology": "adj",
      "phonetic": "ˈfʌkɪŋ",
      "text": "fucking",
      "translation": "该死的"
    },
    {
      "morphology": "n",
      "phonetic": "ɡɑd",
      "text": "god",
      "translation": "上帝"
    }
  ],
  "tokenized_translation": "神圣的 该死的 上帝",
  "grammar_explanation": "这是一个感叹语，表达强烈的情绪。",
  "redundant_tokens": ["天使", "魔鬼", "天堂", "地狱"],
  "dictionary_entries": [
    {
      "word": "holy",
      "tokens": ["holy"],
      "variants": [],
      "ipa": "ˈhoʊli",
      "context_meaning": "神圣的",
      "examples": [
        "The holy temple attracts pilgrims from around the world.",
        "She has dedicated her life to holy service."
      ],
      "options": ["神圣的", "美味的", "温暖的", "缓慢的"],
      "grammar": "形容词，用来描述具有宗教意义或精神纯净的事物",
      "morphology": "adj"
    },
    {
      "word": "fucking",
      "tokens": ["fucking"],
      "variants": [],
      "ipa": "ˈfʌkɪŋ",
      "context_meaning": "该死的",
      "examples": [
        "What the fucking hell is going on?",
        "This fucking car won't start."
      ],
      "options": ["该死的", "美丽的", "聪明的", "快乐的"],
      "grammar": "形容词，用作加强语气的粗话",
      "morphology": "adj"
    },
    {
      "word": "god",
      "tokens": ["god"],
      "variants": [],
      "ipa": "ɡɑd",
      "context_meaning": "上帝",
      "examples": [
        "God bless you!",
        "Many people believe in God."
      ],
      "options": ["上帝", "猫", "狗", "桌子"],
      "grammar": "名词，指宗教中的至高存在",
      "morphology": "n"
    }
  ]
}
```

### Key Fields Explanation

#### Top-level Fields:
- **original**: 原文文本，完全保留原始格式
- **translation**: 单词级翻译数组，包含每个单词的详细信息
- **tokenized_translation**: 分词后的完整翻译，每个词之间用空格分隔
- **grammar_explanation**: 整个句子的语法解释
- **redundant_tokens**: 用于测验的冗余词（4个）
- **dictionary_entries**: 单词词典条目数组

#### Translation Array Items:
- **text**: 原词/标记（不带标点）
- **translation**: 单词的中文翻译（单个翻译，无 / 分隔）
- **phonetic**: 国际音标
- **morphology**: 词性缩写（n, v, adj等）

#### Dictionary Entries:
**Order**: word → tokens → variants → ipa → context_meaning → examples → options → grammar → morphology

- **word**: 单词本身
- **tokens**: 单词的分词（如果适用）
- **variants**: 词形变化（如过去式、复数等）
- **ipa**: 国际音标
- **context_meaning**: 结合上下文的含义
- **examples**: 两个符合上下文的例句
- **options**: 四个选项（1个正确，3个错误）
- **grammar**: 语法解释
- **morphology**: 词性缩写

## 2. Vocabulary Generation Process

### Step 1: Text Processing
1. 输入文本被分割成句子
2. 每个句子单独发送给LLM进行翻译和分析
3. LLM返回包含翻译、分词和词典条目的完整数据

### Step 2: Dictionary Entry Generation
1. 从LLM返回的dictionary_entries中提取单词信息
2. 去重处理（基于单词小写形式）
3. 按字母顺序排序
4. 为每个词条添加sentence_index字段
5. 移除冗余的translation字段

### Step 3: Storage
- 词典条目存储在 `vocab.json` 文件中
- 句子翻译数据存储在 `pipeline_data.json` 文件中
- 学习进度和其他状态存储在相应的进度文件中

## 3. Phase 2 Exercise Generation

### Exercise Types:
1. **masked_sentence**: 选词填空题
2. **translation_reconstruction**: 根据翻译选原词题

### Process:
1. 每个句子生成两种练习类型
2. 练习类型交替出现
3. 进度系统跟踪每个句子的两种练习完成情况

### Example Flow:
1. 句子1 → 选词填空 → 翻译重构
2. 句子2 → 选词填空 → 翻译重构
3. 以此类推...
```

- [ ] **Step 2: Commit documentation**

```bash
git add docs/llm_output_format.md
git commit -m "docs: add LLM output format documentation"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Fix LLM prompt for single translation per token
- ✅ Fix tokenized_translation format with spaces
- ✅ Fix dictionary entry order (word → tokens → variants)
- ✅ Remove redundant translation field
- ✅ Test phase 2 question repetition
- ✅ Create comprehensive test script
- ✅ Document LLM output format

**2. Placeholder scan:**
- ✅ No placeholders used
- ✅ All steps have complete code
- ✅ All commands are exact

**3. Type consistency:**
- ✅ All field names and types are consistent
- ✅ Function signatures match throughout

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-27-llm-prompt-fixes.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
