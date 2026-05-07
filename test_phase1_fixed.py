#!/usr/bin/env python3
"""
测试阶段一单元完成状态 - 使用新的file_id
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"
FILE_ID = "text_20260507_120958_498"  # 使用上一步成功处理的文件

def test_phase1_only_completion():
    """测试只完成阶段一，不做阶段二"""
    
    print("=" * 60)
    print("测试阶段一单元完成状态")
    print("=" * 60)
    
    print(f"\n使用文件ID: {FILE_ID}")
    
    # Step 1: 获取初始阶段一单元列表
    print("\n1. 获取初始阶段一单元列表")
    response = requests.get(f"{BASE_URL}/api/{FILE_ID}/phase/1/units")
    phase1_initial = response.json()
    print(json.dumps(phase1_initial, indent=2, ensure_ascii=False))
    
    # Step 2: 获取词汇数量
    print("\n2. 获取词汇数量")
    response = requests.get(f"{BASE_URL}/api/vocab/{FILE_ID}")
    vocab = response.json().get("vocab", [])
    vocab_length = len(vocab)
    print(f"词汇数量: {vocab_length}")
    for v in vocab:
        print(f"  - {v.get('word')}")
    
    # Step 3: 学习所有单词
    print("\n3. 学习所有单词")
    for i in range(vocab_length):
        response = requests.post(f"{BASE_URL}/api/learn/{FILE_ID}/next-word")
        result = response.json()
        new_index = result.get("new_index")
        print(f"  学习单词 {i+1}: new_index={new_index}")
    
    # Step 4: 不做阶段二，直接检查阶段一单元状态
    print("\n4. 不做阶段二，直接检查阶段一单元状态")
    response = requests.get(f"{BASE_URL}/api/{FILE_ID}/phase/1/units")
    phase1_after = response.json()
    print(json.dumps(phase1_after, indent=2, ensure_ascii=False))
    
    # Step 5: 验证结果
    print("\n5. 验证结果")
    units = phase1_after.get("units", [])
    if units:
        unit = units[0]
        if unit.get("completed"):
            print("✓ 阶段一单元0已正确标记为完成!")
            print("✓ 修复成功：阶段一完成不依赖阶段二")
        else:
            print("✗ 阶段一单元0未标记为完成")
            print("✗ 修复失败")
    else:
        print("✗ 没有单元数据")
    
    # Step 6: 检查checkCoverage返回的unit_completed
    print("\n6. 检查checkCoverage返回的unit_completed")
    response = requests.get(f"{BASE_URL}/api/learn/{FILE_ID}/check-coverage")
    coverage = response.json()
    print(f"unit_completed: {coverage.get('unit_completed')}")
    print(f"can_form_sentences: {coverage.get('can_form_sentences')}")
    
    if coverage.get("unit_completed"):
        print("✓ checkCoverage正确返回unit_completed=True")
    else:
        print("✗ checkCoverage未正确返回unit_completed=True")

if __name__ == "__main__":
    test_phase1_only_completion()
