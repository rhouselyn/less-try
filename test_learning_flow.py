#!/usr/bin/env python3
"""
测试完整学习流程 - 使用已有的 "hi man. what's up" 文件
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_learning_flow():
    """测试完整学习流程"""
    
    # 使用之前的文件
    file_id = "text_20260510_093047_005"
    
    print("=" * 60)
    print(f"测试完整学习流程 (文件: {file_id})")
    print("=" * 60)
    
    # Step 1: 获取词汇表
    print("\n1. 获取词汇表")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab = response.json().get("vocab", [])
    print(f"词汇数量: {len(vocab)}")
    for v in vocab:
        print(f"  - {v.get('word')}")
    
    # Step 2: 检查初始阶段一状态
    print("\n2. 检查初始阶段一状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_initial = response.json()
    print(json.dumps(phase1_initial, indent=2, ensure_ascii=False))
    
    # Step 3: 学习所有单词
    print("\n3. 学习所有单词")
    for i in range(len(vocab) + 5):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word", timeout=30)
        result = response.json()
        new_index = result.get("new_index")
        print(f"  学习单词 {i+1}: new_index={new_index}")
        if new_index is None or new_index >= len(vocab):
            print(f"  已学习完所有单词")
            break
        time.sleep(0.5)
    
    # Step 4: 检查 can_form_sentences
    print("\n4. 检查 can_form_sentences")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage", timeout=120)
    coverage = response.json()
    print(json.dumps(coverage, indent=2, ensure_ascii=False))
    
    # Step 5: 重新获取阶段一状态（模拟前端 getNextWord 逻辑）
    print("\n5. 重新获取阶段一状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_after = response.json()
    print("阶段一单元列表:")
    for unit in phase1_after.get("units", []):
        status = "✓ 已完成" if unit.get("completed") else "○ 未完成"
        print(f"  单元{unit['unit_id']}: word_count={unit.get('word_count')}, {status}")
    
    # Step 6: 检查阶段二状态
    print("\n6. 检查阶段二状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2_data = response.json()
    print(json.dumps(phase2_data, indent=2, ensure_ascii=False))
    
    # Step 7: 如果 can_form_sentences=True，测试句子翻译题
    if coverage.get("can_form_sentences"):
        print("\n7. 测试句子翻译题")
        try:
            response = requests.get(f"{BASE_URL}/api/learn/{file_id}/sentence-quiz", timeout=120)
            quiz = response.json()
            print(f"exercise_type: {quiz.get('exercise_type')}")
            print(f"unit_completed: {quiz.get('unit_completed')}")
            print(f"unit: {quiz.get('unit')}")
        except Exception as e:
            print(f"错误: {e}")
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    phase1_units = phase1_after.get("units", [])
    if phase1_units:
        unit = phase1_units[0]
        if unit.get("completed"):
            print("✓ 阶段一单元0已标记为完成!")
        else:
            print("✗ 阶段一单元0未标记为完成!")
            print(f"  current_index 应该 >= {min(10, len(vocab))}")
            # 检查实际的 learning_progress
            import os
            progress_file = f"/workspace/data/files/{file_id}/learning_progress.json"
            if os.path.exists(progress_file):
                with open(progress_file) as f:
                    progress = json.load(f)
                print(f"  实际 current_index: {progress.get('current_index')}")

if __name__ == "__main__":
    test_learning_flow()
