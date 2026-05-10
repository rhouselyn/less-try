#!/usr/bin/env python3
"""
测试阶段一单元完成标记的完整流程
"""

import requests
import time
import json
import os

BASE_URL = "http://localhost:8000"

def test_phase1_unit_completion():
    """测试阶段一单元完成标记"""
    
    print("=" * 60)
    print("测试阶段一单元完成标记")
    print("=" * 60)
    
    # Step 1: 提交文本
    print("\n1. 提交文本 'hello world'")
    response = requests.post(
        f"{BASE_URL}/api/process-text",
        json={
            "text": "hello world",
            "source_language": "en",
            "target_language": "zh"
        }
    )
    file_id = response.json().get("file_id")
    print(f"文件ID: {file_id}")
    
    # Step 2: 等待处理完成
    print("\n2. 等待处理完成")
    for i in range(30):
        time.sleep(1)
        response = requests.get(f"{BASE_URL}/api/status/{file_id}")
        status = response.json()
        if status.get("status") == "completed":
            print("处理完成!")
            break
    
    # Step 3: 获取词汇表
    print("\n3. 获取词汇表")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab = response.json().get("vocab", [])
    print(f"词汇数量: {len(vocab)}")
    for v in vocab:
        print(f"  - {v.get('word')}")
    
    # Step 4: 学习所有单词（模拟用户完成第一阶段）
    print("\n4. 学习所有单词")
    for i in range(len(vocab) + 5):  # 学习多一点确保完成
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        result = response.json()
        new_index = result.get("new_index")
        print(f"  学习单词 {i+1}: new_index={new_index}")
        if new_index is None or new_index >= len(vocab):
            print(f"  已学习完所有单词，退出循环")
            break
    
    # Step 5: 检查阶段一单元列表
    print("\n5. 检查阶段一单元列表")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_data = response.json()
    print(json.dumps(phase1_data, indent=2, ensure_ascii=False))
    
    # Step 6: 检查后端的 learning_progress 文件（使用正确的路径）
    print("\n6. 检查后端的 learning_progress 文件")
    progress_file = f"/workspace/data/{file_id}/learning_progress.json"
    if os.path.exists(progress_file):
        with open(progress_file) as f:
            progress = json.load(f)
        print(f"learning_progress.json 内容: {progress}")
    else:
        print(f"文件不存在: {progress_file}")
    
    # Step 7: 检查 can_form_sentences
    print("\n7. 检查 can_form_sentences")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    coverage = response.json()
    print(json.dumps(coverage, indent=2, ensure_ascii=False))
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    units = phase1_data.get("units", [])
    if units:
        unit = units[0]
        unit_completed = unit.get("completed", False)
        print(f"\n词汇数量: {len(vocab)}")
        print(f"单元数量: {len(units)}")
        print(f"单元0的 word_count: {unit.get('word_count')}")
        print(f"单元0的 completed: {unit_completed}")
        print(f"can_form_sentences: {coverage.get('can_form_sentences')}")
        print(f"unit_completed: {coverage.get('unit_completed')}")
        
        if unit_completed:
            print("\n✓ 单元0已正确标记为完成!")
        else:
            print("\n✗ 单元0未标记为完成!")
    else:
        print("\n✗ 没有单元数据!")

if __name__ == "__main__":
    test_phase1_unit_completion()
