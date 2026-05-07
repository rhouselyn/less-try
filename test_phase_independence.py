#!/usr/bin/env python3
"""
测试第一阶段和第二阶段的单元状态是否独立
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_phase_independence():
    """测试两个阶段的单元状态是否独立"""
    
    print("=" * 60)
    print("测试第一阶段和第二阶段的单元状态是否独立")
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
    
    # Step 3: 学习所有单词（第一阶段）
    print("\n3. 学习所有单词（第一阶段）")
    for i in range(10):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        result = response.json()
        new_index = result.get('new_index', 'N/A')
        if new_index is None or new_index >= 10:
            break
    
    # Step 4: 检查两个阶段的单元状态
    print("\n4. 检查两个阶段的单元状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1 = response.json()
    print(f"阶段一: {json.dumps(phase1, indent=2, ensure_ascii=False)}")
    
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2 = response.json()
    print(f"阶段二: {json.dumps(phase2, indent=2, ensure_ascii=False)}")
    
    # Step 5: 完成阶段二练习
    print("\n5. 完成阶段二练习")
    
    # 5.1 点击阶段二单元0
    print("\n  5.1 点击阶段二单元0")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
    exercise = response.json()
    print(f"  练习类型: {exercise.get('exercise_type')}")
    
    # 5.2 下一题
    print("\n  5.2 下一题")
    response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
    next_result = response.json()
    print(f"  next结果: {json.dumps(next_result, ensure_ascii=False)}")
    
    if not next_result.get("unit_complete"):
        # 5.3 下一题
        print("\n  5.3 下一题")
        response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
        next_result = response.json()
        print(f"  next结果: {json.dumps(next_result, ensure_ascii=False)}")
    
    # Step 6: 再次检查两个阶段的单元状态
    print("\n6. 再次检查两个阶段的单元状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_after = response.json()
    print(f"阶段一: {json.dumps(phase1_after, indent=2, ensure_ascii=False)}")
    
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2_after = response.json()
    print(f"阶段二: {json.dumps(phase2_after, indent=2, ensure_ascii=False)}")
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    phase1_unit0_before = phase1["units"][0]["completed"] if phase1["units"] else False
    phase1_unit0_after = phase1_after["units"][0]["completed"] if phase1_after["units"] else False
    phase2_unit0_after = phase2_after["units"][0]["completed"] if phase2_after["units"] else False
    
    print(f"阶段一单元0 (完成单词后): {phase1_unit0_before}")
    print(f"阶段一单元0 (完成阶段二后): {phase1_unit0_after}")
    print(f"阶段二单元0 (完成后): {phase2_unit0_after}")
    
    if phase1_unit0_before and phase1_unit0_after:
        print("\n✓ 第一阶段单元状态在两个阶段都完成后保持为已完成!")
    elif phase1_unit0_before and not phase1_unit0_after:
        print("\n✗ 第一阶段单元状态在完成第二阶段后被重置!")
    else:
        print("\n? 第一阶段单元状态异常")

if __name__ == "__main__":
    test_phase_independence()
