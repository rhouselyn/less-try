#!/usr/bin/env python3
"""
完整测试：API 修复后测试文本处理流程
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_full_flow():
    """测试完整流程"""
    
    print("=" * 60)
    print("测试完整流程（API 修复后）")
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
    
    # Step 2: 等待处理完成（增加超时）
    print("\n2. 等待处理完成（最多等待60秒）")
    max_wait = 60
    for i in range(max_wait):
        time.sleep(1)
        response = requests.get(f"{BASE_URL}/api/status/{file_id}")
        status = response.json()
        current_status = status.get("status")
        progress = status.get("progress")
        print(f"  轮询 {i+1}/{max_wait}: status={current_status}, progress={progress}%")
        
        if current_status == "completed":
            print("处理完成!")
            break
        elif current_status == "error":
            print(f"处理错误: {status.get('error')}")
            break
    
    # Step 3: 获取词汇表
    print("\n3. 获取词汇表")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab_data = response.json()
    vocab = vocab_data.get("vocab", [])
    print(f"词汇数量: {len(vocab)}")
    
    for v in vocab:
        print(f"  - {v.get('word')}: {v.get('translation', v.get('context_meaning', 'N/A'))}")
    
    # Step 4: 获取句子数据
    print("\n4. 获取句子数据")
    response = requests.get(f"{BASE_URL}/api/sentences/{file_id}")
    sentences_data = response.json()
    sentences = sentences_data.get("sentences", [])
    print(f"句子数量: {len(sentences)}")
    
    for s in sentences:
        sentence = s.get("sentence", "")
        tr = s.get("translation_result", {})
        if tr:
            tokens = tr.get("translation", [])
            print(f"  - '{sentence}': {len(tokens)} tokens")
        else:
            print(f"  - '{sentence}': 无翻译结果")
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    if len(vocab) > 0 and len(sentences) > 0:
        print("\n✓ 文本处理成功!")
        print(f"  - 词汇数量: {len(vocab)}")
        print(f"  - 句子数量: {len(sentences)}")
    else:
        print("\n✗ 文本处理可能有问题")
        print(f"  - 词汇数量: {len(vocab)}")
        print(f"  - 句子数量: {len(sentences)}")

if __name__ == "__main__":
    test_full_flow()
