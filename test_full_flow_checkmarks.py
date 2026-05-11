#!/usr/bin/env python3
"""
完整测试：阶段一完成 -> 返回单元列表 -> 检查打勾标记
"""

import requests
import time
import json
import os

BASE_URL = "http://localhost:8000"

def test_full_flow_with_checkmarks():
    """测试完整流程：阶段一完成 -> 返回单元列表 -> 检查打勾标记"""
    
    print("=" * 60)
    print("完整测试：阶段一完成 -> 返回单元列表 -> 检查打勾标记")
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
    
    if len(vocab) == 0:
        print("词汇表为空，无法测试!")
        return
    
    # Step 4: 检查初始状态
    print("\n4. 检查初始状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_initial = response.json()
    print("阶段一单元列表:")
    for unit in phase1_initial.get("units", []):
        print(f"  单元{unit['unit_id']}: completed={unit['completed']}")
    
    # Step 5: 学习所有单词（模拟用户完成阶段一）
    print("\n5. 学习所有单词（模拟用户完成阶段一）")
    
    # 学习单词
    for i in range(len(vocab) + 5):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        result = response.json()
        new_index = result.get("new_index")
        print(f"  学习单词 {i+1}: new_index={new_index}")
        if new_index is None or new_index >= len(vocab):
            break
    
    # Step 6: 检查 can_form_sentences
    print("\n6. 检查 can_form_sentences")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    coverage = response.json()
    print(f"can_form_sentences: {coverage.get('can_form_sentences')}")
    print(f"unit_completed: {coverage.get('unit_completed')}")
    
    # Step 7: 模拟前端 getNextWord 的逻辑
    print("\n7. 模拟前端 getNextWord 的逻辑")
    
    # 检查是否学习完所有单词
    new_index = result.get("new_index", 0)
    vocab_length = len(vocab)
    all_words_learned = new_index >= vocab_length
    
    print(f"new_index={new_index}, vocab_length={vocab_length}")
    print(f"all_words_learned={all_words_learned}")
    
    if all_words_learned:
        if coverage.get("can_form_sentences"):
            print("  -> 应该进入句子翻译题流程")
            try:
                response = requests.get(f"{BASE_URL}/api/learn/{file_id}/sentence-quiz")
                quiz = response.json()
                print(f"  -> 句子翻译题数据: exercise_type={quiz.get('exercise_type')}")
                
                # 检查 unit_completed
                if quiz.get("unit_completed"):
                    print("  -> unit_completed=True，应该返回单元列表")
                else:
                    print("  -> unit_completed=False，继续翻译题")
            except Exception as e:
                print(f"  -> 获取句子翻译题失败: {e}")
        else:
            print("  -> 应该返回单元列表页面（can_form_sentences=False）")
    
    # Step 8: 重新获取阶段一单元列表（模拟返回单元列表页面）
    print("\n8. 重新获取阶段一单元列表（模拟返回单元列表页面）")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_final = response.json()
    print("阶段一单元列表:")
    for unit in phase1_final.get("units", []):
        status = "✓ 已完成" if unit.get("completed") else "○ 未完成"
        print(f"  单元{unit['unit_id']}: {status}")
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    units = phase1_final.get("units", [])
    if units:
        unit = units[0]
        unit_completed = unit.get("completed", False)
        
        if unit_completed:
            print("\n✓ 阶段一完成后，单元0正确标记为已完成！")
            print("  前端应该显示打勾标记 ✓")
        else:
            print("\n✗ 阶段一完成后，单元0未标记为已完成！")
            print("  前端不会显示打勾标记")
    else:
        print("\n✗ 没有单元数据!")

if __name__ == "__main__":
    test_full_flow_with_checkmarks()
