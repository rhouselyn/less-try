#!/usr/bin/env python3
"""
测试脚本，用于验证所有修复是否正常工作
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from text_processor import TextProcessor
from nvidia_api import NvidiaAPI
import asyncio

async def test_sentence_segmentation():
    """测试句子分割功能"""
    print("=== 测试句子分割功能 ===")
    tp = TextProcessor()
    
    # 测试文本，包含不同类型的句子结束符
    test_text = "Hello! How are you? I'm fine. Thank you."
    sentences = tp.split_sentences(test_text)
    
    print(f"原始文本: {test_text}")
    print(f"分割结果: {sentences}")
    print(f"分割数量: {len(sentences)}")
    
    # 验证分割是否正确
    expected_sentences = ["Hello!", " How are you?", " I'm fine.", " Thank you."]
    if sentences == expected_sentences:
        print("✅ 句子分割测试通过")
    else:
        print("❌ 句子分割测试失败")
        print(f"期望: {expected_sentences}")
    print()

async def test_tokenization():
    """测试分词功能，特别是缩写处理"""
    print("=== 测试分词功能 ===")
    tp = TextProcessor()
    
    # 测试包含缩写的句子
    test_sentences = [
        "What's up?",
        "Don't worry.",
        "I'm happy.",
        "It's raining."
    ]
    
    for sentence in test_sentences:
        tokens = tp.tokenize_sentence(sentence)
        print(f"句子: {sentence}")
        print(f"分词结果: {tokens}")
        
        # 验证缩写是否被正确处理
        if "what's" in ' '.join(tokens).lower() or "don't" in ' '.join(tokens).lower() or "i'm" in ' '.join(tokens).lower() or "it's" in ' '.join(tokens).lower():
            print("✅ 缩写处理测试通过")
        else:
            print("❌ 缩写处理测试失败")
    print()

async def test_word_extraction():
    """测试单词提取功能"""
    print("=== 测试单词提取功能 ===")
    tp = TextProcessor()
    
    # 测试文本
    test_text = "Hello world! This is a test."
    words = tp.extract_words(test_text, "en")
    
    print(f"原始文本: {test_text}")
    print(f"提取的单词: {words}")
    print(f"单词数量: {len(words)}")
    
    # 验证是否提取了所有单词
    expected_words = ["hello", "world", "this", "is", "test"]
    if set(words) == set(expected_words):
        print("✅ 单词提取测试通过")
    else:
        print("❌ 单词提取测试失败")
        print(f"期望: {expected_words}")
    print()

async def test_masked_sentence_generation():
    """测试蒙版句子生成功能"""
    print("=== 测试蒙版句子生成功能 ===")
    tp = TextProcessor()
    
    # 测试句子
    test_sentence = "What's up? I'm fine, thank you."
    # 模拟词汇表
    vocab = [
        {"word": "what's"},
        {"word": "up"},
        {"word": "I'm"},
        {"word": "fine"},
        {"word": "thank"},
        {"word": "you"}
    ]
    
    result = tp.generate_masked_sentence(test_sentence, vocab)
    print(f"原始句子: {test_sentence}")
    print(f"生成的蒙版句子: {result['masked_sentence']}")
    print(f"答案单词: {result['answer_words']}")
    print(f"选项: {result['options']}")
    
    if result:
        print("✅ 蒙版句子生成测试通过")
    else:
        print("❌ 蒙版句子生成测试失败")
    print()

async def main():
    """运行所有测试"""
    print("开始测试所有修复功能...\n")
    
    await test_sentence_segmentation()
    await test_tokenization()
    await test_word_extraction()
    await test_masked_sentence_generation()
    
    print("所有测试完成！")

if __name__ == "__main__":
    asyncio.run(main())
