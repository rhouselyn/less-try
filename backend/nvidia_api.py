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
                        "original": {"type": "string"},
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
                        "grammar_explanation": {"type": "string"}
                    },
                    "required": ["original", "translation", "tokenized_translation", "grammar_explanation"]
                }
            }
        }

        # 构建prompt
        prompt = """处理以下 TEXT_LANG 文本，并翻译成 TARGET_LANG。

【非常非常重要的说明！！！】
1. 首先检查输入文本的语言：
   - 如果输入文本不是 TEXT_LANG，必须先严格翻译成 TEXT_LANG，然后再进行后续处理
   - original 字段应该填入翻译后的 TEXT_LANG 文本
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
7. 【超级重要！！！】tokenized_translation 必须是自然的、正常的翻译：
   - 如果是英文翻译：单词之间必须用空格分隔！！！
   - 如果是中文翻译：词语之间绝对不要有空格！！！
   - 保持自然的句子格式
8. 【举例！！！】比如英文 "AI models generate responses." 翻译成中文时，应该是 "人工智能模型生成响应。"，绝对不能是 "人工智能 模型 生成 响应。"！
   - 【反过来！！！】如果是中文翻译成英文，必须是 "Artificial intelligence models generate responses."，绝对不能是 "Artificialintelligencemodelsgenerateresponses."！
9. 【绝对不要！！！】不要修改 original 字段中的空格，不要去掉任何空格！！！

按照以下结构处理文本：
- original: TEXT_LANG 文本（如果输入不是 TEXT_LANG，先翻译成 TEXT_LANG）- 完全保留原始空格！！！
- translation: 对象数组，每个对象包含：
  - text: TEXT_LANG 原词/标记（不带标点）
  - translation: 这个词翻译成 TARGET_LANG
  - phonetic: 音标(IPA)（如果是中文等没有音标的语言，可为空）
  - morphology: 只能是词性缩写（如 n, v, adj）
- tokenized_translation: 完整自然的 TARGET_LANG 翻译，正常句子格式
- grammar_explanation: 整个文本的一个完整语法解释，用 TARGET_LANG

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
                "description": "Generate simple word information with multiple choice options",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "word": {"type": "string"},
                        "meaning": {
                            "type": "string",
                            "description": "单词的意思"
                        },
                        "options": {
                            "type": "array",
                            "description": "4个选项（1个正确，3个错误）",
                            "items": {
                                "type": "string"
                            },
                            "minItems": 4,
                            "maxItems": 4
                        },
                        "correct_index": {
                            "type": "integer",
                            "description": "正确选项的索引"
                        }
                    },
                    "required": ["word", "meaning", "options", "correct_index"]
                }
            }
        }

        # 构建简化的prompt
        prompt = f"""
为单词 '{word}' 生成简单的信息，使用 {target_lang} 输出。

单词意思：{correct_meaning}

请生成：
1. meaning: 单词的意思
2. options: 4个选项（1个正确，3个错误）
3. correct_index: 正确选项的索引

要求：
- 所有输出必须使用 {target_lang}
- 选项要清晰且合理
- 正确选项就是给定的单词意思
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
                    {"sentence": f"This is a sentence with {word}.", "translation": f"这是包含{word}的句子。"},
                    {"sentence": f"I can use {word} in a sentence.", "translation": f"我可以在句子中使用{word}。"}
                ],
                "memory_hint": "",
                "multiple_choice": {
                    "question": "",
                    "correct_answer": correct_meaning,
                    "options": [
                        {"text": correct_meaning, "is_correct": True},
                        {"text": "选项1", "is_correct": False},
                        {"text": "选项2", "is_correct": False},
                        {"text": "选项3", "is_correct": False}
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
                    {"sentence": f"This is a sentence with {word}.", "translation": f"这是包含{word}的句子。"},
                    {"sentence": f"I can use {word} in a sentence.", "translation": f"我可以在句子中使用{word}。"}
                ],
                "memory_hint": "",
                "multiple_choice": {
                    "question": "",
                    "correct_answer": correct_meaning,
                    "options": [
                        {"text": correct_meaning, "is_correct": True},
                        {"text": "选项1", "is_correct": False},
                        {"text": "选项2", "is_correct": False},
                        {"text": "选项3", "is_correct": False}
                    ]
                }
            }
            return error_response

