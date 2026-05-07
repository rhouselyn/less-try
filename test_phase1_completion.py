#!/usr/bin/env python3
"""
测试第一阶段完成标记逻辑
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_phase1_completion():
    """测试第一阶段完成标记"""
    
    print("=" * 60)
    print("测试第一阶段完成标记")
    print("=" * 60)
    
    # Step 1: 提交文本 "hello world" (只有2个单词，1个单元)
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
    
    # Step 3: 获取词汇表
    print("\n3. 获取词汇表")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab = response.json().get("vocab", [])
    print(f"词汇数量: {len(vocab)}")
    for v in vocab:
        print(f"  - {v.get('word')}")
    
    # Step 4: 学习单词1
    print("\n4. 学习单词1")
    response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
    result = response.json()
    print(f"  new_index: {result.get('new_index')}")
    
    # Step 5: 检查覆盖度
    print("\n5. 检查覆盖度 (学习完1个单词后)")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    coverage = response.json()
    print(f"  {json.dumps(coverage, ensure_ascii=False)}")
    print(f"  unit_completed: {coverage.get('unit_completed')}")
    
    # Step 6: 检查阶段一单元状态
    print("\n6. 检查阶段一单元状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1 = response.json()
    print(f"  {json.dumps(phase1, indent=2, ensure_ascii=False)}")
    unit0_completed = phase1["units"][0]["completed"] if phase1["units"] else False
    print(f"  单元0 completed: {unit0_completed}")
    
    # Step 7: 学习单词2
    print("\n7. 学习单词2")
    response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
    result = response.json()
    print(f"  new_index: {result.get('new_index')}")
    
    # Step 8: 检查覆盖度
    print("\n8. 检查覆盖度 (学习完2个单词后)")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    coverage = response.json()
    print(f"  {json.dumps(coverage, ensure_ascii=False)}")
    print(f"  unit_completed: {coverage.get('unit_completed')}")
    
    # Step 9: 检查阶段一单元状态
    print("\n9. 检查阶段一单元状态 (学习完2个单词后)")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1 = response.json()
    print(f"  {json.dumps(phase1, indent=2, ensure_ascii=False)}")
    unit0_completed = phase1["units"][0]["completed"] if phase1["units"] else False
    print(f"  单元0 completed: {unit0_completed}")
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    if unit0_completed:
        print("✓ 第一阶段单元0已标记为完成!")
    else:
        print("✗ 第一阶段单元0未标记为完成!")
        print("  原因分析：需要检查 getNextWord 中的逻辑")

if __name__ == "__main__":
    test_phase1_completion()
