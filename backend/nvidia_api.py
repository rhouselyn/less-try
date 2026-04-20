import os
import requests
import json
from typing import List, Dict, Any


class NvidiaAPI:
    def __init__(self):
        self.api_key = "sk-cp-_8A4FS-xzNygSSrcPqjaQJA0aJhxqYkYmNcrTrhpWRM"
        self.base_url = "https://ai.irobotx.top/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def call_minimax(self, messages: List[Dict], tools: List[Dict] = None, temperature: float = 0.0):
        payload = {
            "model": "claude-haiku-4.5",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 4096
        }
        
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=600  # 10分钟超时
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout:
            print("API request timed out. Retrying...")
            # Retry once
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=600  # 10分钟超时
            )
            response.raise_for_status()
            return response.json()

    async def generate_dictionary(self, words: List[str], context: str, source_lang: str, target_lang: str):
        tool_def = {
            "type": "function",
            "function": {
                "name": "generate_dictionary",
                "description": "Generate dictionary entries for words with context",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "words": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "word": {"type": "string"},
                                    "ipa": {"type": "string"},
                                    "context_meaning": {"type": "string"},
                                    "variants": {"type": "array", "items": {"type": "object", "properties": {"type": {"type": "string"}, "form": {"type": "string"}}, "required": ["type", "form"]}},
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
                                    "tokens": {"type": "array", "items": {"type": "string"}}
                                },
                                "required": ["word", "ipa", "context_meaning", "variants", "examples", "options", "grammar", "translation", "tokens"]
                            }
                        }
                    },
                    "required": ["words"]
                }
            }
        }

        # 构建prompt
        prompt = """
Generate dictionary entries for the following words in SOURCE_LANG.
Use the context below to ensure meanings are accurate to the text.
Translate meanings to TARGET_LANG.

Words: WORDS_LIST

Context:
CONTEXT_CONTENT

For each word, provide:
1. word: The word itself
2. ipa: International Phonetic Alphabet pronunciation
3. context_meaning: Meaning in TARGET_LANG based on the context
4. variants: Other forms of the word (e.g., past tense, plural) if applicable, each with "type" (e.g., verb, noun) and "form" (the variant form)
5. examples: 2 example sentences in SOURCE_LANG that match the context meaning
6. options: 4 options for the meaning (1 correct, 3 incorrect)
7. grammar: Grammar explanation for the word
8. translation: Translation of the word to TARGET_LANG
9. tokens: Split the word into tokens if applicable
"""

        # 替换占位符
        prompt = prompt.replace("SOURCE_LANG", source_lang)
        prompt = prompt.replace("TARGET_LANG", target_lang)
        prompt = prompt.replace("WORDS_LIST", ', '.join(words))
        prompt = prompt.replace("CONTEXT_CONTENT", context)

        messages = [{"role": "user", "content": prompt}]
        
        response = await self.call_minimax(messages, [tool_def], temperature=0.0)
        
        try:
            # 查找包含 tool_calls 的 choice
            for choice in response["choices"]:
                if "tool_calls" in choice["message"]:
                    tool_call = choice["message"]["tool_calls"][0]
                    args = json.loads(tool_call["function"]["arguments"])
                    return args["words"]
            return []
        except Exception as e:
            print(f"Tool call failed: {e}")
            print(f"Response: {response}")
            return []

    async def split_and_translate(self, text: str, source_lang: str, target_lang: str):
        tool_def = {
            "type": "function",
            "function": {
                "name": "split_and_translate",
                "description": "Split text into tokens, translate each token, and provide sentence-level grammar explanation",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "original": {"type": "string", "description": "The original text or translated text to target language if needed"},
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
                            "description": "The complete natural translation to target language, as a normal sentence without artificially added spaces between words"
                        },
                        "grammar_explanation": {"type": "string"},
                        "redundant_tokens": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "4 reasonable redundant tokens related to the original text for quiz purposes"
                        }
                    },
                    "required": ["original", "translation", "tokenized_translation", "grammar_explanation", "redundant_tokens"]
                }
            }
        }

        # 构建prompt
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
6. morphology 字段里不要加任何额外的解释！
7. 【输出约束】除了工具调用的JSON输出外，不要添加任何其他文本、解释或说明。直接生成工具调用所需的JSON参数即可。

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

【强制要求】必须返回 original 字段，即使输入文本已经是 TARGET_LANG 或 TEXT_LANG。

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
            print("=== LLM Tool JSON Response ===")
            print(json.dumps(response, indent=2, ensure_ascii=False))
            print("======================")
            
            for choice in response["choices"]:
                if "tool_calls" in choice["message"]:
                    tool_call = choice["message"]["tool_calls"][0]
                    args = json.loads(tool_call["function"]["arguments"])
                    print("=== Parsed Tool Arguments ===")
                    print(json.dumps(args, indent=2, ensure_ascii=False))
                    print("======================")
                    return args
            return {}
        except Exception as e:
            print(f"Tool call failed: {e}")
            print(f"Response: {response}")
            return {}

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
                            "description": "结合上下文的精确释义"
                        },
                        "ipa": {"type": "string"},
                        "variants_detail": {
                            "type": "array",
                            "description": "词形变化 + 类型说明",
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
                                    "type": "string"
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
                    "required": ["word", "enriched_meaning", "ipa", "examples", "multiple_choice"]
                }
            }
        }

        # 构建prompt
        prompt = f"""
为单词 '{word}' 生成丰富的信息，使用 {target_lang} 输出。

正确释义：{correct_meaning}

上下文：{context}

请生成以下信息：

1. enriched_meaning: 符合上下文的精准释义
2. ipa: 国际音标发音（如果是中文等没有音标的语言，可为空）
3. variants_detail: 词形变化列表，带类型说明（如过去式、复数等）
4. examples: 两个符合上下文含义的例句，每个都有 {target_lang} 的翻译
5. memory_hint: 记忆辅助（与用户母语的联想或对比）
6. multiple_choice: 选择题，包含：
   - question: 可为空（默认为单词本身）
   - correct_answer: 正确释义
   - options: 4个选项（1个正确，3个错误），每个都有 text 和 is_correct 标记

要求：
- 所有输出必须使用 {target_lang}
- 例句要自然，符合上下文
- 记忆辅助对语言学习者要有帮助
- 选择题选项要清晰且合理
- 【输出约束】除了工具调用的JSON输出外，不要添加任何其他文本、解释或说明。直接生成工具调用所需的JSON参数即可。
"""

        messages = [{"role": "user", "content": prompt}]
        
        response = await self.call_minimax(messages, [tool_def], temperature=0.0)
        
        try:
            for choice in response["choices"]:
                if "tool_calls" in choice["message"]:
                    tool_call = choice["message"]["tool_calls"][0]
                    args = json.loads(tool_call["function"]["arguments"])
                    return args
            # 构建默认响应
            default_response = {
                "word": word,
                "enriched_meaning": correct_meaning,
                "ipa": "",
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
            # 构建错误时的默认响应
            error_response = {
                "word": word,
                "enriched_meaning": correct_meaning,
                "ipa": "",
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

