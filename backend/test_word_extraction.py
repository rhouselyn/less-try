#!/usr/bin/env python3
"""
测试单词提取功能
"""

from text_processor import TextProcessor

# 创建TextProcessor实例
text_processor = TextProcessor()

# 测试用例
test_cases = [
    # 测试英文单词提取
    ("Hello! How are you? I'm fine.", "en"),
    # 测试中文单词提取（中文按字符提取）
    ("你好！你怎么样？我很好。", "zh"),
    # 测试混合标点和缩写
    ("Hi there! What's up? I'm doing great.", "en"),
    # 测试只有一个单词
    ("Hello", "en"),
    # 测试空字符串
    ("", "en"),
    # 测试只有标点
    ("!!!???...", "en"),
    # 测试包含短单词
    ("a is an in on at", "en")
]

print("=== 测试单词提取功能 ===")
for i, (test_text, language) in enumerate(test_cases):
    print(f"\n测试用例 {i+1}: {repr(test_text)} (语言: {language})")
    words = text_processor.extract_words(test_text, language)
    print(f"提取结果: {len(words)} 个单词")
    print(f"单词列表: {words}")

# 测试从句子列表中提取单词
sentences = ["Hello!", "How are you?", "I'm fine."]
print(f"\n\n测试从句子列表中提取单词:")
print(f"句子列表: {sentences}")
all_words = text_processor.extract_words_from_sentences(sentences, "en")
print(f"提取结果: {len(all_words)} 个单词")
print(f"单词列表: {all_words}")

print("\n=== 测试完成 ===")
