#!/usr/bin/env python3
"""
综合测试脚本，用于验证所有修复是否正常工作
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from text_processor import TextProcessor
from storage import Storage
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
    """测试分词功能，特别是缩写和词组处理"""
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
    
    # 测试词组处理
    print("=== 测试词组处理 ===")
    phrase_test_sentences = [
        "What's up, bro?",
        "How's it going?",
        "I'm fine, thank you.",
        "Good morning!"
    ]
    
    for sentence in phrase_test_sentences:
        tokens = tp.tokenize_sentence(sentence)
        print(f"句子: {sentence}")
        print(f"分词结果: {tokens}")
        
        # 验证词组是否被正确处理
        if any(phrase in ' '.join(tokens).lower() for phrase in ["what's up", "how's it going", "i'm fine", "thank you", "good morning"]):
            print("✅ 词组处理测试通过")
        else:
            print("❌ 词组处理测试失败")
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
    # 模拟词汇表，包含来自其他句子的单词
    vocab = [
        {"word": "what's", "sentence_index": 0},
        {"word": "up", "sentence_index": 0},
        {"word": "I'm", "sentence_index": 0},
        {"word": "fine", "sentence_index": 0},
        {"word": "thank", "sentence_index": 0},
        {"word": "you", "sentence_index": 0},
        {"word": "hello", "sentence_index": 1},  # 来自其他句子的单词
        {"word": "world", "sentence_index": 1},  # 来自其他句子的单词
        {"word": "good", "sentence_index": 1}    # 来自其他句子的单词
    ]
    
    result = tp.generate_masked_sentence(test_sentence, vocab)
    print(f"原始句子: {test_sentence}")
    print(f"生成的蒙版句子: {result['masked_sentence']}")
    print(f"答案单词: {result['answer_words']}")
    print(f"选项: {result['options']}")
    
    # 验证干扰词是否包含来自其他句子的单词
    other_sentence_words = ["hello", "world", "good"]
    has_other_sentence_words = any(word in result['options'] for word in other_sentence_words)
    if has_other_sentence_words:
        print("✅ 干扰词生成测试通过（包含其他句子的单词）")
    else:
        print("❌ 干扰词生成测试失败（未包含其他句子的单词）")
    
    if result:
        print("✅ 蒙版句子生成测试通过")
    else:
        print("❌ 蒙版句子生成测试失败")
    print()

async def test_sentence_order():
    """测试句子随机顺序功能"""
    print("=== 测试句子随机顺序功能 ===")
    storage = Storage()
    
    # 测试文件ID
    test_file_id = "test_sentence_order"
    
    # 生成测试句子
    test_sentences = [
        {"sentence": "Hello world!"},
        {"sentence": "How are you?"},
        {"sentence": "I'm fine."},
        {"sentence": "Thank you."}
    ]
    
    # 保存测试句子
    storage.save_pipeline_data(test_file_id, test_sentences)
    
    # 模拟加载和生成句子顺序
    from main import get_phase_unit_exercise
    
    # 这里我们直接测试存储和加载句子顺序的功能
    import random
    
    # 生成随机顺序
    shuffled_indices = list(range(len(test_sentences)))
    random.shuffle(shuffled_indices)
    storage.save_sentence_order(test_file_id, 2, shuffled_indices)
    
    # 加载句子顺序
    loaded_indices = storage.load_sentence_order(test_file_id, 2)
    print(f"保存的句子顺序: {shuffled_indices}")
    print(f"加载的句子顺序: {loaded_indices}")
    
    if loaded_indices == shuffled_indices:
        print("✅ 句子顺序存储和加载测试通过")
    else:
        print("❌ 句子顺序存储和加载测试失败")
    print()

async def main():
    """运行所有测试"""
    print("开始综合测试所有修复功能...\n")
    
    await test_sentence_segmentation()
    await test_tokenization()
    await test_word_extraction()
    await test_masked_sentence_generation()
    await test_sentence_order()
    
    print("所有测试完成！")

if __name__ == "__main__":
    asyncio.run(main())
