#!/usr/bin/env python3
"""
测试阶段一单元完成逻辑
"""

def test_unit_completion_logic():
    """测试单元完成判断逻辑"""
    print("=" * 60)
    print("测试单元完成判断逻辑")
    print("=" * 60)
    
    group_size = 10
    
    test_cases = [
        (0, 30, "学完0个单词"),
        (9, 30, "学完9个单词（单元0未完成）"),
        (10, 30, "学完10个单词（应该完成单元0）"),
        (19, 30, "学完19个单词"),
        (20, 30, "学完20个单词（应该完成单元0和1）"),
    ]
    
    for current_index, vocab_length, description in test_cases:
        current_unit = current_index // group_size
        words_in_current_unit = min(group_size, vocab_length - current_unit * group_size)
        end_of_current_unit = current_unit * group_size + words_in_current_unit
        
        # 计算单元完成状态
        units = []
        for i in range(0, vocab_length, group_size):
            unit_words_count = min(group_size, vocab_length - i)
            unit_index = i // group_size
            completed = unit_index < current_unit
            units.append({
                "unit_id": unit_index,
                "word_count": unit_words_count,
                "completed": completed
            })
        
        print(f"\n{description}:")
        print(f"  current_index={current_index}, vocab_length={vocab_length}")
        print(f"  current_unit={current_unit}")
        print(f"  words_in_current_unit={words_in_current_unit}")
        print(f"  end_of_current_unit={end_of_current_unit}")
        print(f"  单元状态:")
        for unit in units:
            status = "✓ 已完成" if unit["completed"] else "○ 未完成"
            print(f"    单元{unit['unit_id']}: {unit['word_count']}词 - {status}")

def test_coverage_check():
    """测试checkCoverage函数逻辑"""
    print("\n" + "=" * 60)
    print("测试checkCoverage函数逻辑")
    print("=" * 60)
    
    group_size = 10
    
    def has_multiple_tokens(sentence_data):
        if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
            tokens = sentence_data["translation_result"]["translation"]
            return len(tokens) > 1
        return False
    
    def check_coverage_logic(current_index, vocab_length, sentences):
        # 检查是否完成了当前单元
        current_unit = current_index // group_size
        words_in_unit = min(group_size, vocab_length - current_unit * group_size)
        unit_completed = current_index >= (current_unit * group_size + words_in_unit)
        
        # 检查是否已经学习完所有单词
        all_words_learned = current_index >= vocab_length
        
        if current_index < (current_unit * group_size + words_in_unit):
            return {"can_form_sentences": False, "unit_completed": unit_completed, "reason": "还没学完当前单元"}
        
        # 学习完所有单词后，所有单词都算已学
        if all_words_learned:
            learned_words = list(range(vocab_length))
        else:
            # 否则只算到current_index-1的单词
            learned_words = list(range(current_index))
        
        # 检查是否有句子可以用已学单词组成
        can_form = False
        for sentence_data in sentences:
            if not has_multiple_tokens(sentence_data):
                continue
            
            # 简化：检查是否有至少2个token匹配
            matched_count = min(2, len(learned_words))
            if matched_count >= 2:
                can_form = True
                break
        
        return {"can_form_sentences": can_form, "unit_completed": unit_completed}
    
    # 测试场景1：所有句子都只有单个token
    sentences_single_token = [
        {"sentence": "Hello", "translation_result": {"translation": [{"text": "你好"}]}},
        {"sentence": "World", "translation_result": {"translation": [{"text": "世界"}]}},
    ]
    
    print("\n场景1：所有句子都只有单个token (vocab_length=10, current_index=10)")
    result = check_coverage_logic(10, 10, sentences_single_token)
    print(f"  结果: {result}")
    print(f"  预期: can_form_sentences=False, unit_completed=True")
    
    # 测试场景2：有多个token的句子
    sentences_multi_token = [
        {"sentence": "I love you", "translation_result": {"translation": [{"text": "我"}, {"text": "爱"}, {"text": "你"}]}},
    ]
    
    print("\n场景2：有多个token的句子 (vocab_length=30, current_index=10)")
    result = check_coverage_logic(10, 30, sentences_multi_token)
    print(f"  结果: {result}")
    print(f"  预期: can_form_sentences=True (如果匹配), unit_completed=False (还没学完单元1)")
    
    # 测试场景3：学完单元0
    print("\n场景3：学完单元0 (vocab_length=30, current_index=20)")
    result = check_coverage_logic(20, 30, sentences_multi_token)
    print(f"  结果: {result}")
    print(f"  预期: unit_completed=True (完成单元0)")

def test_frontend_logic():
    """测试前端逻辑"""
    print("\n" + "=" * 60)
    print("测试前端getNextWord逻辑")
    print("=" * 60)
    
    def simulate_get_next_word(current_index, vocab_length, coverage_result):
        """
        模拟前端的getNextWord逻辑
        """
        all_words_learned = current_index >= vocab_length
        
        print(f"\n  current_index={current_index}, vocab_length={vocab_length}")
        print(f"  all_words_learned={all_words_learned}")
        print(f"  coverage_result={coverage_result}")
        
        if all_words_learned:
            if coverage_result["can_form_sentences"]:
                print("  -> 进入句子翻译题流程")
            else:
                print("  -> 单元完成，更新进度并返回all-units")
        else:
            if coverage_result["can_form_sentences"]:
                print("  -> 进入句子翻译题流程")
            elif coverage_result["unit_completed"]:
                print("  -> 单元完成，更新进度并返回all-units")
            else:
                print("  -> 继续单词学习")
    
    print("\n情况1: 学完10个单词 (vocab_length=10)")
    simulate_get_next_word(10, 10, {"can_form_sentences": False, "unit_completed": True})
    
    print("\n情况2: 学完10个单词，但can_form_sentences=False (vocab_length=30)")
    simulate_get_next_word(10, 30, {"can_form_sentences": False, "unit_completed": False})
    print("  -> 预期: 应该继续学习，但单元0应该标记为完成!")
    
    print("\n情况3: 学完20个单词 (vocab_length=30)")
    simulate_get_next_word(20, 30, {"can_form_sentences": False, "unit_completed": True})
    print("  -> 预期: 单元完成，更新进度并返回all-units")

if __name__ == "__main__":
    test_unit_completion_logic()
    test_coverage_check()
    test_frontend_logic()
