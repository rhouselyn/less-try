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
            result = await asyncio.to_thread(
                self._sync_post,
                f"{self.base_url}/chat/completions",
                self.headers,
                payload,
                600
            )
            return result
        except requests.exceptions.Timeout:
            print("API request timed out. Retrying...")
            result = await asyncio.to_thread(
                self._sync_post,
                f"{self.base_url}/chat/completions",
                self.headers,
                payload,
                600
            )
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
                        "context_meaning": {
                            "type": "string",
                            "description": "结合上下文的特定释义"
                        },
                        "ipa": {"type": "string"},
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
                    "required": ["word", "enriched_meaning", "context_meaning", "ipa", "examples", "multiple_choice"]
                }
            }
        }

        prompt = f"""
为单词 '{word}' 生成丰富的信息，使用 {target_lang} 输出。

上下文释义：{correct_meaning}

上下文：{context}

请生成以下信息：

1. enriched_meaning: 单词的完整释义，包含多个母语单词的常见含义，用分号分隔
2. context_meaning: 结合上下文的特定释义
3. ipa: 国际音标发音（如果是中文等没有音标的语言，可为空）
4. variants_detail: 词形变化列表，带类型说明（如过去式、复数等），只包含确实存在的词形变化，如果没有则返回空数组
5. examples: 两个符合上下文含义的例句，每个都有 {target_lang} 的翻译
6. memory_hint: 记忆辅助（与用户母语的联想或对比）
7. multiple_choice: 选择题，包含：
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
                            "description": "【极其重要】每个词的translation字段都不能为空！即使是冠词、介词、连词等也必须给出TARGET_LANG翻译。例如：the→这/那，a→一个，in→在…里，had→有/已经，to→到/为了",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "text": {"type": "string"},
                                    "translation": {"type": "string", "description": "该词在TARGET_LANG中的翻译，绝不能为空字符串！即使是功能词也必须给出对应翻译"},
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
                        "translation_tokens": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "将tokenized_translation按语义切分为4-8个有意义的短语片段，用于翻译排序练习。切分规则：1)按语义单元切分，每个片段应是一个完整的语义单元（如主语短语、谓语短语、状语等）；2)每个片段长度2-8个汉字为宜；3)所有片段按顺序拼接后应等于tokenized_translation（去除标点后）；4)不要把单个虚词（的、了、地等）单独切分为一个片段，应与相邻实词合并；5)不要切分得太细（如每个字一个片段）或太粗（如整个句子一个片段）",
                            "minItems": 2,
                            "maxItems": 8
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
                                    },
                                    "morphology": {
                                        "type": "string",
                                        "description": "词性缩写，如 n, v, adj 等"
                                    }
                                },
                                "required": [
                                    "word", "ipa", "context_meaning", "variants", 
                                    "examples", "options", "grammar", "translation", "tokens", "morphology"
                                ]
                            }
                        }
                    },
                    "required": [
                        "original", "translation", "tokenized_translation", "translation_tokens",
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
  - translation: 这个词翻译成 TARGET_LANG。【极其重要】每个词的translation字段都不能为空字符串！即使是冠词(the→这/那)、介词(in→在…里/for→为了)、连词(although→虽然)、代词(they→他们/their→他们的)、助动词(had→已经/would→会/could→能够)、不定式标记(to→到/为了)等也必须给出对应翻译。不要用括号注释如"（引导从句）"代替翻译，要给出实际的翻译词！
  - phonetic: 音标(IPA)（如果是中文等没有音标的语言，可为空）
  - morphology: 只能是词性缩写（如 n, v, adj）
- tokenized_translation: 完整自然的 TARGET_LANG 翻译，正常句子格式
- translation_tokens: 将tokenized_translation按语义切分为4-8个有意义的短语片段数组，用于翻译排序练习。【极其重要】切分规则：
  1) 按语义单元切分，每个片段应是一个完整的语义单元（如"主语短语"、"谓语+宾语"、"状语"等）
  2) 每个片段长度2-8个汉字为宜
  3) 所有片段按顺序拼接后应等于tokenized_translation（去除标点后）
  4) 不要把单个虚词（的、了、地等）单独切分为一个片段，应与相邻实词合并
  5) 不要切分得太细（如每个字一个片段）或太粗（如整个句子一个片段）
  6) 示例：tokenized_translation="虽然研究人员已经不知疲倦地工作了数月" → translation_tokens=["虽然研究人员","已经不知疲倦地","工作了数月"]
  7) 示例：tokenized_translation="猫坐在垫子上" → translation_tokens=["猫","坐在","垫子上"]
- grammar_explanation: 整个文本的一个完整语法解释，用 TARGET_LANG
- redundant_tokens: 4个与原文相关的合理冗余tokens，用于测验目的，必须全部使用TARGET_LANG（目标语言）。【极其重要】每个冗余token必须是单个独立的词，不能是多个词组成的短语或词组

【极其重要！！！固定搭配处理规则！！！
- 对于固定搭配（如 what's up, live in, how are you, look forward to 等），请将整个固定搭配作为一个整体处理，不要拆分！！！
- 固定搭配的text字段应该包含整个短语，如 "what's up" 而不是分开的 "what's" 和 "up"
- 对于缩写形式（如 what's, don't, he's 等）也要作为一个整体处理，不要拆分！！！

同时，为文本中出现的【每一个单词】生成完整词典条目（dictionary_entries）：

【极其重要！！！dictionary_entries必须包含文本中的每一个单词！！！】
- 必须为文本中出现的每一个单词都生成词典条目，一个都不能遗漏！
- 这包括但不限于：介词（如 on, in, at, with, of, for, to）、冠词（如 a, an, the）、连词（如 and, or, but）、代词（如 your, their, it）、简单动词（如 is, do, has）、限定词（如 this, that, some）等
- 即使是看似简单的词（如 on, your, of, with）也必须生成完整的词典条目
- 不要因为某个词"太简单"或"太常见"就跳过它
- 请在生成后逐一核对：文本中的每个单词是否都在dictionary_entries中有对应条目

为每个单词提供：
1. word: The word itself
2. ipa: International Phonetic Alphabet pronunciation
3. context_meaning: Meaning in TARGET_LANG based on the context - 只需要几个独立的词，不需要用一句话进行解释
4. variants: Other forms of the word (e.g., past tense, plural) if applicable, each with "type" (e.g., verb, noun) and "form" (the variant form)
5. examples: 2 example sentences in SOURCE_LANG that match the context meaning
6. options: 4 options for the meaning (1 correct, 3 incorrect) - 错误答案必须是该单词所没有的意思，而不是非句子中的意思
7. grammar: Grammar explanation for the word
8. translation: Translation of the word to TARGET_LANG
9. tokens: Split the word into tokens if applicable
10. morphology: Part of speech abbreviation (e.g., n, v, adj, adv, etc.)

【重要要求】
- 翻译题应该用整个句子的翻译按token进行拆分后的结果作为答案，而不是分别每个单词的意思所组成的
- 生成冗余词时要注意：
  1. 必须使用TARGET_LANG（目标语言）生成冗余词
  2. 【极其重要】每个冗余token必须是单个独立的词，不能是多个词组成的短语或词组。例如：正确可以是"苹果"、"快乐"，错误的是"红色的苹果"、"非常快乐"
  3. 冗余词的意思不能太相近，要避免多个冗余词都表达类似的含义
  4. 确保使用错误的答案组成的意思不是合理的，也不能是与正确答案近似的意思
  5. 冗余词应该是容易混淆但明显不同的概念

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
                                    },
                                    "morphology": {
                                        "type": "string",
                                        "description": "词性缩写，如 n, v, adj 等"
                                    }
                                },
                                "required": [
                                    "word", "ipa", "context_meaning", "variants",
                                    "examples", "options", "grammar", "translation", "tokens", "morphology"
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
4. variants: 词形变化列表
5. examples: 2个例句
6. options: 4个选项（1个正确，3个错误）
7. grammar: 语法解释
8. translation: {target_lang} 翻译
9. tokens: 分词结果
10. morphology: 词性缩写（如 n, v, adj, adv, prep, conj, pron, det 等）

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
