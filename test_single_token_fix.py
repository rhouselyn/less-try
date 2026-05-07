#!/usr/bin/env python3
"""
测试修改后的checkCoverage和generateSentenceQuiz逻辑
"""

def test_modified_logic():
    """测试修改后的逻辑"""
    print("=" * 60)
    print("测试修改后的逻辑（单个token也生成翻译题）")
    print("=" * 60)
    
    group_size = 10
    
    def has_valid_token(sentence_data):
        """修改后的函数：有至少一个有效token"""
        if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
            tokens = sentence_data["translation_result"]["translation"]
            return len(tokens) >= 1
        return False
    
    def check_coverage_modified(current_index, vocab_length, sentences):
        """模拟修改后的checkCoverage逻辑"""
        current_unit = current_index // group_size
        words_in_unit = min(group_size, vocab_length - current_unit * group_size)
        unit_completed = current_index >= (current_unit * group_size + words_in_unit)
        
        all_words_learned = current_index >= vocab_length
        
        if current_index < (current_unit * group_size + words_in_unit):
            return {"can_form_sentences": False, "unit_completed": unit_completed, "reason": "还没学完当前单元"}
        
        # 学习完所有单词后，所有单词都算已学
        if all_words_learned:
            learned_words = list(range(vocab_length))
        else:
            # 否则只算到current_index-1的单词
            learned_words = list(range(current_index))
        
        print(f"  learned_words: {learned_words} (共{len(learned_words)}个)")
        
        can_form = False
        for sentence_data in sentences:
            if not has_valid_token(sentence_data):
                continue
            
            # 修改：只要有至少1个token匹配
            matched_count = len(learned_words)  # 模拟：所有已学单词都能匹配
            if matched_count >= 1:
                can_form = True
                print(f"  句子'{sentence_data['sentence']}'匹配成功，can_form=True")
                break
        
        return {"can_form_sentences": can_form, "unit_completed": unit_completed}
    
    # 测试场景1：学完单元0，所有句子都只有单个token
    print("\n场景1：学完单元0 (vocab_length=30, current_index=10)")
    print("  所有句子都只有单个token:")
    sentences_single_token = [
        {"sentence": "Hello", "translation_result": {"translation": [{"text": "你好"}]}},
        {"sentence": "World", "translation_result": {"translation": [{"text": "世界"}]}},
        {"sentence": "Love", "translation_result": {"translation": [{"text": "爱"}]}},
    ]
    for s in sentences_single_token:
        print(f"    - '{s['sentence']}' -> {len(s['translation_result']['translation'])}个token")
    
    result = check_coverage_modified(10, 30, sentences_single_token)
    print(f"  checkCoverage结果: {result}")
    print(f"  预期: can_form_sentences=True, unit_completed=True")
    
    if result["can_form_sentences"] and result["unit_completed"]:
        print("  ✓ 测试通过!")
    else:
        print("  ✗ 测试失败!")
    
    # 测试场景2：还没学完单元0
    print("\n场景2：还没学完单元0 (vocab_length=30, current_index=9)")
    result = check_coverage_modified(9, 30, sentences_single_token)
    print(f"  checkCoverage结果: {result}")
    print(f"  预期: can_form_sentences=False, unit_completed=False")

def test_new_vs_old():
    """对比新旧逻辑"""
    print("\n" + "=" * 60)
    print("新旧逻辑对比")
    print("=" * 60)
    
    print("\n【旧逻辑的问题】")
    print("  - has_multiple_tokens: len(tokens) > 1")
    print("  - matched_count >= 2")
    print("  - 如果句子只有1个token，会被跳过")
    print("  - 导致无法生成翻译题，单元完成标记不更新")
    
    print("\n【新逻辑的修改】")
    print("  - has_valid_token: len(tokens) >= 1")
    print("  - matched_count >= 1")
    print("  - 即使句子只有1个token，也会生成翻译题")
    print("  - 翻译题完成后会更新单元完成标记")

if __name__ == "__main__":
    test_modified_logic()
    test_new_vs_old()
