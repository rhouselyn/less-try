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
            "model": "claude-sonnet-4.6",
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
                            "description": "The complete translation split into words/tokens separated by spaces"
                        },
                        "grammar_explanation": {"type": "string"}
                    },
                    "required": ["original", "translation", "tokenized_translation", "grammar_explanation"]
                }
            }
        }

        # 构建prompt
        prompt = """
Process the following TEXT_LANG text and translate it to TARGET_LANG.

IMPORTANT INSTRUCTIONS:
1. Use TARGET_LANG for ALL translations and explanations.
2. DO NOT give grammar explanations for individual words - only give ONE comprehensive grammar explanation for the entire sentence/text.
3. FOR MORPHOLOGY: USE ONLY THESE ABBREVIATIONS - NO OTHER TEXT:
   - n (noun)
   - v (verb)
   - adj (adjective)
   - adv (adverb)
   - pron (pronoun)
   - prep (preposition)
   - conj (conjunction)
   - interj (interjection)
   - det (determiner)
4. MORPHOLOGY FIELD MUST ONLY CONTAIN THE ABBREVIATION, NOTHING ELSE
5. DO NOT include any additional explanation in the morphology field

Process the text with the following structure:
- original: The original TEXT_LANG text
- translation: Array of objects, each with:
  - text: Original word/token (without punctuation)
  - translation: Translation of this word to TARGET_LANG
  - phonetic: Phonetic transcription (IPA)
  - morphology: ONLY the part of speech abbreviation (e.g., n, v, adj)
- tokenized_translation: Complete translation to TARGET_LANG, as a normal strict translation without extra spaces
- grammar_explanation: ONE comprehensive grammar explanation for the entire text in TARGET_LANG

Text to process:
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
