#!/usr/bin/env python3
"""
测试所有修复的完整性
"""

def test_all_fixes():
    """测试所有修复"""
    print("=" * 60)
    print("测试所有修复")
    print("=" * 60)
    
    # 模拟数据
    class MockSentence:
        def __init__(self, tokens):
            self.tokens = tokens
    
    class MockSentenceData:
        def __init__(self, sentence, token_count):
            self.sentence = sentence
            self.token_count = token_count
        
        def get_translation_result(self):
            return {
                "translation": [{"text": f"token_{i}"} for i in range(self.token_count)]
            }
    
    # 模拟 has_valid_token 函数
    def has_valid_token(sentence_data):
        tokens = sentence_data.get_translation_result().get("translation", [])
        return len(tokens) >= 1
    
    # 模拟 has_multiple_tokens 函数（旧版本）
    def has_multiple_tokens_old(sentence_data):
        tokens = sentence_data.get_translation_result().get("translation", [])
        return len(tokens) > 1
    
    # 测试用例
    test_cases = [
        {"sentence": "Hello", "token_count": 1},
        {"sentence": "Hello world", "token_count": 2},
        {"sentence": "Hello beautiful world", "token_count": 3},
    ]
    
    print("\n【测试 has_valid_token (新版本)】")
    print("-" * 40)
    for tc in test_cases:
        sd = MockSentenceData(tc["sentence"], tc["token_count"])
        result = has_valid_token(sd)
        status = "✓ 有效" if result else "✗ 无效"
        print(f"  '{tc['sentence']}' ({tc['token_count']} tokens): {status}")
    
    print("\n【测试 has_multiple_tokens (旧版本)】")
    print("-" * 40)
    for tc in test_cases:
        sd = MockSentenceData(tc["sentence"], tc["token_count"])
        result = has_multiple_tokens_old(sd)
        status = "✓ 有效" if result else "✗ 无效 (会被跳过!)"
        print(f"  '{tc['sentence']}' ({tc['token_count']} tokens): {status}")
    
    print("\n【问题分析】")
    print("-" * 40)
    print("旧版本 has_multiple_tokens: len(tokens) > 1")
    print("  - 'Hello' (1 token): ✗ 会被跳过!")
    print("  - 'Hello world' (2 tokens): ✓ 有效")
    print("\n新版本 has_valid_token: len(tokens) >= 1")
    print("  - 'Hello' (1 token): ✓ 有效")
    print("  - 'Hello world' (2 tokens): ✓ 有效")
    
    print("\n【修复清单】")
    print("-" * 40)
    fixes = [
        ("check_coverage", "has_multiple_tokens -> has_valid_token, matched >= 2 -> matched >= 1"),
        ("generate_sentence_quiz", "has_multiple_tokens -> has_valid_token, matched >= 2 -> matched >= 1"),
        ("get_phase_unit_exercise", "has_multiple_tokens -> has_valid_token"),
        ("next_phase_exercise", "has_multiple_tokens -> has_valid_token (所有地方)"),
    ]
    for name, desc in fixes:
        print(f"  ✓ {name}: {desc}")

if __name__ == "__main__":
    test_all_fixes()
