#!/usr/bin/env python3
"""
测试阶段一单元完成标记（不做阶段二）
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_phase1_only():
    """测试只完成阶段一的情况"""
    
    print("=" * 60)
    print("测试：只完成阶段一，验证阶段一单元是否正确标记")
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
    
    # Step 4: 学习所有单词（跳过翻译题）
    print("\n4. 学习所有单词")
    
    for i in range(len(vocab)):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        result = response.json()
        new_index = result.get("new_index")
        print(f"  学习单词 {i+1}: new_index={new_index}")
        
        # 检查覆盖度
        response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
        coverage = response.json()
        print(f"    checkCoverage: can_form={coverage.get('can_form_sentences')}, unit_completed={coverage.get('unit_completed')}")
        
        # 如果单元完成，退出循环
        if coverage.get("unit_completed"):
            print("    ✓ 单元完成!")
            break
    
    # Step 5: 检查阶段一单元状态（不做阶段二）
    print("\n5. 检查阶段一单元状态（不做阶段二）")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_data = response.json()
    print(json.dumps(phase1_data, indent=2, ensure_ascii=False))
    
    # 验证
    units = phase1_data.get("units", [])
    if units:
        unit = units[0]
        if unit.get("completed"):
            print("\n✓ 阶段一单元0已正确标记为完成!")
            print("✓ 修复成功! 阶段一单元不再依赖阶段二完成")
        else:
            print("\n✗ 阶段一单元0未标记为完成")
            print("✗ 修复失败!")
    
    # Step 6: 检查阶段二单元状态（应该未完成）
    print("\n6. 检查阶段二单元状态")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2_data = response.json()
    print(json.dumps(phase2_data, indent=2, ensure_ascii=False))
    
    units2 = phase2_data.get("units", [])
    if units2:
        unit2 = units2[0]
        if not unit2.get("completed"):
            print("\n✓ 阶段二单元0正确显示为未完成")
        else:
            print("\n✗ 阶段二单元0不应该标记为完成")

if __name__ == "__main__":
    test_phase1_only()
