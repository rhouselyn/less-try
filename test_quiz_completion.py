#!/usr/bin/env python3
"""
测试翻译题完成后第一阶段是否标记为完成
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_quiz_completion():
    """测试翻译题完成后第一阶段是否标记为完成"""
    
    print("=" * 60)
    print("测试翻译题完成后第一阶段是否标记为完成")
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
    result = response.json()
    file_id = result.get("file_id")
    print(f"文件ID: {file_id}")
    
    # Step 2: 等待处理完成
    print("\n2. 等待处理完成")
    max_wait = 60
    for i in range(max_wait):
        time.sleep(1)
        response = requests.get(f"{BASE_URL}/api/status/{file_id}")
        status = response.json()
        print(f"  等待 {i+1}/{max_wait}s: status={status.get('status')}, progress={status.get('progress')}")
        if status.get("status") == "completed":
            print("处理完成!")
            break
        elif status.get("status") == "failed":
            print("处理失败!")
            return
    
    # Step 3: 学习所有单词
    print("\n3. 学习所有单词")
    for i in range(10):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        result = response.json()
        new_index = result.get('new_index')
        print(f"  学习 {i+1}: new_index={new_index}")
        if new_index is not None and new_index >= 10:
            print("  所有单词已学习!")
            break
    
    # Step 4: 获取翻译题
    print("\n4. 获取翻译题")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/sentence-quiz")
    quiz = response.json()
    print(f"翻译题响应: {json.dumps(quiz, ensure_ascii=False)}")
    quiz_unit_completed = quiz.get('unit_completed', False)
    print(f"quiz.unit_completed: {quiz_unit_completed}")
    
    if 'detail' in quiz:
        print(f"错误: {quiz['detail']}")
        return
    
    # Step 5: 模拟翻译题完成（调用 next-word）
    print("\n5. 模拟翻译题完成后调用 next-word")
    response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
    result = response.json()
    print(f"next-word 结果: {json.dumps(result, ensure_ascii=False)}")
    
    # Step 6: 检查覆盖度
    print("\n6. 检查覆盖度")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    coverage = response.json()
    print(f"覆盖度: {json.dumps(coverage, ensure_ascii=False)}")
    
    # Step 7: 检查第一阶段单元状态
    print("\n7. 检查第一阶段单元状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1 = response.json()
    print(f"阶段一: {json.dumps(phase1, indent=2, ensure_ascii=False)}")
    
    if 'units' in phase1:
        unit0_completed = phase1["units"][0]["completed"] if phase1["units"] else False
        print(f"\n单元0 completed: {unit0_completed}")
        
        if unit0_completed:
            print("✓ 翻译题完成后第一阶段单元标记为完成!")
        else:
            print("✗ 翻译题完成后第一阶段单元未标记为完成!")
    else:
        print(f"错误: {phase1}")

if __name__ == "__main__":
    test_quiz_completion()
