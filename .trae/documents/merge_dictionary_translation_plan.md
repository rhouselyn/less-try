# 合并字典和翻译功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `generate_dictionary` 和 `split_and_translate` 方法合并成一个 `process_text_with_dictionary` 方法，减少重复调用，提高效率。

**Architecture:** 创建一个新的 `process_text_with_dictionary` 方法，整合两个方法的功能，同时修复句子翻译板块显示问题和翻译题生成问题。

**Tech Stack:** Python, FastAPI, NVIDIA API

---

## 任务分解

### 任务 1: 分析现有代码结构

**文件:**
- 查看: `backend/nvidia_api.py`
- 查看: `backend/text_processor.py`
- 查看: `backend/main.py`

- [ ] **步骤 1: 分析 `generate_dictionary` 方法**

```python
# 查看 generate_dictionary 方法的实现和调用
```

- [ ] **步骤 2: 分析 `split_and_translate` 方法**

```python
# 查看 split_and_translate 方法的实现和调用
```

- [ ] **步骤 3: 分析相关调用点**

```python
# 查看 main.py 中如何调用这些方法
```

### 任务 2: 实现 `process_text_with_dictionary` 方法

**文件:**
- 修改: `backend/nvidia_api.py`

- [ ] **步骤 1: 添加新方法**

```python
async def process_text_with_dictionary(
    self, 
    text: str, 
    source_lang: str, 
    target_lang: str
):
    """
    合并处理：同时对整段文本进行句子级拆解 + 为文本中主要单词生成完整词典条目
    
    返回结构（一个字典）：
    - original
    - tokenized_translation
    - grammar_explanation
    - translation（token数组，带词性、音标等）
    - redundant_tokens
    - dictionary_entries（新增：单词列表的完整词典条目）
    """
    
    tool_def = {
        "type": "function",
        "function": {
            "name": "process_text_with_dictionary",
            "description": "同时处理文本拆解翻译和单词词典条目生成",
            "parameters": {
                "type": "object",
                "properties": {
                    "original": {
                        "type": "string",
                        "description": "原文文本（完全保留原始空格）"
                    },
                    "translation": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "translation": {"type": "string"},
                                "phonetic": {"type": "string"},
                                "morphology": {"type": "string"}
                            },
                            "required": ["text", "translation", "phonetic", "morphology"]
                        }
                    },
                    "tokenized_translation": {
                        "type": "string",
                        "description": "完整自然的 TARGET_LANG 翻译，正常句子格式"
                    },
                    "grammar_explanation": {
                        "type": "string",
                        "description": "整个文本的一个完整语法解释，用 TARGET_LANG"
                    },
                    "redundant_tokens": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "4个与原文相关的合理冗余tokens，用于测验目的，必须全部使用TARGET_LANG"
                    },
                    "dictionary_entries": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "ipa": {"type": "string"},
                                "context_meaning": {"type": "string"},
                                "variants": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "type": {"type": "string"},
                                            "form": {"type": "string"}
                                        },
                                        "required": ["type", "form"]
                                    }
                                },
                                "examples": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "minItems": 2,
                                    "maxItems": 2
                                },
                                "options": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "minItems": 4,
                                    "maxItems": 4
                                },
                                "grammar": {"type": "string"},
                                "translation": {"type": "string"},
                                "tokens": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                }
                            },
                            "required": [
                                "word", "ipa", "context_meaning", "variants", 
                                "examples", "options", "grammar", "translation", "tokens"
                            ]
                        }
                    }
                },
                "required": [
                    "original", "translation", "tokenized_translation", 
                    "grammar_explanation", "redundant_tokens", "dictionary_entries"
                ]
            }
        }
    }

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

按照以下结构处理文本：
- original: 原文文本（如果输入文本的语言与 TARGET_LANG 一致，则保持原样；如果与 TEXT_LANG 一致，也保持原样；否则先翻译成 TEXT_LANG）- 完全保留原始空格！！！
- translation: 对象数组，每个对象包含：
  - text: 原词/标记（不带标点）
  - translation: 这个词翻译成 TARGET_LANG
  - phonetic: 音标(IPA)（如果是中文等没有音标的语言，可为空）
  - morphology: 只能是词性缩写（如 n, v, adj）
- tokenized_translation: 完整自然的 TARGET_LANG 翻译，正常句子格式
- grammar_explanation: 整个文本的一个完整语法解释，用 TARGET_LANG
- redundant_tokens: 4个与原文相关的合理冗余tokens，用于测验目的，必须全部使用TARGET_LANG（目标语言）

同时，为文本中出现的主要单词生成完整词典条目（dictionary_entries）：

为每个主要单词提供：
1. word: 单词本身
2. ipa: International Phonetic Alphabet pronunciation
3. context_meaning: 基于上下文的含义，用 TARGET_LANG 解释
4. variants: 其他形式（如过去式、复数等），每个包含 "type" 和 "form"
5. examples: 2个与上下文含义匹配的 SOURCE_LANG 例句
6. options: 4个含义选项（1正确 + 3错误）
7. grammar: 该单词的语法说明，用 TARGET_LANG
8. translation: 单词到 TARGET_LANG 的翻译
9. tokens: 单词拆分成的 tokens（如果适用）

要处理的文本：
TEXT_CONTENT

请严格按照 tool 定义的 JSON 结构返回所有字段，不要遗漏任何 required 字段。
"""

    # 替换占位符
    prompt = prompt.replace("TEXT_LANG", source_lang)
    prompt = prompt.replace("TARGET_LANG", target_lang)
    prompt = prompt.replace("TEXT_CONTENT", text)

    messages = [{"role": "user", "content": prompt}]
    
    response = await self.call_minimax(messages, [tool_def], temperature=0.0)
    
    try:
        print("=== LLM Tool JSON Response (Merged) ===")
        print(json.dumps(response, indent=2, ensure_ascii=False))
        print("======================")
        
        for choice in response["choices"]:
            if "tool_calls" in choice["message"]:
                tool_call = choice["message"]["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                print("=== Parsed Tool Arguments (Merged) ===")
                print(json.dumps(args, indent=2, ensure_ascii=False))
                print("======================")
                return args
        return {}
    except Exception as e:
        print(f"Tool call failed: {e}")
        print(f"Response: {response}")
        return {}
```

### 任务 3: 修改 `text_processor.py` 中的 `process_translation` 方法

**文件:**
- 修改: `backend/text_processor.py`

- [ ] **步骤 1: 修改方法调用**

```python
async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
    # 使用新的合并方法
    result = await nvidia_api.process_text_with_dictionary(text, source_lang, target_lang)
    
    # 简单处理，保留LLM生成的自然结果
    if isinstance(result, dict):
        # 保留original字段，因为它可能包含翻译后的文本
        # 不再删除original字段
        
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

### 任务 4: 修改 `main.py` 中的相关调用

**文件:**
- 修改: `backend/main.py`

- [ ] **步骤 1: 修改文本处理流程**

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
                if isinstance(translation_result, dict) and "dictionary_entries" in translation_result:
                    for entry in translation_result["dictionary_entries"]:
                        word = entry.get("word", "").lower()
                        if word and word not in global_seen_words:
                            global_seen_words.add(word)
                            all_vocab.append(entry)
            
            # 更新进度
            progress = int((i + 1) / total_sentences * 100)
            processing_status[file_id] = {"status": "processing", "progress": progress, "current_sentence": i + 1, "total_sentences": total_sentences}
        
        # 保存词汇表
        if all_vocab:
            storage.save_vocab(file_id, all_vocab)
        
        # 保存句子翻译
        storage.save_pipeline_data(file_id, sentence_translations)
        
        # 保存处理状态
        processing_status[file_id] = {"status": "completed", "progress": 100, "vocab": all_vocab, "sentence_translations": sentence_translations}
        print(f"[DEBUG] 文件 {file_id} 处理完成，词汇表长度: {len(all_vocab)}")
        
    except Exception as e:
        print(f"[ERROR] 处理文件 {file_id} 时出错: {str(e)}")
        processing_status[file_id] = {"status": "error", "error": str(e)}
```

### 任务 5: 修复句子翻译板块显示问题

**文件:**
- 修改: `frontend/src/components/SentenceDetail.jsx`

- [ ] **步骤 1: 修改句子卡片显示逻辑**

```jsx
function SentenceDetail({ sentenceTranslation, t }) {
  const sentence = sentenceTranslation?.sentence
  const translationResult = sentenceTranslation?.translation_result
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
    >
      <div className="flex items-center mb-8">
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-semibold text-slate-900"
        >
          {t.sentDetail}
        </motion.h2>
      </div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.original}
          </h3>
          <p className="text-lg text-slate-900 leading-relaxed">
            {translationResult?.tokenized_translation || sentence}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.translation}
          </h3>
          <p className="text-lg text-slate-700 leading-relaxed">
            {translationResult?.tokenized_translation || t.loading}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            {t.grammar}
          </h3>
          <p className="text-lg text-slate-700 leading-relaxed">
            {translationResult?.grammar_explanation || t.loading}
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}
```

### 任务 6: 修复翻译题生成问题

**文件:**
- 修改: `backend/main.py`

- [ ] **步骤 1: 检查并修复 `check_coverage` 方法**

```python
@app.get("/api/learn/{file_id}/check-coverage")
async def check_coverage(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            return {"can_form_sentences": False, "unit_completed": False}
        
        # 加载学习进度
        current_index = storage.load_learning_progress(file_id)
        
        # 检查是否完成了当前单元
        unit_size = 10
        current_unit = current_index // unit_size
        words_in_unit = min(unit_size, len(vocab) - current_unit * unit_size)
        unit_completed = current_index >= (current_unit * unit_size + words_in_unit)
        
        # 检查是否已经学习完所有单词
        all_words_learned = current_index >= len(vocab)
        
        # 对于短文本，学习完所有单词后就可以开始句子翻译
        if len(vocab) <= 5:
            if not all_words_learned:
                return {"can_form_sentences": False, "unit_completed": unit_completed}
        else:
            # 至少要学够5个单词后才可能出现句子翻译题
            if current_index < 4:
                return {"can_form_sentences": False, "unit_completed": unit_completed}
        
        # 学习完所有单词后，所有单词都算已学
        if all_words_learned:
            learned_word_set = set(word["word"].lower() for word in vocab)
        else:
            # 否则只算到current_index-1的单词（因为current_index是下一个要学的单词）
            learned_words = vocab[:current_index]
            learned_word_set = set(word["word"].lower() for word in learned_words)
        
        # 加载句子
        sentences = storage.load_pipeline_data(file_id)
        if not sentences:
            return {"can_form_sentences": False, "unit_completed": unit_completed}
        
        # 检查是否有句子可以用已学单词组成
        can_form = False
        for sentence_data in sentences:
            if "sentence" in sentence_data:
                sentence = sentence_data["sentence"]
                # 简单分词（按空格）
                words_in_sentence = set(word.lower() for word in sentence.split() if word.isalpha())
                # 检查是否所有单词都在已学单词中
                if words_in_sentence.issubset(learned_word_set) and len(words_in_sentence) >= 2:
                    can_form = True
                    break
        
        return {"can_form_sentences": can_form, "unit_completed": unit_completed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking coverage: {str(e)}")
```

### 任务 7: 测试和验证

**文件:**
- 测试: `backend/test_merge.py`

- [ ] **步骤 1: 编写测试脚本**

```python
import asyncio
from nvidia_api import NvidiaAPI

async def test_process_text_with_dictionary():
    nvidia_api = NvidiaAPI()
    
    # 测试英文到中文的翻译
    result = await nvidia_api.process_text_with_dictionary(
        "hi bro",
        "en",
        "zh"
    )
    
    print("=== Test Result ===")
    print(f"Original: {result.get('original')}")
    print(f"Tokenized Translation: {result.get('tokenized_translation')}")
    print(f"Dictionary Entries: {len(result.get('dictionary_entries', []))}")
    for entry in result.get('dictionary_entries', []):
        print(f"Word: {entry.get('word')}, Translation: {entry.get('translation')}")
    print("===================")

if __name__ == "__main__":
    asyncio.run(test_process_text_with_dictionary())
```

- [ ] **步骤 2: 运行测试**

```bash
cd backend
python test_merge.py
```

- [ ] **步骤 3: 重启服务器**

```bash
# 停止旧服务器
# 启动新服务器
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- [ ] **步骤 4: 手动测试网页**

1. 打开 http://localhost:3000/
2. 输入 "hi bro"
3. 选择源语言为英文，目标语言为中文
4. 点击处理按钮
5. 检查句子翻译板块是否显示中文作为例句
6. 完成学习流程，检查是否生成翻译题

## 风险处理

1. **LLM 响应格式问题**：如果 LLM 不返回预期的 JSON 格式，可能导致解析错误。解决方案：添加更健壮的错误处理。

2. **性能问题**：合并后的方法可能会增加单次 API 调用的复杂度，导致响应时间变长。解决方案：监控 API 响应时间，必要时优化 prompt。

3. **向后兼容性**：修改现有方法可能影响其他依赖这些方法的代码。解决方案：保持原有方法的接口不变，通过内部调用新方法来实现。

4. **翻译题生成逻辑**：确保学习完所有单词后能够正确生成翻译题。解决方案：检查 `check_coverage` 方法的逻辑，确保它能正确识别已学单词。

## 总结

本计划通过合并 `generate_dictionary` 和 `split_and_translate` 方法，减少了 API 调用次数，提高了效率。同时，修复了句子翻译板块显示问题和翻译题生成问题，确保了在不同语言设置下的正确显示和功能。

**计划完成后，用户应该能够：**
1. 输入 "hi bro"，学习语言设置为中文，母语调为日文
2. 看到句子翻译板块以中文作为例句（嗨，兄弟）
3. 完成学习流程后看到翻译题
4. 单词表中显示完整的词典条目和例句