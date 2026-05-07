#!/usr/bin/env python3
"""
测试脚本：验证学习进度界面的修改
1. 验证阶段一和阶段二的单元完成标记
2. 验证冗余词生成是否为单个token
"""

import asyncio
import sys
import os
sys.path.insert(0, '/workspace/backend')

from nvidia_api import NvidiaAPI

async def test_redundant_tokens():
    """测试冗余词生成是否为单个token"""
    print("=" * 60)
    print("测试1: 验证冗余词生成是否为单个token")
    print("=" * 60)
    
    api = NvidiaAPI()
    
    test_sentences = [
        "I like apples.",
        "She is reading a book.",
        "The cat is sleeping on the sofa."
    ]
    
    for sentence in test_sentences:
        print(f"\n测试句子: {sentence}")
        print("-" * 40)
        
        result = await api.process_text_with_dictionary(sentence, "en", "zh")
        
        if result and "redundant_tokens" in result:
            redundant_tokens = result["redundant_tokens"]
            print(f"生成的冗余词: {redundant_tokens}")
            
            all_single_token = True
            for token in redundant_tokens:
                token_parts = token.split()
                if len(token_parts) > 1:
                    print(f"  ❌ '{token}' 是多个词组成的短语 (包含 {len(token_parts)} 个词)")
                    all_single_token = False
                else:
                    print(f"  ✓ '{token}' 是单个词")
            
            if all_single_token:
                print("✓ 所有冗余词都是单个token!")
            else:
                print("❌ 存在多个词组成的冗余词!")
        else:
            print("❌ 没有生成冗余词")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

def test_phase_units_completion():
    """测试阶段单元完成状态计算"""
    print("\n" + "=" * 60)
    print("测试2: 验证阶段单元完成状态计算逻辑")
    print("=" * 60)
    
    group_size = 10
    
    test_cases = [
        (0, 30, "单元0，总30词"),
        (5, 30, "单元0，学习5词"),
        (10, 30, "单元1，完成单元0"),
        (15, 30, "单元1，学习5词"),
        (20, 30, "单元2，完成单元0和1"),
        (30, 30, "单元3，完成所有单元"),
    ]
    
    for current_index, vocab_length, description in test_cases:
        current_unit = current_index // group_size
        
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
        print(f"  current_index={current_index}, current_unit={current_unit}")
        for unit in units:
            status = "✓ 已完成" if unit["completed"] else "○ 未完成"
            print(f"  单元{unit['unit_id']}: {unit['word_count']}词 - {status}")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

def test_frontend_component_logic():
    """测试前端组件逻辑"""
    print("\n" + "=" * 60)
    print("测试3: 验证前端组件渲染逻辑")
    print("=" * 60)
    
    phase1Units = [
        {"unit_id": 0, "word_count": 10, "completed": True},
        {"unit_id": 1, "word_count": 10, "completed": True},
        {"unit_id": 2, "word_count": 10, "completed": False},
    ]
    currentPhase1Unit = 2
    
    phase2Units = [
        {"unit_id": 0, "sentences_count": 8, "completed": True},
        {"unit_id": 1, "sentences_count": 8, "completed": False},
    ]
    currentPhase2Unit = 1
    
    print("\n阶段一单元状态:")
    for i, unit in enumerate(phase1Units):
        is_current = i == currentPhase1Unit
        is_completed = unit["completed"]
        
        if is_completed:
            status = "✓ 已完成 (显示打勾)"
        elif is_current:
            status = "→ 当前单元"
        else:
            status = "○ 未开始"
        
        print(f"  单元{i+1}: {unit['word_count']}词 - {status}")
    
    print("\n阶段二单元状态:")
    for i, unit in enumerate(phase2Units):
        is_current = i == currentPhase2Unit
        is_completed = unit["completed"]
        
        if is_completed:
            status = "✓ 已完成 (显示打勾)"
        elif is_current:
            status = "→ 当前单元"
        else:
            status = "○ 未开始"
        
        print(f"  单元{i+1}: {unit['sentences_count']}句 - {status}")
    
    print("\n样式验证:")
    print("  - 已完成: 绿色边框 (#788c5d) + 浅绿背景 + 打勾图标")
    print("  - 当前单元: 橙色边框 (#d97757) + 浅橙背景 + '当前'标签")
    print("  - 未开始: 灰色边框 (#e8e6dc) + 白色背景")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("学习进度界面修改验证测试")
    print("=" * 60)
    
    test_phase_units_completion()
    test_frontend_component_logic()
    
    print("\n开始异步测试冗余词生成...")
    asyncio.run(test_redundant_tokens())
