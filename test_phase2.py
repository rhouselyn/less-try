#!/usr/bin/env python3
"""
测试阶段二 - 验证是否有重复题
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_phase2():
    """测试阶段二"""
    
    print("=" * 60)
    print("测试阶段二 - 验证是否有重复题")
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
    
    # Step 3: 获取阶段二单元列表
    print("\n3. 获取阶段二单元列表")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    data = response.json()
    print(json.dumps(data, indent=2, ensure_ascii=False))
    
    # Step 4: 获取第一个练习
    print("\n4. 获取第一个练习")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
    exercise1 = response.json()
    print(f"练习类型: {exercise1.get('exercise_type')}")
    print(f"exercise_index: {exercise1.get('exercise_index')}")
    print(f"exercise_type_index: {exercise1.get('exercise_type_index')}")
    
    exercise_types_seen = []
    exercise_index_seen = []
    
    # Step 5: 循环获取下一题直到完成
    print("\n5. 循环获取下一题（模拟用户操作）")
    
    iteration = 0
    max_iterations = 10
    
    while iteration < max_iterations:
        iteration += 1
        print(f"\n--- 迭代 {iteration} ---")
        
        # 获取当前练习
        response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        current = response.json()
        
        exercise_type = current.get("exercise_type")
        exercise_index = current.get("exercise_index")
        exercise_type_index = current.get("exercise_type_index")
        
        print(f"获取练习:")
        print(f"  exercise_type: {exercise_type}")
        print(f"  exercise_index: {exercise_type_index}")
        print(f"  exercise_type_index: {exercise_type_index}")
        
        # 记录
        key = f"{exercise_index}_{exercise_type_index}"
        if key in exercise_index_seen:
            print(f"  ⚠️ 警告: 重复的练习! ({key})")
        exercise_index_seen.append(key)
        
        if exercise_type:
            if exercise_type not in exercise_types_seen:
                exercise_types_seen.append(exercise_type)
                print(f"  新练习类型: {exercise_type}")
        
        # 检查是否单元完成
        if current.get("unit_complete"):
            print("\n✓ 单元已完成!")
            break
        
        # 调用 next API
        print("调用 next API...")
        response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
        next_result = response.json()
        print(f"next结果: {json.dumps(next_result, ensure_ascii=False)}")
        
        if next_result.get("unit_complete"):
            print("下一题返回 unit_complete=True")
            # 再获取一次确认
            response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
            final = response.json()
            if final.get("unit_complete"):
                print("确认: 单元已完成!")
                break
    
    # Step 6: 最终检查
    print("\n6. 最终检查阶段二单元列表")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    final_data = response.json()
    print(json.dumps(final_data, indent=2, ensure_ascii=False))
    
    # 总结
    print("\n" + "=" * 60)
    print("总结")
    print("=" * 60)
    print(f"出现的练习组合:")
    for key in exercise_index_seen:
        print(f"  - {key}")
    
    if len(set(exercise_index_seen)) == len(exercise_index_seen):
        print("\n✓ 没有重复的练习组合!")
    else:
        print("\n✗ 存在重复的练习组合!")

if __name__ == "__main__":
    test_phase2()
