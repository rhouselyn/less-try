# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率。

**Architecture:** 替换现有的两个独立方法为一个一体化方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法，删除或修改现有的 `generate_dictionary` 和 `split_and_translate` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改调用 `generate_dictionary` 和 `split_and_translate` 的代码

## 任务分解

### 任务 1: 添加新的 process_text 方法到 nvidia_api.py

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 实现新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 保留或修改现有的方法**

保留 `split_and_translate` 方法但修改其内部实现，使其调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的调用代码

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 找到并修改调用 generate_dictionary 的代码**

找到 `process_text_background` 函数中调用 `generate_dictionary` 的部分，修改为使用新的 `process_text` 方法。

- [ ] **Step 2: 测试修改后的代码**

测试使用 "hi bro" 作为文本，学习语言是中文，母语是日文的情况，确保：
1. 单词表中的句子翻译板块显示中文作为原文
2. 翻译题能够正常生成

### 任务 4: 修复句子翻译板块显示问题

**Files:**
- Modify: `/workspace/frontend/src/components/SentenceDetail.jsx`

- [ ] **Step 1: 检查并修复原文显示逻辑**

确保句子翻译板块使用正确的原文，对于学习语言为中文的情况，应该显示中文翻译作为原文。

### 任务 5: 测试整体功能

**Files:**
- Test: 整个应用

- [ ] **Step 1: 重启服务器**

重启后端和前端服务器。

- [ ] **Step 2: 测试 "hi bro" 例子**

使用 "hi bro" 作为文本，学习语言设置为中文，母语调为日文，测试：
1. 单词表是否正确生成
2. 句子翻译板块是否显示中文作为原文
3. 翻译题是否能够正常生成

- [ ] **Step 3: 测试其他语言组合**

测试其他语言组合，确保功能正常。

---

## 风险处理

1. **API调用失败**：添加适当的错误处理，确保即使API调用失败也能返回合理的默认值。
2. **兼容性问题**：保留 `split_and_translate` 方法的接口，确保现有代码不会因为修改而崩溃。
3. **性能问题**：新的 `process_text` 方法可能会比原来的两个方法慢，需要监控性能并进行优化。

## 验证标准

1. 新的 `process_text` 方法能够同时返回句子级拆解和每个单词的完整词典条目。
2. 所有相关调用点都已修改为使用新方法。
3. 句子翻译板块显示正确的原文（对于学习语言为中文的情况，显示中文翻译）。
4. 翻译题能够正常生成。
5. 应用的其他功能不受影响。# 合并 process_text 方法实施计划# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text`# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/n# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：**# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：**# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    ""# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation":# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  ## 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type":# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type":# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array",# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "max# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items":# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems":# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation":# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array",# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required":# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "token# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morph# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/d# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
-# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt =# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content":# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text:# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation":# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get(# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get(# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_trans# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ]# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing",# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_voc# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words =# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_trans# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1}# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                ## 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
                            if word and word not in global_seen# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
                            if word and word not in global_seen_words:
                                global_seen_words.add(word)
                                vocab_entry = {
                                    "# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
                            if word and word not in global_seen_words:
                                global_seen_words.add(word)
                                vocab_entry = {
                                    "word": word_entry.get("word", ""),
                                    "ipa": word_entry# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
                            if word and word not in global_seen_words:
                                global_seen_words.add(word)
                                vocab_entry = {
                                    "word": word_entry.get("word", ""),
                                    "ipa": word_entry.get("ipa", ""),
                                    "context_meaning": word_entry.get(# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
                            if word and word not in global_seen_words:
                                global_seen_words.add(word)
                                vocab_entry = {
                                    "word": word_entry.get("word", ""),
                                    "ipa": word_entry.get("ipa", ""),
                                    "context_meaning": word_entry.get("context_meaning", ""),
                                    "morphology": word_entry.get(# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
                            if word and word not in global_seen_words:
                                global_seen_words.add(word)
                                vocab_entry = {
                                    "word": word_entry.get("word", ""),
                                    "ipa": word_entry.get("ipa", ""),
                                    "context_meaning": word_entry.get("context_meaning", ""),
                                    "morphology": word_entry.get("grammar", ""),
                                    "sentence_index": i
                                }
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
                            if word and word not in global_seen_words:
                                global_seen_words.add(word)
                                vocab_entry = {
                                    "word": word_entry.get("word", ""),
                                    "ipa": word_entry.get("ipa", ""),
                                    "context_meaning": word_entry.get("context_meaning", ""),
                                    "morphology": word_entry.get("grammar", ""),
                                    "sentence_index": i
                                }
                                all_vocab.append(vocab_entry)
                    # 回退到原来的 translation# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
                            if word and word not in global_seen_words:
                                global_seen_words.add(word)
                                vocab_entry = {
                                    "word": word_entry.get("word", ""),
                                    "ipa": word_entry.get("ipa", ""),
                                    "context_meaning": word_entry.get("context_meaning", ""),
                                    "morphology": word_entry.get("grammar", ""),
                                    "sentence_index": i
                                }
                                all_vocab.append(vocab_entry)
                    # 回退到原来的 translation 字段
                    elif "translation" in translation_result:
                        for token in translation_result["# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
                            if word and word not in global_seen_words:
                                global_seen_words.add(word)
                                vocab_entry = {
                                    "word": word_entry.get("word", ""),
                                    "ipa": word_entry.get("ipa", ""),
                                    "context_meaning": word_entry.get("context_meaning", ""),
                                    "morphology": word_entry.get("grammar", ""),
                                    "sentence_index": i
                                }
                                all_vocab.append(vocab_entry)
                    # 回退到原来的 translation 字段
                    elif "translation" in translation_result:
                        for token in translation_result["translation"]:
                            if isinstance(token, dict) and "text" in token:
# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
                            if word and word not in global_seen_words:
                                global_seen_words.add(word)
                                vocab_entry = {
                                    "word": word_entry.get("word", ""),
                                    "ipa": word_entry.get("ipa", ""),
                                    "context_meaning": word_entry.get("context_meaning", ""),
                                    "morphology": word_entry.get("grammar", ""),
                                    "sentence_index": i
                                }
                                all_vocab.append(vocab_entry)
                    # 回退到原来的 translation 字段
                    elif "translation" in translation_result:
                        for token in translation_result["translation"]:
                            if isinstance(token, dict) and "text" in token:
                                word = token["text"].lower()
                                if word not in global_seen_words# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
                            if word and word not in global_seen_words:
                                global_seen_words.add(word)
                                vocab_entry = {
                                    "word": word_entry.get("word", ""),
                                    "ipa": word_entry.get("ipa", ""),
                                    "context_meaning": word_entry.get("context_meaning", ""),
                                    "morphology": word_entry.get("grammar", ""),
                                    "sentence_index": i
                                }
                                all_vocab.append(vocab_entry)
                    # 回退到原来的 translation 字段
                    elif "translation" in translation_result:
                        for token in translation_result["translation"]:
                            if isinstance(token, dict) and "text" in token:
                                word = token["text"].lower()
                                if word not in global_seen_words:
                                    global_seen_words.add(word)
                                    # 直接使用API返回的形态# 合并 process_text 方法实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并为一个新的 `process_text` 方法，减少API调用次数并提高效率，同时解决句子翻译板块显示问题。

**Architecture:** 实现一个一体化的 `process_text` 方法，该方法同时返回句子级拆解和每个单词的完整词典条目，修改所有相关调用点以使用新方法，并修复句子翻译板块的显示逻辑。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 文件结构分析

### 相关文件：
- **修改：** `/workspace/backend/nvidia_api.py` - 添加新的 `process_text` 方法
- **修改：** `/workspace/backend/text_processor.py` - 修改 `process_translation` 方法以使用新的 `process_text` 方法
- **修改：** `/workspace/backend/main.py` - 修改处理流程以利用新方法的词典条目
- **修改：** `/workspace/frontend/src/components/SentenceDetail.jsx` - 修复句子翻译板块的显示逻辑

## 任务分解

### 任务 1: 实现新的 process_text 方法

**Files:**
- Modify: `/workspace/backend/nvidia_api.py`

- [ ] **Step 1: 添加新的 process_text 方法**

```python
async def process_text(self, text: str, source_lang: str, target_lang: str):
    """
    一体化处理：同时返回句子级拆解 + 每个单词的完整词典条目
    """
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text",
            "description": "同时对文本进行句子拆解和每个单词的完整词典生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "tokenized_translation": {"type": "string"},
                    "grammar_explanation": {"type": "string"},
                    "translation": {  # 句子级逐词拆分
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}  # 只允许 n/v/adj/... 
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "words": {  # 新增：每个单词的完整词典信息
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {}, "form": {}}}},
                                "examples": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                        }
                    },
                    "redundant_tokens": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["original", "tokenized_translation", "grammar_explanation", "translation", "words", "redundant_tokens"]
            }
        }
    }

    prompt = """请同时处理以下 TEXT_LANG 文本：

1. 进行句子级拆解与翻译（所有解释使用 TARGET_LANG）
2. 为文本中所有主要实词（名词、动词、形容词、副词等）生成完整的词典条目

【严格要求】
- original：保留原始文本和所有空格
- tokenized_translation：自然流畅的 TARGET_LANG 完整翻译
- grammar_explanation：整个句子的完整语法解释（用 TARGET_LANG）
- translation：逐词数组，morphology 只允许使用 n/v/adj/adv/pron/prep/conj/interj/det
- words：为每个重要单词生成完整词典条目（基于上下文）
- redundant_tokens：4个合理的干扰词（用 TARGET_LANG）

要处理的文本：
TEXT_CONTENT
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        return {}
```

- [ ] **Step 2: 修改 split_and_translate 方法**

修改 `split_and_translate` 方法以调用新的 `process_text` 方法：

```python
async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
    result = await self.process_text(text, source_lang, target_lang)
    # 提取需要的字段
    return {
        "original": result.get("original", text),
        "translation": result.get("translation", []),
        "tokenized_translation": result.get("tokenized_translation", ""),
        "grammar_explanation": result.get("grammar_explanation", ""),
        "redundant_tokens": result.get("redundant_tokens", [])
    }
```

### 任务 2: 修改 text_processor.py 中的 process_translation 方法

**Files:**
- Modify: `/workspace/backend/text_processor.py`

- [ ] **Step 1: 修改 process_translation 方法**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 对整个文本进行翻译
    result = await nvidia_api.process_text(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 简单过滤：只过滤掉纯标点符号的token
        if 'translation' in result:
            filtered_translation = []
            for token in result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    text = token['text'].strip()
                    # 只过滤完全是标点符号的token
                    if text and not all(char in '.,;:!?' for char in text):
                        filtered_translation.append(token)
            result['translation'] = filtered_translation
    
    # 返回处理后的结果，保留LLM生成的自然翻译
    return result
```

### 任务 3: 修改 main.py 中的处理流程

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: 修改 process_text_background 函数**

修改 `process_text_background` 函数以利用新的 `process_text` 方法返回的词典条目：

```python
async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict):
                    # 优先使用新的 words 字段（如果存在）
                    if "words" in translation_result:
                        for word_entry in translation_result["words"]:
                            word = word_entry.get("word", "").lower()
                            if word and word not in global_seen_words:
                                global_seen_words.add(word)
                                vocab_entry = {
                                    "word": word_entry.get("word", ""),
                                    "ipa": word_entry.get("ipa", ""),
                                    "context_meaning": word_entry.get("context_meaning", ""),
                                    "morphology": word_entry.get("grammar", ""),
                                    "sentence_index": i
                                }
                                all_vocab.append(vocab_entry)
                    # 回退到原来的 translation 字段
                    elif "translation" in translation_result:
                        for token in translation_result["translation"]:
                            if isinstance(token, dict) and "text" in token:
                                word = token["text"].lower()
                                if word not in global_seen_words:
                                    global_seen_words.add(word)
                                    # 直接使用API返回的形态学缩写
                                    morphology = token.get("