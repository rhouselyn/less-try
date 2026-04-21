#!/usr/bin/env python3
"""
测试翻译还原功能
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from text_processor import TextProcessor

# 创建TextProcessor实例
text_processor = TextProcessor()

# 模拟翻译结果
def test_translation_reconstruction():
    print("=== 测试翻译还原功能 ===")
    
    # 测试用例 1: 带缩写的句子
    print("\n测试用例 1: 带缩写的句子")
    current_sentence = "What's up?"
    translation_result = {
        "tokenized_translation": "怎么了？",
        "translation": [
            {"text": "What's", "translation": "怎么", "phonetic": "/wɒts/", "morphology": "pron"},
            {"text": "up", "translation": "了", "phonetic": "/ʌp/", "morphology": "adv"}
        ]
    }
    
    # 模拟main.py中的逻辑
    original_tokens = []
    if "translation" in translation_result:
        for token in translation_result["translation"]:
            if isinstance(token, dict) and "text" in token:
                original_tokens.append(token["text"])
    
    # 如果LLM没有分词结果，使用程序分词作为 fallback
    if not original_tokens:
        original_tokens = text_processor.tokenize_sentence(current_sentence)
    
    print(f"原始句子: {current_sentence}")
    print(f"翻译: {translation_result['tokenized_translation']}")
    print(f"LLM分词结果: {original_tokens}")
    
    # 测试用例 2: 普通句子
    print("\n测试用例 2: 普通句子")
    current_sentence = "Hello world!"
    translation_result = {
        "tokenized_translation": "你好世界！",
        "translation": [
            {"text": "Hello", "translation": "你好", "phonetic": "/həˈloʊ/", "morphology": "interj"},
            {"text": "world", "translation": "世界", "phonetic": "/wɜːrld/", "morphology": "n"}
        ]
    }
    
    # 模拟main.py中的逻辑
    original_tokens = []
    if "translation" in translation_result:
        for token in translation_result["translation"]:
            if isinstance(token, dict) and "text" in token:
                original_tokens.append(token["text"])
    
    # 如果LLM没有分词结果，使用程序分词作为 fallback
    if not original_tokens:
        original_tokens = text_processor.tokenize_sentence(current_sentence)
    
    print(f"原始句子: {current_sentence}")
    print(f"翻译: {translation_result['tokenized_translation']}")
    print(f"LLM分词结果: {original_tokens}")
    
    # 测试用例 3: 没有LLM分词结果的情况
    print("\n测试用例 3: 没有LLM分词结果的情况")
    current_sentence = "How are you?"
    translation_result = {
        "tokenized_translation": "你好吗？"
    }
    
    # 模拟main.py中的逻辑
    original_tokens = []
    if "translation" in translation_result:
        for token in translation_result["translation"]:
            if isinstance(token, dict) and "text" in token:
                original_tokens.append(token["text"])
    
    # 如果LLM没有分词结果，使用程序分词作为 fallback
    if not original_tokens:
        original_tokens = text_processor.tokenize_sentence(current_sentence)
    
    print(f"原始句子: {current_sentence}")
    print(f"翻译: {translation_result['tokenized_translation']}")
    print(f"程序分词结果: {original_tokens}")

if __name__ == "__main__":
    test_translation_reconstruction()
    print("\n=== 测试完成 ===")
