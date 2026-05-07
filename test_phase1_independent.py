#!/usr/bin/env python3
"""
测试阶段一完成标记是否独立于阶段二
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_phase1_independent():
    """测试阶段一完成标记是否独立"""
    
    print("=" * 60)
    print("测试阶段一完成标记是否独立于阶段二")
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
    
    # Step 3: 获取初始状态
    print("\n3. 获取初始状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_initial = response.json()
    print("阶段一初始状态:")
    print(json.dumps(phase1_initial, indent=2, ensure_ascii=False))
    
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2_initial = response.json()
    print("\n阶段二初始状态:")
    print(json.dumps(phase2_initial, indent=2, ensure_ascii=False))
    
    # Step 4: 学习阶段一的所有单词
    print("\n4. 学习阶段一的所有单词")
    vocab_response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab_length = len(vocab_response.json().get("vocab", []))
    print(f"词汇数量: {vocab_length}")
    
    for i in range(vocab_length):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        result = response.json()
        print(f"  学习单词 {i+1}: new_index={result.get('new_index')}")
    
    # Step 5: 检查阶段一是否完成（不做阶段二）
    print("\n5. 检查阶段一是否完成（不做阶段二）")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_after = response.json()
    print("阶段一状态:")
    print(json.dumps(phase1_after, indent=2, ensure_ascii=False))
    
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2_after = response.json()
    print("\n阶段二状态:")
    print(json.dumps(phase2_after, indent=2, ensure_ascii=False))
    
    # 验证结果
    print("\n6. 验证结果")
    phase1_completed = phase1_after["units"][0].get("completed")
    phase2_completed = phase2_after["units"][0].get("completed")
    
    print(f"阶段一单元0: {'✓ 已完成' if phase1_completed else '○ 未完成'}")
    print(f"阶段二单元0: {'✓ 已完成' if phase2_completed else '○ 未完成'}")
    
    if phase1_completed and not phase2_completed:
        print("\n✓ 测试通过! 阶段一独立完成，阶段二保持未完成")
    else:
        print("\n✗ 测试失败! 阶段一没有独立完成")
        if not phase1_completed:
            print("  原因: 阶段一没有被标记为完成")
        if phase2_completed:
            print("  原因: 阶段二不应该被标记为完成")

if __name__ == "__main__":
    test_phase1_independent()
