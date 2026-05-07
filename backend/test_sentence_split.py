#!/usr/bin/env python3
"""
测试句子分割功能
"""

from text_processor import TextProcessor

# 创建TextProcessor实例
text_processor = TextProcessor()

# 测试用例
test_cases = [
    # 测试英文句子分割
    "Hello! How are you? I'm fine.",
    # 测试中文句子分割
    "你好！你怎么样？我很好。",
    # 测试混合标点
    "Hi there! What's up? I'm doing great.",
    # 测试只有一个句子
    "This is a single sentence.",
    # 测试空字符串
    "",
    # 测试只有空格
    "   ",
    # 测试多个连续标点
    "Wait!!! What???."
]

print("=== 测试句子分割功能 ===")
for i, test_text in enumerate(test_cases):
    print(f"\n测试用例 {i+1}: {repr(test_text)}")
    sentences = text_processor.split_sentences(test_text)
    print(f"分割结果: {len(sentences)} 个句子")
    for j, sentence in enumerate(sentences):
        print(f"  句子 {j+1}: {repr(sentence)}")

print("\n=== 测试完成 ===")
