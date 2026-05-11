#!/usr/bin/env python3
"""
测试阶段二 - 正确处理 unit_complete 响应
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_phase2():
    """测试阶段二"""
    
    print("=" * 60)
    print("测试阶段二 - 正确处理 unit_complete 响应")
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
    
    # Step 5: 模拟用户操作流程
    print("\n5. 模拟用户操作流程")
    
    # 5.1 获取练习
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
    current = response.json()
    print(f"\n步骤1 - 获取练习:")
    print(f"  exercise_type: {current.get('exercise_type')}")
    print(f"  exercise_index: {current.get('exercise_index')}")
    print(f"  exercise_type_index: {current.get('exercise_type_index')}")
    
    # 5.2 用户点击下一题
    print(f"\n步骤2 - 用户点击下一题")
    response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
    next_result = response.json()
    print(f"  next API 返回: {json.dumps(next_result, ensure_ascii=False)}")
    
    if next_result.get("unit_complete"):
        print("\n  ⚠️ 后端返回 unit_complete=True")
        print("  正确处理：应该返回单元列表页面")
        print("  但是如果前端继续获取练习，会发生什么？")
        
        # 继续模拟前端的行为
        print(f"\n  模拟前端继续获取练习（错误行为）...")
        response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        wrong = response.json()
        print(f"  获取到的练习: exercise_index={wrong.get('exercise_index')}, exercise_type_index={wrong.get('exercise_type_index')}")
        
        # 检查这个数据是否正确
        if wrong.get("exercise_index") == 0 and wrong.get("exercise_type_index") == 0:
            print("  ✓ 返回了第一个练习（进度没有正确更新）")
        elif wrong.get("unit_complete"):
            print("  ✓ 正确返回 unit_complete")
        else:
            print(f"  ⚠️ 返回了不同的练习数据: {json.dumps(wrong, ensure_ascii=False)}")
        
        # 检查单元状态
        print(f"\n  检查单元状态...")
        response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
        units = response.json()
        print(f"  单元0: completed={units['units'][0].get('completed')}")
        print(f"  current_unit={units.get('current_unit')}")
    else:
        # 5.3 如果不是单元完成，继续获取下一个练习
        print(f"\n步骤3 - 不是单元完成，获取下一个练习")
        response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        current = response.json()
        print(f"  exercise_type: {current.get('exercise_type')}")
        print(f"  exercise_index: {current.get('exercise_index')}")
        print(f"  exercise_type_index: {current.get('exercise_type_index')}")
        
        # 5.4 用户点击下一题
        print(f"\n步骤4 - 用户点击下一题")
        response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
        next_result = response.json()
        print(f"  next API 返回: {json.dumps(next_result, ensure_ascii=False)}")
        
        if next_result.get("unit_complete"):
            print("\n  ✓ 单元完成!")
            
            # 检查单元状态
            print(f"\n  检查单元状态...")
            response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
            units = response.json()
            print(f"  单元0: completed={units['units'][0].get('completed')}")
            print(f"  current_unit={units.get('current_unit')}")
    
    # Step 6: 最终检查
    print("\n6. 最终检查阶段二单元列表")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    final_data = response.json()
    print(json.dumps(final_data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    test_phase2()
