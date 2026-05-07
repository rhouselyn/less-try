#!/usr/bin/env python3
"""
测试阶段一单元完成状态 - 不做阶段二也能标记完成
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_phase1_only_completion():
    """测试只完成阶段一，不做阶段二"""
    
    print("=" * 60)
    print("测试阶段一单元完成状态")
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
    
    # Step 3: 获取初始阶段一单元列表
    print("\n3. 获取初始阶段一单元列表")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_initial = response.json()
    print(json.dumps(phase1_initial, indent=2, ensure_ascii=False))
    
    # Step 4: 学习单词（模拟用户学习）
    print("\n4. 学习所有单词")
    vocab_response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab_length = len(vocab_response.json().get("vocab", []))
    print(f"词汇数量: {vocab_length}")
    
    for i in range(vocab_length):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        result = response.json()
        new_index = result.get("new_index")
        print(f"  学习单词 {i+1}: new_index={new_index}")
    
    # Step 5: 不做阶段二，直接检查阶段一单元状态
    print("\n5. 不做阶段二，直接检查阶段一单元状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_after = response.json()
    print(json.dumps(phase1_after, indent=2, ensure_ascii=False))
    
    # Step 6: 验证结果
    print("\n6. 验证结果")
    units = phase1_after.get("units", [])
    if units:
        unit = units[0]
        if unit.get("completed"):
            print("✓ 阶段一单元0已正确标记为完成!")
            print("✓ 修复成功：阶段一完成不依赖阶段二")
        else:
            print("✗ 阶段一单元0未标记为完成")
            print("✗ 修复失败")
    
    # Step 7: 检查checkCoverage返回的unit_completed
    print("\n7. 检查checkCoverage返回的unit_completed")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    coverage = response.json()
    print(f"unit_completed: {coverage.get('unit_completed')}")
    print(f"can_form_sentences: {coverage.get('can_form_sentences')}")
    
    if coverage.get("unit_completed"):
        print("✓ checkCoverage正确返回unit_completed=True")
    else:
        print("✗ checkCoverage未正确返回unit_completed=True")

if __name__ == "__main__":
    test_phase1_only_completion()
