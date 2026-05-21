import os
import json
import requests
import asyncio
from typing import List, Dict, Any


def _repair_truncated_json(json_str):
    if not json_str or not isinstance(json_str, str):
        return []
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        pass
    
    try:
        if json_str.strip().startswith('['):
            depth = 0
            last_valid_end = -1
            for i, c in enumerate(json_str):
                if c == '[':
                    depth += 1
                elif c == ']':
                    depth -= 1
                    if depth == 0:
                        last_valid_end = i
                        break
            
            if last_valid_end > 0:
                repaired = json_str[:last_valid_end + 1]
                return json.loads(repaired)
            
            brace_depth = 0
            for i in range(len(json_str) - 1, -1, -1):
                if json_str[i] == '}':
                    brace_depth += 1
                elif json_str[i] == '{':
                    brace_depth -= 1
                    if brace_depth == 0:
                        repaired = json_str[:i + 1] + ']'
                        return json.loads(repaired)
    except (json.JSONDecodeError, TypeError):
        pass
    
    return []


CONFIG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config")
CONFIG_FILE = os.path.join(CONFIG_DIR, "llm_settings.json")

def _load_settings():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "api_key": "sk-tszhvcglvfqiivwqqtqwkxmxsneyuymjjywtfxteofmfvkct",
        "base_url": "https://api.siliconflow.cn/v1",
        "model": "Qwen/Qwen3.6-27B"
    }

def _save_settings(settings: dict):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)

def get_settings():
    return _load_settings()

def update_settings(api_key: str = None, base_url: str = None, model: str = None):
    current = _load_settings()
    if api_key is not None:
        current["api_key"] = api_key
    if base_url is not None:
        current["base_url"] = base_url
    if model is not None:
        current["model"] = model
    _save_settings(current)
    return current


class NvidiaAPI:
    def __init__(self):
        self._reload()

    def _reload(self):
        settings = _load_settings()
        self.api_key = settings.get("api_key", "")
        self.base_url = settings.get("base_url", "https://api.siliconflow.cn/v1")
        self.model = settings.get("model", "Qwen/Qwen3.6-27B")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def reload(self):
        self._reload()

    def _sync_post(self, url, headers, payload, timeout):
        response = requests.post(url, headers=headers, json=payload, timeout=timeout)
        response.raise_for_status()
        result = response.json()
        if "choices" in result and len(result["choices"]) > 0:
            choice = result["choices"][0]
            message = choice.get("message", {})
            content = message.get("content", "")
            reasoning_content = message.get("reasoning_content", "")
            if not content and reasoning_content:
                message["content"] = reasoning_content
                result["choices"][0]["message"] = message
        return result

    async def call_minimax(self, messages: List[Dict], tools: List[Dict] = None, temperature: float = 0.0, max_tokens: int = 4096):
        import time as _time
        self.reload()
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "thinking": {"type": "disabled"}
        }
        
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        try:
            t0 = _time.time()
            result = await asyncio.to_thread(
                self._sync_post,
                f"{self.base_url}/chat/completions",
                self.headers,
                payload,
                600
            )
            t1 = _time.time()
            has_tools = "yes" if tools else "no"
            print(f"[TIMING] call_minimax (tools={has_tools}): {t1 - t0:.3f}s")
            return result
        except requests.exceptions.Timeout:
            print("API request timed out. Retrying...")
            t0 = _time.time()
            result = await asyncio.to_thread(
                self._sync_post,
                f"{self.base_url}/chat/completions",
                self.headers,
                payload,
                600
            )
            t1 = _time.time()
            has_tools = "yes" if tools else "no"
            print(f"[TIMING] call_minimax retry (tools={has_tools}): {t1 - t0:.3f}s")
            return result



    async def generate_multiple_choice(self, word: str, correct_meaning: str, context: str, target_lang: str):
        tool_def = {
            "type": "function",
            "function": {
                "name": "generate_multiple_choice",
                "description": "Generate enriched word information with multiple choice options",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "word": {"type": "string"},
                        "enriched_meaning": {
                            "type": "string",
                            "description": "单词的完整释义，包含多个母语单词的常见含义"
                        },
                        "variants_detail": {
                            "type": "array",
                            "description": "词形变化 + 类型说明，只包含确实存在的词形变化",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "form": {"type": "string"},
                                    "type": {"type": "string"}
                                }
                            }
                        },
                        "examples": {
                            "type": "array",
                            "description": "两个与原文语义一致的例句",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "sentence": {"type": "string"},
                                    "translation": {"type": "string"}
                                }
                            },
                            "minItems": 2,
                            "maxItems": 2
                        },
                        "memory_hint": {
                            "type": "string",
                            "description": "记忆辅助（联想/对比母语）"
                        },
                        "multiple_choice": {
                            "type": "object",
                            "properties": {
                                "question": {
                                    "type": "string",
                                    "description": "题干（可为空，默认就是词）"
                                },
                                "correct_answer": {
                                    "type": "string",
                                    "description": "单词的常见、正常释义，不是上下文特定释义"
                                },
                                "options": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "text": {"type": "string"},
                                            "is_correct": {"type": "boolean"}
                                        }
                                    },
                                    "minItems": 4,
                                    "maxItems": 4
                                }
                            }
                        }
                    },
                    "required": ["word", "enriched_meaning", "examples", "multiple_choice"]
                }
            }
        }

        prompt = f"""
为单词 '{word}' 生成丰富的信息，使用 {target_lang} 输出。

上下文释义：{correct_meaning}

上下文：{context}

请生成以下信息：

1. enriched_meaning: 单词的完整释义，包含多个常见含义，用分号分隔。每个含义必须是具体的、有意义的翻译，不能是占位符（如"释义1"、"含义1"等）
2. variants_detail: 词形变化列表，带类型说明（如过去式、复数等），只包含确实存在的词形变化，如果没有则返回空数组
3. examples: 两个符合上下文含义的例句，每个都有 {target_lang} 的翻译
4. memory_hint: 记忆辅助（与用户母语的联想或对比）
5. multiple_choice: 选择题，包含：
   - question: 可为空（默认为单词本身）
   - correct_answer: 单词的常见、正常释义，不是上下文特定释义
   - options: 4个选项（1个正确，3个错误），每个都有 text 和 is_correct 标记

要求：
- 所有输出必须使用 {target_lang}
- 例句要自然，符合上下文
- 记忆辅助对语言学习者要有帮助
- 选择题选项要清晰且合理
- 【重要】正确答案必须是单词的常见、正常释义，不是上下文特定释义
- 【重要】错误答案必须是该单词所没有的意思，而不是非句子中的意思
- 【重要】选项必须是纯单词或短语，不能是完整句子
- 【重要】选项必须与单词本身的意思无关，不能包含单词的任何含义
- 【重要】词形变化必须是确实存在的，不要硬加不存在的词形
- 【极其重要】enriched_meaning 中不能包含占位符文本（如"释义1"、"含义1"、"meaning 1"等），必须全部是具体的、有意义的翻译内容
- 【输出约束】除了工具调用的JSON输出外，不要添加任何其他文本、解释或说明。直接生成工具调用所需的JSON参数即可。
"""

        messages = [{"role": "user", "content": prompt}]
        
        response = await self.call_minimax(messages, [tool_def], temperature=0.0, max_tokens=16384)
        
        try:
            for choice in response["choices"]:
                if "tool_calls" in choice["message"]:
                    tool_call = choice["message"]["tool_calls"][0]
                    args = json.loads(tool_call["function"]["arguments"])
                    return args
            default_response = {
                "word": word,
                "enriched_meaning": correct_meaning,
                "variants_detail": [],
                "examples": [
                    {"sentence": f"This is a sentence with {word}.", "translation": f"Example translation for {word} in {target_lang}."},
                    {"sentence": f"I can use {word} in a sentence.", "translation": f"Example translation for {word} in {target_lang}."}
                ],
                "memory_hint": "",
                "multiple_choice": {
                    "question": "",
                    "correct_answer": correct_meaning,
                    "options": [
                        {"text": correct_meaning, "is_correct": True},
                        {"text": f"Option 1 in {target_lang}", "is_correct": False},
                        {"text": f"Option 2 in {target_lang}", "is_correct": False},
                        {"text": f"Option 3 in {target_lang}", "is_correct": False}
                    ]
                }
            }
            return default_response
        except Exception as e:
            print(f"Tool call failed: {e}")
            print(f"Response: {response}")
            error_response = {
                "word": word,
                "enriched_meaning": correct_meaning,
                "variants_detail": [],
                "examples": [
                    {"sentence": f"This is a sentence with {word}.", "translation": f"Example translation for {word} in {target_lang}."},
                    {"sentence": f"I can use {word} in a sentence.", "translation": f"Example translation for {word} in {target_lang}."}
                ],
                "memory_hint": "",
                "multiple_choice": {
                    "question": "",
                    "correct_answer": correct_meaning,
                    "options": [
                        {"text": correct_meaning, "is_correct": True},
                        {"text": f"Option 1 in {target_lang}", "is_correct": False},
                        {"text": f"Option 2 in {target_lang}", "is_correct": False},
                        {"text": f"Option 3 in {target_lang}", "is_correct": False}
                    ]
                }
            }
            return error_response

    async def process_text_with_dictionary(self, text: str, source_lang: str, target_lang: str):
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
                        "translation_phrases": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "将 tokenized_translation 拆分为独立片段，用于翻译排序练习。【拆分原则】1.优先拆成单个词；2.【极其重要】固定搭配、习语、短语动词必须作为整体不拆分（如'run out of'不能拆为'run'+'out of'，必须保持'run out of'整体；'what's up'不拆分；'look forward to'不拆分；'give up'不拆分）；3.虚词（的、了、地等）可以与相邻词合并；4.每个片段不能是单个无意义虚词。【极其重要】所有片段按顺序拼接后必须等于 tokenized_translation 的内容（去除标点差异后），不能遗漏或增加内容"
                        },
                        "grammar_explanation": {
                            "type": "string",
                            "description": "整个文本的一个完整语法解释，用 TARGET_LANG"
                        },
                        "redundant_tokens": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "4个与原文相关的合理冗余tokens，用于测验目的，必须全部使用TARGET_LANG。【极其重要】每个冗余token必须是单个独立的词，不能是多个词组成的短语或词组"
                        },
                        "dictionary_entries": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "word": {"type": "string", "description": "The word or phrase. Fixed collocations must be kept as one entry (e.g. 'what's up', 'run out of')"},
                                    "ipa": {"type": "string"},
                                    "context_meaning": {"type": "string"},
                                    "translation": {"type": "string"},
                                    "tokens": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "description": "Component words of this entry. For fixed collocations, list each component (e.g. 'what's up' -> ['what's', 'up'])"
                                    },
                                    "morphology": {
                                        "type": "string",
                                        "description": "词性缩写，如 n, v, adj 等"
                                    }
                                },
                                "required": [
                                    "word", "ipa", "context_meaning",
                                    "translation", "tokens", "morphology"
                                ]
                            }
                        }
                    },
                    "required": [
                        "original", "translation", "tokenized_translation", "translation_phrases",
                        "grammar_explanation", "redundant_tokens", "dictionary_entries"
                    ]
                }
            }
        }

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
  - translation: 这个词翻译成 TARGET_LANG，必须是简洁的单词或短语，不能是完整句子或长从句
  - phonetic: 音标(IPA)（如果是中文等没有音标的语言，可为空）
  - morphology: 只能是词性缩写（如 n, v, adj）
- tokenized_translation: 完整自然的 TARGET_LANG 翻译，正常句子格式
- translation_phrases: 将 tokenized_translation 拆分为独立片段，用于翻译排序练习。【拆分原则】1.优先拆成单个词；2.【极其重要】固定搭配、习语、短语动词必须作为整体不拆分（如'run out of'不能拆为'run'+'out of'，必须保持'run out of'整体；'what's up'不拆分；'look forward to'不拆分；'give up'不拆分）；3.虚词（的、了、地等）可以与相邻词合并；4.每个片段不能是单个无意义虚词。【极其重要】所有片段按顺序拼接后必须等于 tokenized_translation 的内容（去除标点差异后），不能遗漏或增加内容
- grammar_explanation: 整个文本的一个完整语法解释，用 TARGET_LANG
- redundant_tokens: 4个与原文相关的合理冗余tokens，用于测验目的，必须全部使用TARGET_LANG（目标语言）。【极其重要】每个冗余token必须是单个独立的词，不能是多个词组成的短语或词组。【关键规则】生成的冗余词与正确答案中的词组合后，不能形成与正确答案相同或近似的意思。例如：如果正确答案是"她读书"，冗余词"看"是不合适的，因为"她看书"和"她读书"意思几乎一样；应该选择如"写"、"买"、"卖"等组合后意思明显不同的词

【极其重要！！！固定搭配处理规则！！！
- 对于固定搭配（如 what's up, live in, how are you, look forward to 等），请将整个固定搭配作为一个整体处理，不要拆分！！！
- 固定搭配的text字段应该包含整个短语，如 "what's up" 而不是分开的 "what's" 和 "up"
- 对于缩写形式（如 what's, don't, he's 等）也要作为一个整体处理，不要拆分！！！

同时，为文本中出现的词汇生成完整词典条目（dictionary_entries）：

【极其重要！！！dictionary_entries的分组规则！！！】
- 【优先拆分原则】当一个词组可以被拆分为多个独立单词时，必须拆分为独立条目，不要作为整体！例如 "頑張ってください" 必须拆成 "頑張って" 和 "ください" 两个条目，不能作为一个整体条目
- 只有真正的不可拆分的固定搭配（如英语 "what's up"、法语 "au revoir"）才作为单个条目
- 判断标准：如果拆分后每个部分都有独立的含义和用法，就必须拆分；只有当整体的意思完全不等于各部分之和时才保持整体
- 缩写形式（如 what's, don't, he's）必须作为单个条目，不要拆分
- 每个条目的 tokens 字段列出该条目包含的原文单词（如 word="what's up" 则 tokens=["what's", "up"]）
- 【极其重要】文本中的每一个单词都必须被某个条目的 tokens 覆盖，一个都不能遗漏！

为每个条目提供：
1. word: The word or phrase itself (固定搭配用完整短语，如 "what's up")
2. ipa: International Phonetic Alphabet pronunciation
3. context_meaning: Meaning in TARGET_LANG based on the context - 只需要几个独立的词，不需要用一句话进行解释
4. translation: Translation of the word to TARGET_LANG
5. tokens: Split the word into tokens if applicable (固定搭配列出组成单词，如 "what's up" -> ["what's", "up"])
6. morphology: Part of speech abbreviation (e.g., n, v, adj, adv, etc.)

【重要要求】
- 翻译题应该用整个句子的翻译按token进行拆分后的结果作为答案，而不是分别每个单词的意思所组成的
- 生成冗余词时要注意：
  1. 必须使用TARGET_LANG（目标语言）生成冗余词
  2. 【极其重要】每个冗余token必须是单个独立的词，不能是多个词组成的短语或词组。例如：正确可以是"苹果"、"快乐"，错误的是"红色的苹果"、"非常快乐"
  3. 冗余词的意思不能太相近，要避免多个冗余词都表达类似的含义
  4. 确保使用错误的答案组成的意思不是合理的，也不能是与正确答案近似的意思
  5. 冗余词应该是容易混淆但明显不同的概念
  6. 【极其重要】冗余词替换正确答案中的对应词后，组成的句子意思不能与原句意思相同或近似。例如正确答案是"读书"，冗余词不能是"看"（因为"看书"≈"读书"），而应该是"写"、"买"等意思明显不同的词

要处理的文本：
TEXT_CONTENT

请严格按照 tool 定义的 JSON 结构返回所有字段，不要遗漏任何 required 字段。
"""

        prompt = prompt.replace("TEXT_LANG", source_lang)
        prompt = prompt.replace("TARGET_LANG", target_lang)
        prompt = prompt.replace("TEXT_CONTENT", text)

        messages = [{"role": "user", "content": prompt}]
        
        response = await self.call_minimax(messages, [tool_def], temperature=0.0, max_tokens=16384)        
        try:
            for choice in response["choices"]:
                if "tool_calls" in choice["message"]:
                    tool_call = choice["message"]["tool_calls"][0]
                    args = json.loads(tool_call["function"]["arguments"])
                    if "dictionary_entries" in args:
                        de = args["dictionary_entries"]
                        if isinstance(de, str):
                            repaired = _repair_truncated_json(de)
                            args["dictionary_entries"] = repaired
                            print(f"[DEBUG] process_text_with_dictionary: repaired dictionary_entries from string, got {len(repaired)} entries")
                        elif isinstance(de, list) and de and not isinstance(de[0], dict):
                            args["dictionary_entries"] = []
                    if "translation" in args and isinstance(args["translation"], str):
                        repaired_tr = _repair_truncated_json(args["translation"])
                        args["translation"] = repaired_tr if isinstance(repaired_tr, list) else []
                    return args
            return {}
        except Exception as e:
            print(f"Tool call failed: {e}")
            print(f"Response: {response}")
            return {}

    async def process_remaining_words(self, words: list, source_lang: str, target_lang: str, context: str = ""):
        if not words:
            return []
        
        tool_def = {
            "type": "function",
            "function": {
                "name": "generate_remaining_dictionary_entries",
                "description": "为遗漏的单词生成词典条目",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "dictionary_entries": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "word": {"type": "string"},
                                    "ipa": {"type": "string"},
                                    "context_meaning": {"type": "string"},
                                    "translation": {"type": "string"},
                                    "tokens": {
                                        "type": "array",
                                        "items": {"type": "string"}
                                    },
                                    "morphology": {
                                        "type": "string",
                                        "description": "词性缩写，如 n, v, adj 等"
                                    }
                                },
                                "required": [
                                    "word", "ipa", "context_meaning",
                                    "translation", "tokens", "morphology"
                                ]
                            }
                        }
                    },
                    "required": ["dictionary_entries"]
                }
            }
        }

        words_str = ", ".join(words)
        prompt = f"""以下单词在之前的处理中被遗漏了，请为它们生成完整的词典条目，使用 {target_lang} 输出。

遗漏的单词：{words_str}

上下文句子：{context}

请为每个单词提供：
1. word: 单词本身
2. ipa: 国际音标
3. context_meaning: 基于上下文的 {target_lang} 释义
4. translation: {target_lang} 翻译
5. tokens: 分词结果
6. morphology: 词性缩写（如 n, v, adj, adv, prep, conj, pron, det 等）

【重要】必须为每一个遗漏的单词都生成条目，不要遗漏任何一个！
【输出约束】除了工具调用的JSON输出外，不要添加任何其他文本、解释或说明。"""

        messages = [{"role": "user", "content": prompt}]
        
        response = await self.call_minimax(messages, [tool_def], temperature=0.0, max_tokens=16384)
        
        try:
            for choice in response["choices"]:
                if "tool_calls" in choice["message"]:
                    tool_call = choice["message"]["tool_calls"][0]
                    args = json.loads(tool_call["function"]["arguments"])
                    entries = args.get("dictionary_entries", [])
                    if isinstance(entries, str):
                        entries = _repair_truncated_json(entries)
                    if not isinstance(entries, list):
                        entries = []
                    valid_entries = [e for e in entries if isinstance(e, dict) and "word" in e]
                    print(f"[DEBUG] process_remaining_words returned {len(valid_entries)} valid entries")
                    return valid_entries
            return []
        except Exception as e:
            print(f"Process remaining words failed: {e}")
            return []
