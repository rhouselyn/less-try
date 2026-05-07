#!/usr/bin/env python3
"""
端到端测试：模拟用户完整操作流程
测试第一阶段完成单词后单元是否显示打勾
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_e2e_phase1():
    """端到端测试第一阶段"""
    
    print("=" * 60)
    print("端到端测试：第一阶段完成单词后单元是否显示打勾")
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
    
    # Step 3: 模拟前端 startLearningPhases
    print("\n3. 模拟前端 startLearningPhases")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_units_data = response.json()
    print(f"阶段一单元数据: {json.dumps(phase1_units_data, indent=2, ensure_ascii=False)}")
    
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2_units_data = response.json()
    print(f"阶段二单元数据: {json.dumps(phase2_units_data, indent=2, ensure_ascii=False)}")
    
    # Step 4: 获取词汇表
    print("\n4. 获取词汇表")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab = response.json().get("vocab", [])
    print(f"词汇数量: {len(vocab)}")
    
    # Step 5: 学习所有单词
    print("\n5. 学习所有单词")
    all_learned = False
    for i in range(len(vocab) + 5):  # 多学习几个确保完成
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        result = response.json()
        new_index = result.get('new_index')
        print(f"  学习单词 {i+1}: new_index={new_index}")
        
        if new_index is not None and new_index >= len(vocab):
            all_learned = True
            print(f"  所有单词已学习完成!")
            break
    
    # Step 6: 检查覆盖度（模拟 getNextWord 中的检查）
    print("\n6. 检查覆盖度")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    coverage = response.json()
    print(f"  {json.dumps(coverage, ensure_ascii=False)}")
    
    can_form = coverage.get('can_form_sentences', False)
    unit_completed = coverage.get('unit_completed', False)
    
    # Step 7: 模拟 getNextWord 的处理逻辑
    print("\n7. 模拟 getNextWord 的处理逻辑")
    
    if can_form:
        print("  can_form_sentences = True，尝试生成句子翻译题...")
        try:
            response = requests.get(f"{BASE_URL}/api/learn/{file_id}/sentence-quiz")
            quiz = response.json()
            print(f"  翻译题响应: {json.dumps(quiz, ensure_ascii=False)}")
            
            quiz_unit_completed = quiz.get('unit_completed', False)
            if quiz_unit_completed:
                print("  quiz.unit_completed = True，返回 all-units")
                should_return_to_units = True
            else:
                print("  quiz.unit_completed = False，进入翻译题")
                should_return_to_units = False
        except Exception as e:
            print(f"  生成翻译题失败: {e}")
            should_return_to_units = unit_completed
    else:
        print(f"  can_form_sentences = False")
        if unit_completed:
            print("  unit_completed = True，返回 all-units")
            should_return_to_units = True
        else:
            print("  unit_completed = False，继续学习")
            should_return_to_units = False
    
    # Step 8: 如果应该返回单元列表，重新获取状态
    print("\n8. 重新获取单元状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    final_phase1 = response.json()
    print(f"阶段一单元状态: {json.dumps(final_phase1, indent=2, ensure_ascii=False)}")
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    unit0_completed = final_phase1["units"][0]["completed"] if final_phase1["units"] else False
    
    print(f"should_return_to_units: {should_return_to_units}")
    print(f"单元0 completed: {unit0_completed}")
    
    if unit0_completed and should_return_to_units:
        print("\n✓ 第一阶段完成后单元正确标记为完成!")
    elif not unit0_completed:
        print("\n✗ 第一阶段完成后单元未标记为完成!")
        print("  原因分析：后端返回的 completed 状态不正确")
    else:
        print("\n? 状态异常")

if __name__ == "__main__":
    test_e2e_phase1()
