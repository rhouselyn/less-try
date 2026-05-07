#!/usr/bin/env python3
"""
测试缩写处理功能
"""

from text_processor import TextProcessor

# 创建TextProcessor实例
text_processor = TextProcessor()

# 测试用例
test_cases = [
    # 测试常见缩写
    "What's up?",
    "I don't know.",
    "He's going to school.",
    "They're happy.",
    "It's raining.",
    # 测试多个缩写
    "What's he doing? He's eating.",
    # 测试没有缩写的句子
    "Hello world.",
    # 测试空字符串
    ""
]

print("=== 测试缩写处理功能 ===")
for i, test_sentence in enumerate(test_cases):
    print(f"\n测试用例 {i+1}: {repr(test_sentence)}")
    tokens = text_processor.tokenize_sentence(test_sentence)
    print(f"分词结果: {len(tokens)} 个token")
    print(f"token列表: {tokens}")

print("\n=== 测试完成 ===")
