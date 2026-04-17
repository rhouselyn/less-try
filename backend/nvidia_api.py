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
                                    "variants": {"type": "array", "items": {"type": "string"}},
                                    "examples": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "minItems": 2,
                                        "maxItems": 2
                                    }
                                },
                                "required": ["word", "ipa", "context_meaning", "variants", "examples"]
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
1. ipa: International Phonetic Alphabet pronunciation
2. context_meaning: Meaning in {target_lang} based on the context
3. variants: Other forms of the word (e.g., past tense, plural) if applicable
4. examples: 2 example sentences in {source_lang} that match the context meaning
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
                "description": "Split text into sentences and translate each",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "sentences": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "original": {"type": "string"},
                                    "translation": {"type": "string"},
                                    "tokens": {"type": "array", "items": {"type": "string"}}
                                },
                                "required": ["original", "translation", "tokens"]
                            }
                        }
                    },
                    "required": ["sentences"]
                }
            }
        }

        prompt = f"""Split the following {source_lang} text into sentences.
For each sentence:
1. original: The original sentence in {source_lang}
2. translation: Translation to {target_lang}
3. tokens: Split into individual words/tokens

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
                    return args["sentences"]
            return []
        except Exception as e:
            print(f"Tool call failed: {e}")
            print(f"Response: {response}")
            return []
