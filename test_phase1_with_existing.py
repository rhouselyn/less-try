#!/usr/bin/env python3
"""
测试阶段一单元完成标记 - 使用已有的文件
"""

import requests
import time
import json
import os

BASE_URL = "http://localhost:8000"

def test_phase1_unit_completion_with_existing_file():
    """使用已有的文件测试阶段一单元完成标记"""
    
    print("=" * 60)
    print("测试阶段一单元完成标记（使用已有文件）")
    print("=" * 60)
    
    # 使用已有的文件
    file_id = "text_20260510_084941_584"
    print(f"\n使用文件: {file_id}")
    
    # Step 1: 获取词汇表
    print("\n1. 获取词汇表")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab = response.json().get("vocab", [])
    print(f"词汇数量: {len(vocab)}")
    for v in vocab:
        print(f"  - {v.get('word')}")
    
    if len(vocab) == 0:
        print("\n词汇表为空，无法测试!")
        return
    
    # Step 2: 检查初始学习进度
    print("\n2. 检查初始学习进度")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_data = response.json()
    print(json.dumps(phase1_data, indent=2, ensure_ascii=False))
    
    # Step 3: 学习所有单词
    print("\n3. 学习所有单词")
    for i in range(len(vocab) + 5):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        result = response.json()
        new_index = result.get("new_index")
        print(f"  学习单词 {i+1}: new_index={new_index}")
        if new_index is None or new_index >= len(vocab):
            print(f"  已学习完所有单词")
            break
    
    # Step 4: 检查阶段一单元列表
    print("\n4. 检查阶段一单元列表")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_data_after = response.json()
    print(json.dumps(phase1_data_after, indent=2, ensure_ascii=False))
    
    # Step 5: 检查 learning_progress.json
    print("\n5. 检查 learning_progress.json")
    progress_file = f"/workspace/data/files/{file_id}/learning_progress.json"
    if os.path.exists(progress_file):
        with open(progress_file) as f:
            progress = json.load(f)
        print(f"内容: {progress}")
    else:
        print(f"文件不存在!")
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    units = phase1_data_after.get("units", [])
    if units:
        unit = units[0]
        unit_completed = unit.get("completed", False)
        print(f"\n词汇数量: {len(vocab)}")
        print(f"单元0的 word_count: {unit.get('word_count')}")
        print(f"单元0的 completed: {unit_completed}")
        
        if unit_completed:
            print("\n✓ 单元0已正确标记为完成!")
        else:
            print("\n✗ 单元0未标记为完成!")
            print("\n分析问题:")
            current_index = progress.get("current_index", 0) if os.path.exists(progress_file) else 0
            print(f"  current_index = {current_index}")
            print(f"  vocab_length = {len(vocab)}")
            print(f"  group_size = 10")
            print(f"  current_unit = {current_index // 10}")
            print(f"  unit_end_index = {min(10, len(vocab))} = 10")
            print(f"  completed = current_index >= 10 = {current_index >= 10}")
    else:
        print("\n✗ 没有单元数据!")

if __name__ == "__main__":
    test_phase1_unit_completion_with_existing_file()
