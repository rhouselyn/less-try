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
        prompt = """
处理以下 TEXT_LANG 文本，并翻译成 TARGET_LANG。

【非常重要的说明】
1. 所有翻译和解释都必须使用 TARGET_LANG（目标语言）。
2. 不要单独给每个词语法解释 - 只给整个句子一个完整的语法解释。
3. 词性标注（morphology）只能使用以下缩写，不要加其他文字：
   - n (名词)
   - v (动词)
   - adj (形容词)
   - adv (副词)
   - pron (代词)
   - prep (介词)
   - conj (连词)
   - interj (感叹词)
   - det (限定词)
4. morphology 字段必须只包含缩写，不要有其他内容！
5. morphology 字段里不要加任何额外的解释！
6. 【重点！】tokenized_translation 必须是自然的、正常的翻译 - 绝对不要在词语之间人工添加空格！
7. 【举例！】比如英文 "AI models generate responses. And outputs based on complex algorithms." 翻译成中文时，应该是 "人工智能模型根据复杂的算法生成响应和输出。"，绝对不能是 "人工智能 模型 根据 复杂的 算法 生成 响应 和 输出"！

按照以下结构处理文本：
- original: 原始 TEXT_LANG 文本
- translation: 对象数组，每个对象包含：
  - text: 原词/标记（不带标点）
  - translation: 这个词翻译成 TARGET_LANG
  - phonetic: 音标(IPA)
  - morphology: 只能是词性缩写（如 n, v, adj）
- tokenized_translation: 完整自然的 TARGET_LANG 翻译，正常句子，词语之间绝对不要有多余空格！
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

    async def generate_multiple_choice(self, words: List[Dict], context: str, source_lang: str, target_lang: str):
        tool_def = {
            "type": "function",
            "function": {
                "name": "generate_multiple_choice",
                "description": "Generate multiple choice quiz questions",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "questions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "question": {"type": "string"},
                                    "word": {"type": "string"},
                                    "correct_answer": {"type": "string"},
                                    "options": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "minItems": 4,
                                        "maxItems": 4
                                    },
                                    "context": {"type": "string"}
                                },
                                "required": ["id", "question", "word", "correct_answer", "options", "context"]
                            }
                        }
                    },
                    "required": ["questions"]
                }
            }
        }

        # 构建prompt
        prompt = """
Generate multiple choice quiz questions for the following words in SOURCE_LANG.
Use the context below to ensure questions are relevant to the learning material.
Translate questions and answers to TARGET_LANG.

Words: WORDS_LIST

Context:
CONTEXT_CONTENT

For each word, create a multiple choice question where:
1. The question asks for the meaning or usage of the word
2. There is 1 correct answer and 3 incorrect distractors
3. All options are plausible but only one is correct
4. The question includes context from the provided text
5. The distractors are related to the word's meaning but not correct

Provide the questions in the specified JSON format.
"""

        # 替换占位符
        prompt = prompt.replace("SOURCE_LANG", source_lang)
        prompt = prompt.replace("TARGET_LANG", target_lang)
        prompt = prompt.replace("WORDS_LIST", ', '.join([word['word'] for word in words]))
        prompt = prompt.replace("CONTEXT_CONTENT", context)

        messages = [{"role": "user", "content": prompt}]
        
        response = await self.call_minimax(messages, [tool_def], temperature=0.0)
        
        try:
            for choice in response["choices"]:
                if "tool_calls" in choice["message"]:
                    tool_call = choice["message"]["tool_calls"][0]
                    args = json.loads(tool_call["function"]["arguments"])
                    return args["questions"]
            return []
        except Exception as e:
            print(f"Tool call failed: {e}")
            print(f"Response: {response}")
            return []

    async def generate_matching(self, words: List[Dict], context: str, source_lang: str, target_lang: str):
        tool_def = {
            "type": "function",
            "function": {
                "name": "generate_matching",
                "description": "Generate matching quiz questions",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "questions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "question": {"type": "string"},
                                    "word": {"type": "string"},
                                    "correct_answer": {"type": "string"},
                                    "options": {
                                        "type": "array",
                                        "items": {"type": "string"}
                                    },
                                    "answers": {
                                        "type": "array",
                                        "items": {"type": "string"}
                                    }
                                },
                                "required": ["id", "question", "word", "correct_answer", "options", "answers"]
                            }
                        }
                    },
                    "required": ["questions"]
                }
            }
        }

        # 构建prompt
        prompt = """
        Generate matching quiz questions for the following words in SOURCE_LANG.
        Use the context below to ensure translations are accurate to the learning material.

        Words: WORDS_LIST

        Context:
        CONTEXT_CONTENT

        For each word, create a matching question where:
        1. The question asks to match the word with its translation
        2. Provide the word as the only option
        3. Provide a list of possible translations including the correct one
        4. The correct answer is the accurate translation based on the context

        Provide the questions in the specified JSON format.
        """

        # 替换占位符
        prompt = prompt.replace("SOURCE_LANG", source_lang)
        prompt = prompt.replace("TARGET_LANG", target_lang)
        prompt = prompt.replace("WORDS_LIST", ', '.join([word['word'] for word in words]))
        prompt = prompt.replace("CONTEXT_CONTENT", context)

        messages = [{"role": "user", "content": prompt}]
        
        response = await self.call_minimax(messages, [tool_def], temperature=0.0)
        
        try:
            for choice in response["choices"]:
                if "tool_calls" in choice["message"]:
                    tool_call = choice["message"]["tool_calls"][0]
                    args = json.loads(tool_call["function"]["arguments"])
                    return args["questions"]
            return []
        except Exception as e:
            print(f"Tool call failed: {e}")
            print(f"Response: {response}")
            return []
