#!/usr/bin/env python3
"""
完整流程测试脚本 - 逐步测试每个环节
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def print_step(title):
    print("\n" + "=" * 60)
    print(f"【{title}】")
    print("=" * 60)

def print_result(data):
    print(json.dumps(data, indent=2, ensure_ascii=False))

def test_full_flow():
    """完整流程测试"""
    
    # Step 1: 提交文本
    print_step("Step 1: 提交文本 'hello world'")
    response = requests.post(
        f"{BASE_URL}/api/process-text",
        json={
            "text": "hello world",
            "source_language": "en",
            "target_language": "zh"
        }
    )
    result = response.json()
    print_result(result)
    file_id = result.get("file_id")
    print(f"文件ID: {file_id}")
    
    # Step 2: 等待处理完成
    print_step("Step 2: 等待处理完成")
    for i in range(30):
        time.sleep(2)
        response = requests.get(f"{BASE_URL}/api/status/{file_id}")
        status = response.json()
        print(f"轮询 {i+1}: status={status.get('status')}, progress={status.get('progress')}")
        if status.get("status") == "completed":
            print("处理完成!")
            break
    
    # Step 3: 获取词汇表
    print_step("Step 3: 获取词汇表")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab_data = response.json()
    vocab = vocab_data.get("vocab", [])
    print(f"词汇数量: {len(vocab)}")
    for v in vocab:
        print(f"  - {v.get('word')}: {v.get('translation', v.get('context_meaning', 'N/A'))}")
    
    # Step 4: 获取阶段一单元列表
    print_step("Step 4: 获取阶段一单元列表")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_data = response.json()
    print_result(phase1_data)
    
    # Step 5: 获取阶段二单元列表
    print_step("Step 5: 获取阶段二单元列表")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2_data = response.json()
    print_result(phase2_data)
    
    # Step 6: 模拟学习单词 - 学完所有单词
    print_step("Step 6: 模拟学习单词")
    for i in range(len(vocab)):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        print(f"学习单词 {i+1}: {response.json()}")
    
    # Step 7: 检查覆盖度
    print_step("Step 7: 检查覆盖度")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    coverage_data = response.json()
    print_result(coverage_data)
    
    # Step 8: 获取句子翻译题
    print_step("Step 8: 获取句子翻译题")
    try:
        response = requests.get(f"{BASE_URL}/api/learn/{file_id}/sentence-quiz")
        quiz_data = response.json()
        print_result(quiz_data)
    except Exception as e:
        print(f"错误: {e}")
    
    # Step 9: 重新获取阶段一单元列表（检查完成状态）
    print_step("Step 9: 重新获取阶段一单元列表（检查完成状态）")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_data_after = response.json()
    print_result(phase1_data_after)
    
    # Step 10: 测试阶段二
    print_step("Step 10: 测试阶段二 - 获取单元0的练习")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
    phase2_exercise = response.json()
    print_result(phase2_exercise)
    
    exercise_type = phase2_exercise.get("exercise_type", "unknown")
    print(f"\n练习类型: {exercise_type}")
    
    # Step 11: 逐题测试下一题
    print_step("Step 11: 逐题测试下一题（循环测试直到单元完成）")
    
    iteration = 0
    while iteration < 10:  # 最多测试10次
        iteration += 1
        print(f"\n--- 测试迭代 {iteration} ---")
        
        # 调用 next API
        response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
        next_data = response.json()
        print_result(next_data)
        
        # 检查是否单元完成
        if next_data.get("unit_complete"):
            print("单元已完成!")
            break
        
        # 获取当前练习
        response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        current_exercise = response.json()
        
        current_type = current_exercise.get("exercise_type", "unknown")
        print(f"当前练习类型: {current_type}")
        
        # 检查进度
        response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
        phase2_progress = response.json()
        print(f"阶段二进度: current_unit={phase2_progress.get('current_unit')}")
        for unit in phase2_progress.get("units", []):
            print(f"  单元{unit['unit_id']}: completed={unit.get('completed')}")
    
    # Step 12: 最终检查阶段二单元列表
    print_step("Step 12: 最终检查阶段二单元列表")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    final_phase2_data = response.json()
    print_result(final_phase2_data)

if __name__ == "__main__":
    try:
        test_full_flow()
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()
