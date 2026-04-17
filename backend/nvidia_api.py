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

        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=self.headers,
            json=payload
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

        prompt = f"""Generate dictionary entries for the following words in {source_lang}.
Use the context below to ensure meanings are accurate to the text.
Translate meanings to {target_lang}.

Words: {', '.join(words)}

Context:
{context}

For each word, provide:
1. word: The word itself
2. ipa: International Phonetic Alphabet pronunciation
3. context_meaning: Meaning in {target_lang} based on the context
4. variants: Other forms of the word (e.g., past tense, plural) if applicable, each with "type" (e.g., verb, noun) and "form" (the variant form)
5. examples: 2 example sentences in {source_lang} that match the context meaning
6. options: 4 options for the meaning (1 correct, 3 incorrect)
7. grammar: Grammar explanation for the word
8. translation: Translation of the word to {target_lang}
9. tokens: Split the word into tokens if applicable
"""

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
                "description": "Split text into tokens, translate each token, and provide grammar explanation",
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
                        "grammar_explanation": {"type": "string"}
                    },
                    "required": ["original", "translation", "grammar_explanation"]
                }
            }
        }

        prompt = f"""Process the following {source_lang} text and translate it to {target_lang}:

1. original: The original text in {source_lang}
2. translation: Split the text into individual words/tokens, each with:
   - text: The original token (no punctuation)
   - translation: Translation of the token to {target_lang}
   - phonetic: Phonetic transcription
   - morphology: Morphological information (e.g., part of speech, tense, number)
3. grammar_explanation: Grammar explanation for the text in {target_lang}

Text:
{text}
"""

        messages = [{"role": "user", "content": prompt}]
        
        response = await self.call_minimax(messages, [tool_def], temperature=0.0)
        
        try:
            # 查找包含 tool_calls 的 choice
            for choice in response["choices"]:
                if "tool_calls" in choice["message"]:
                    tool_call = choice["message"]["tool_calls"][0]
                    args = json.loads(tool_call["function"]["arguments"])
                    return args
            return {}
        except Exception as e:
            print(f"Tool call failed: {e}")
            print(f"Response: {response}")
            return {}
