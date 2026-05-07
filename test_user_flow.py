#!/usr/bin/env python3
"""
完整测试：模拟用户实际操作流程
验证第一阶段完成后是否能立即显示打勾
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_user_flow():
    """模拟用户实际操作流程"""
    
    print("=" * 60)
    print("模拟用户实际操作流程")
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
    
    # Step 3: 模拟用户点击"开始学习"
    print("\n3. 模拟用户点击'开始学习'")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1 = response.json()
    print(f"阶段一单元: {json.dumps(phase1, indent=2, ensure_ascii=False)}")
    
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2 = response.json()
    print(f"阶段二单元: {json.dumps(phase2, indent=2, ensure_ascii=False)}")
    
    # Step 4: 模拟用户点击阶段一单元0
    print("\n4. 模拟用户点击阶段一单元0")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/unit/0")
    word_data = response.json()
    print(f"获取单词: {word_data.get('word')}")
    
    # Step 5: 学习单词
    print("\n5. 模拟用户学习单词（答题正确）")
    for i in range(5):  # 尝试学习5个单词
        print(f"\n  学习单词 {i+1}...")
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        result = response.json()
        new_index = result.get('new_index', 'N/A')
        print(f"    new_index: {new_index}")
        
        if new_index is None or new_index >= 5:
            print(f"    单词学习完成或出错")
            break
    
    # Step 6: 检查阶段一单元状态
    print("\n6. 检查阶段一单元状态（学习完单词后）")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_after = response.json()
    print(f"阶段一单元: {json.dumps(phase1_after, indent=2, ensure_ascii=False)}")
    
    unit0_completed = phase1_after["units"][0]["completed"] if phase1_after["units"] else False
    print(f"\n  单元0 completed: {unit0_completed}")
    
    # Step 7: 模拟用户返回单元列表（调用 getPhaseUnits）
    print("\n7. 模拟用户返回单元列表（重新获取状态）")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_refresh = response.json()
    print(f"阶段一单元（刷新后）: {json.dumps(phase1_refresh, indent=2, ensure_ascii=False)}")
    
    unit0_completed_refresh = phase1_refresh["units"][0]["completed"] if phase1_refresh["units"] else False
    print(f"\n  单元0 completed（刷新后）: {unit0_completed_refresh}")
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    if unit0_completed:
        print("✓ 第一阶段完成后立即标记为完成!")
    else:
        print("✗ 第一阶段完成后未标记为完成!")
        print("  可能的原因：")
        print("  1. checkCoverage 返回的 unit_completed 不正确")
        print("  2. 前端没有正确获取或处理状态")
        
        # 检查 checkCoverage
        print("\n  检查 checkCoverage...")
        response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
        coverage = response.json()
        print(f"    {json.dumps(coverage, ensure_ascii=False)}")

if __name__ == "__main__":
    test_user_flow()
