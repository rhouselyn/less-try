#!/usr/bin/env python3
"""
完整测试：模拟前端操作流程
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

def test_full_user_flow():
    """测试完整的用户流程"""
    
    print("=" * 60)
    print("完整测试：模拟前端操作流程")
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
    
    # Step 3: 获取阶段一单元列表（模拟用户点击开始学习）
    print("\n3. 模拟用户点击开始学习")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_units = response.json()
    print(json.dumps(phase1_units, indent=2, ensure_ascii=False))
    
    # Step 4: 模拟用户点击单元0
    print("\n4. 模拟用户点击单元0进入学习")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/unit/0")
    learning_data = response.json()
    print(f"获取到单词: {learning_data.get('word')}")
    
    # Step 5: 学习所有单词
    print("\n5. 学习所有单词")
    for i in range(10):  # 最多学习10个单词
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        result = response.json()
        print(f"  学习单词 {i+1}: {result.get('new_index', 'N/A')}")
        
        # 检查是否完成
        if result.get('new_index') is None or result.get('new_index') >= 10:
            break
        
        # 检查覆盖度
        time.sleep(0.5)
    
    # Step 6: 检查阶段一单元状态
    print("\n6. 检查阶段一单元状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_final = response.json()
    print(json.dumps(phase1_final, indent=2, ensure_ascii=False))
    
    # Step 7: 获取阶段二单元列表
    print("\n7. 获取阶段二单元列表")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2_units = response.json()
    print(json.dumps(phase2_units, indent=2, ensure_ascii=False))
    
    # Step 8: 模拟阶段二练习
    print("\n8. 模拟阶段二练习流程")
    
    # 8.1 点击阶段二单元0
    print("\n  8.1 点击阶段二单元0")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
    exercise = response.json()
    print(f"    exercise_type: {exercise.get('exercise_type')}")
    print(f"    exercise_index: {exercise.get('exercise_index')}")
    print(f"    exercise_type_index: {exercise.get('exercise_type_index')}")
    
    # 8.2 模拟用户答题（跳过检查，直接下一题）
    print("\n  8.2 模拟用户点击下一题")
    response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
    next_result = response.json()
    print(f"    next结果: {json.dumps(next_result, ensure_ascii=False)}")
    
    if not next_result.get("unit_complete"):
        # 8.3 获取下一个练习
        print("\n  8.3 获取下一个练习")
        response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        exercise = response.json()
        print(f"    exercise_type: {exercise.get('exercise_type')}")
        print(f"    exercise_index: {exercise.get('exercise_index')}")
        print(f"    exercise_type_index: {exercise.get('exercise_type_index')}")
        
        # 8.4 用户点击下一题
        print("\n  8.4 模拟用户点击下一题")
        response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
        next_result = response.json()
        print(f"    next结果: {json.dumps(next_result, ensure_ascii=False)}")
    
    # Step 9: 检查阶段二单元状态
    print("\n9. 检查阶段二单元状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2_final = response.json()
    print(json.dumps(phase2_final, indent=2, ensure_ascii=False))
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    print("\n阶段一:")
    for unit in phase1_final.get("units", []):
        status = "✓ 已完成" if unit.get("completed") else "○ 未完成"
        print(f"  单元{unit.get('unit_id')}: {status}")
    
    print("\n阶段二:")
    for unit in phase2_final.get("units", []):
        status = "✓ 已完成" if unit.get("completed") else "○ 未完成"
        print(f"  单元{unit.get('unit_id')}: {status}")
    
    # 检查结果
    all_complete = True
    for unit in phase1_final.get("units", []) + phase2_final.get("units", []):
        if not unit.get("completed"):
            all_complete = False
            break
    
    if all_complete:
        print("\n✓ 所有单元都标记为已完成!")
    else:
        print("\n✗ 有些单元未标记为已完成")

if __name__ == "__main__":
    test_full_user_flow()
