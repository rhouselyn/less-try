#!/usr/bin/env python3
"""
测试 'hi man. what's up' 句子处理
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_hi_man_whats_up():
    """测试 'hi man. what's up' 句子处理"""
    
    print("=" * 60)
    print("测试 'hi man. what's up' 句子处理")
    print("=" * 60)
    
    # Step 1: 提交文本
    print("\n1. 提交文本 'hi man. what's up'")
    response = requests.post(
        f"{BASE_URL}/api/process-text",
        json={
            "text": "hi man. what's up",
            "source_language": "en",
            "target_language": "zh"
        },
        timeout=120
    )
    result = response.json()
    file_id = result.get("file_id")
    print(f"文件ID: {file_id}")
    
    # Step 2: 等待处理完成
    print("\n2. 等待处理完成")
    for i in range(60):
        time.sleep(1)
        response = requests.get(f"{BASE_URL}/api/status/{file_id}")
        status = response.json()
        print(f"  轮询 {i+1}: status={status.get('status')}, progress={status.get('progress')}%")
        
        if status.get("status") == "completed":
            print("处理完成!")
            break
        elif status.get("status") == "error":
            print(f"处理错误: {status.get('error')}")
            break
    
    # Step 3: 获取词汇表
    print("\n3. 获取词汇表")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab_data = response.json()
    vocab = vocab_data.get("vocab", [])
    print(f"词汇数量: {len(vocab)}")
    for v in vocab:
        word = v.get('word', 'N/A')
        options = v.get('options', [])
        print(f"  - {word}: options={options if options else '无选项!'}")
    
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
            redundant = tr.get("redundant_tokens", [])
            print(f"  - '{sentence}':")
            print(f"    tokens数量: {len(tokens)}")
            print(f"    redundant_tokens: {redundant if redundant else '无!'}")
            if not redundant:
                print(f"    ⚠️ 警告: 这个句子没有冗余选项!")
        else:
            print(f"  - '{sentence}': 无翻译结果!")
    
    # Step 5: 检查阶段二单元
    print("\n5. 检查阶段二单元")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    units = response.json()
    print(json.dumps(units, indent=2, ensure_ascii=False))
    
    # Step 6: 测试获取阶段二练习
    print("\n6. 测试获取阶段二练习")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
    exercise = response.json()
    print(f"exercise_type: {exercise.get('exercise_type')}")
    print(f"exercise_index: {exercise.get('exercise_index')}")
    print(f"unit_complete: {exercise.get('unit_complete')}")
    
    data = exercise.get("data", {})
    print(f"options: {data.get('options', [])}")
    print(f"masked_sentence: {data.get('masked_sentence', 'N/A')}")
    
    # 总结
    print("\n" + "=" * 60)
    print("问题分析")
    print("=" * 60)
    
    # 检查问题
    has_issues = False
    
    for s in sentences:
        tr = s.get("translation_result", {})
        if tr:
            redundant = tr.get("redundant_tokens", [])
            if not redundant:
                print(f"\n⚠️ 句子 '{s.get('sentence')}' 没有冗余选项!")
                has_issues = True
    
    for v in vocab:
        options = v.get('options', [])
        if not options:
            print(f"\n⚠️ 单词 '{v.get('word')}' 没有选项!")
            has_issues = True
    
    if has_issues:
        print("\n需要修复: 某些句子或单词没有选项")
    else:
        print("\n✓ 所有数据正常")

if __name__ == "__main__":
    test_hi_man_whats_up()
