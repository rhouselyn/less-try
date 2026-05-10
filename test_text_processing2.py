#!/usr/bin/env python3
"""
测试文本处理流程 - 检查实际数据目录
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_text_processing():
    """测试文本处理流程"""
    
    print("=" * 60)
    print("测试文本处理流程")
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
    print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
    file_id = result.get("file_id")
    print(f"文件ID: {file_id}")
    
    # Step 2: 等待处理完成
    print("\n2. 等待处理完成")
    for i in range(30):
        time.sleep(1)
        response = requests.get(f"{BASE_URL}/api/status/{file_id}")
        status = response.json()
        print(f"轮询 {i+1}: status={status.get('status')}, progress={status.get('progress')}")
        if status.get("status") == "completed":
            print("处理完成!")
            break
        elif status.get("status") == "error":
            print(f"处理错误: {status.get('error')}")
            break
    
    # Step 3: 检查后端数据文件
    print("\n3. 检查后端数据文件（/workspace/data）")
    import os
    data_dir = f"/workspace/data/{file_id}"
    if os.path.exists(data_dir):
        files = os.listdir(data_dir)
        print(f"文件列表: {files}")
        for f in files:
            file_path = f"{data_dir}/{f}"
            print(f"\n--- {f} ---")
            with open(file_path, 'r', encoding='utf-8') as file:
                content = json.load(file)
                print(json.dumps(content, indent=2, ensure_ascii=False)[:1000])
    else:
        print(f"目录不存在: {data_dir}")
        # 检查父目录
        parent = "/workspace/data"
        if os.path.exists(parent):
            print(f"父目录 {parent} 存在，文件列表: {os.listdir(parent)}")
        else:
            print(f"父目录也不存在")
    
    # Step 4: 获取词汇表
    print("\n4. 获取词汇表")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab_data = response.json()
    print(f"词汇表: {len(vocab_data.get('vocab', []))} 个词汇")
    print(json.dumps(vocab_data, indent=2, ensure_ascii=False)[:500])
    
    # Step 5: 获取句子数据
    print("\n5. 获取句子数据")
    response = requests.get(f"{BASE_URL}/api/sentences/{file_id}")
    sentences_data = response.json()
    print(json.dumps(sentences_data, indent=2, ensure_ascii=False)[:500])

if __name__ == "__main__":
    test_text_processing()
