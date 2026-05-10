#!/usr/bin/env python3
"""
端到端测试：完整学习流程
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_e2e():
    """端到端测试"""
    
    print("=" * 60)
    print("端到端测试：完整学习流程")
    print("=" * 60)
    
    # Step 1: 提交文本
    print("\n1. 提交文本 'hello world'")
    response = requests.post(
        f"{BASE_URL}/api/process-text",
        json={
            "text": "hello world",
            "source_language": "en",
            "target_language": "zh"
        },
        timeout=30
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
    
    # Step 3: 获取第一个单词
    print("\n3. 获取第一个单词")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/word", timeout=10)
    word_data = response.json()
    print(f"单词: {word_data.get('word')}")
    
    # Step 4: 学习所有单词
    print("\n4. 学习所有单词")
    for i in range(10):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word", timeout=30)
        result = response.json()
        print(f"  步骤{i+1}: new_index={result.get('new_index')}")
        if result.get("new_index") is None or result.get("new_index") >= 2:
            break
    
    # Step 5: 检查单元状态
    print("\n5. 检查阶段一单元状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    units = response.json()
    print(json.dumps(units, indent=2))
    
    # 总结
    print("\n" + "=" * 60)
    print("测试结果")
    print("=" * 60)
    
    unit0 = units.get("units", [{}])[0]
    if unit0.get("completed"):
        print("✓ 阶段一单元0已完成!")
    else:
        print("✗ 阶段一单元0未完成")

if __name__ == "__main__":
    test_e2e()
