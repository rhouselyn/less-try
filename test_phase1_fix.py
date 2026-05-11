#!/usr/bin/env python3
"""
测试阶段一修复
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_phase1_fix():
    """测试阶段一修复"""
    
    print("=" * 60)
    print("测试阶段一修复")
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
    
    # Step 3: 获取词汇表
    print("\n3. 获取词汇表")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab = response.json().get("vocab", [])
    print(f"词汇数量: {len(vocab)}")
    
    # Step 4: 学习所有单词
    print("\n4. 学习所有单词")
    for i in range(len(vocab)):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        print(f"  学习单词 {i+1}: index={response.json().get('new_index')}")
    
    # Step 5: 检查阶段一单元列表
    print("\n5. 检查阶段一单元列表")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    data = response.json()
    print(json.dumps(data, indent=2, ensure_ascii=False))
    
    # 验证
    units = data.get("units", [])
    if units:
        unit = units[0]
        if unit.get("completed"):
            print("\n✓ 阶段一单元0已正确标记为完成!")
        else:
            print("\n✗ 阶段一单元0未标记为完成!")
    
    # Step 6: 检查覆盖度
    print("\n6. 检查覆盖度")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    test_phase1_fix()
