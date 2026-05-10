#!/usr/bin/env python3
"""
测试 "hi man. what's up" 完整流程
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_hi_man_whats_up():
    """测试 hi man. what's up 处理流程"""
    
    print("=" * 60)
    print("测试: hi man. what's up")
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
        timeout=30
    )
    result = response.json()
    file_id = result.get("file_id")
    print(f"文件ID: {file_id}")
    
    # Step 2: 等待处理完成（增加超时）
    print("\n2. 等待处理完成（最多等待120秒）")
    max_wait = 120
    for i in range(max_wait):
        time.sleep(1)
        response = requests.get(f"{BASE_URL}/api/status/{file_id}")
        status = response.json()
        current_status = status.get("status")
        progress = status.get("progress", 0)
        
        if i % 10 == 0 or current_status in ["completed", "error"]:
            print(f"  轮询 {i+1}/{max_wait}: status={current_status}, progress={progress}%")
        
        if current_status == "completed":
            print("处理完成!")
            break
        elif current_status == "error":
            print(f"处理错误: {status.get('error')}")
            break
    else:
        print("等待超时!")
        return
    
    # Step 3: 获取词汇表
    print("\n3. 获取词汇表")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab_data = response.json()
    vocab = vocab_data.get("vocab", [])
    print(f"词汇数量: {len(vocab)}")
    
    for v in vocab:
        word = v.get("word", "")
        translation = v.get("translation", v.get("context_meaning", "N/A"))
        options = v.get("options", [])
        print(f"  - '{word}': {translation}")
        print(f"    选项数量: {len(options)}")
        if len(options) == 0:
            print(f"    ⚠️ 警告: 没有选项!")
        else:
            print(f"    选项: {options}")
    
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
            print(f"  - '{sentence}': {len(tokens)} tokens")
            print(f"    冗余词数量: {len(redundant)}")
            if len(redundant) == 0:
                print(f"    ⚠️ 警告: 没有冗余词!")
            else:
                print(f"    冗余词: {redundant}")
        else:
            print(f"  - '{sentence}': 无翻译结果 ⚠️")
    
    # Step 5: 检查阶段一单元状态
    print("\n5. 检查阶段一单元状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_data = response.json()
    print(json.dumps(phase1_data, indent=2, ensure_ascii=False))
    
    # Step 6: 检查阶段二单元状态
    print("\n6. 检查阶段二单元状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2_data = response.json()
    print(json.dumps(phase2_data, indent=2, ensure_ascii=False))
    
    # 总结
    print("\n" + "=" * 60)
    print("问题总结")
    print("=" * 60)
    
    issues = []
    
    # 检查词汇选项
    for v in vocab:
        if not v.get("options"):
            issues.append(f"词汇 '{v.get('word')}' 没有选项")
    
    # 检查句子翻译
    for s in sentences:
        tr = s.get("translation_result", {})
        if not tr:
            issues.append(f"句子 '{s.get('sentence')}' 没有翻译结果")
        elif not tr.get("redundant_tokens"):
            issues.append(f"句子 '{s.get('sentence')}' 没有冗余词")
    
    # 检查阶段完成状态
    phase1_completed = any(u.get("completed") for u in phase1_data.get("units", []))
    phase2_completed = any(u.get("completed") for u in phase2_data.get("units", []))
    
    print(f"\n阶段一完成: {phase1_completed}")
    print(f"阶段二完成: {phase2_completed}")
    
    if issues:
        print(f"\n发现 {len(issues)} 个问题:")
        for issue in issues:
            print(f"  ⚠️ {issue}")
    else:
        print("\n✓ 没有发现明显问题")

if __name__ == "__main__":
    test_hi_man_whats_up()
