import os
import requests
import json
from typing import List, Dict, Any

class NvidiaAPI:
    def __init__(self):
        # 更换为SiliconFlow的Qwen模型
        self.api_key = "sk-tszhvcglvfqiivwqqtqwkxmxsneyuymjjywtfxteofmfvkct"
        self.base_url = "https://api.siliconflow.cn/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def call_minimax(self, messages: List[Dict], tools: List[Dict] = None, temperature: float = 0.0):
        payload = {
            "model": "Qwen/Qwen3.6-27B",
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

    async def process_text_with_dictionary(self, text: str, source_lang: str, target_lang: str):
        """处理文本并返回翻译结果和词典条目"""
        system_prompt = f"""
        你是一个专业的翻译助手。请翻译以下文本，并提供详细的词典信息。

        规则：
        1. 翻译必须准确、完整
        2. 提供单词的详细解释，包括词性、中文释义、例句
        3. 返回格式必须是JSON格式

        输入文本（{source_lang}）：
        {text}

        目标语言：{target_lang}

        请输出JSON格式的翻译结果，包含以下字段：
        - translation: 完整翻译（以数组形式，每个元素是包含text和translation的对象）
        - dictionary_entries: 单词详细信息数组
        - tokenized_translation: 分词后的翻译结果
        - redundant_tokens: 4个与原文相关的合理冗余tokens，用于测验目的，必须全部使用{target_lang}。【极其重要】每个冗余token必须是单个独立的词，不能是多个词组成的短语或词组
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]
        
        response = await self.call_minimax(messages, temperature=0.3)
        
        try:
            result = response['choices'][0]['message']['content']
            # 尝试解析JSON
            try:
                return json.loads(result)
            except:
                # 如果不是有效JSON，返回错误
                print(f"Invalid JSON response: {result}")
                return None
        except Exception as e:
            print(f"Error parsing response: {e}")
            return None

    async def generate_multiple_choice(self, word: str, translation: str, target_lang: str):
        """生成选择题选项"""
        system_prompt = f"""
        你是一个专业的语言学习助手。请根据给定的单词和翻译生成选择题选项。

        规则：
        1. 生成4个选项，其中一个是正确答案
        2. 错误选项应该与正确答案有一定相似度，容易混淆但明显不同
        3. 所有选项必须用{target_lang}表示
        4. 返回JSON格式

        单词：{word}
        正确翻译：{translation}

        请输出JSON格式，包含：
        - options: 4个选项数组（字符串数组）
        - correct_index: 正确答案的索引（0-3）
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"生成关于 '{word}' 的选择题"}
        ]
        
        response = await self.call_minimax(messages, temperature=0.5)
        
        try:
            result = response['choices'][0]['message']['content']
            try:
                return json.loads(result)
            except:
                print(f"Invalid JSON response: {result}")
                # 如果不是JSON，生成简单的选项
                return {
                    "options": [translation, "错误选项1", "错误选项2", "错误选项3"],
                    "correct_index": 0
                }
        except Exception as e:
            print(f"Error generating options: {e}")
            return {
                "options": [translation, "错误选项1", "错误选项2", "错误选项3"],
                "correct_index": 0
            }
