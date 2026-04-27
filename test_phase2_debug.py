#!/usr/bin/env python3
"""调试第二阶段练习问题"""
import requests
import time
import json

BASE_URL = "http://localhost:8000"
# 使用与之前相同的文件ID或处理新文本
USE_EXISTING_FILE = True
EXISTING_FILE_ID = "text_20260427_102725_663"  # 从之前的测试中获取

def test_phase2_debug():
    """调试第二阶段练习"""
    print("=== 调试第二阶段练习 ===")
    print("=" * 60)
    
    if USE_EXISTING_FILE:
        file_id = EXISTING_FILE_ID
        print(f"使用现有文件ID: {file_id}")
    else:
        # 处理新文本
        print("\n处理新文本...")
        TEST_TEXT = """The quick brown fox jumps over the lazy dog. This is a simple test sentence. Learning English can be fun and rewarding."""
        response = requests.post(
            f"{BASE_URL}/api/process-text",
            json={"text": TEST_TEXT}
        )
        assert response.status_code == 200
        file_id = response.json().get("file_id")
        print(f"新文件ID: {file_id}")
        
        # 等待处理
        print("\n等待处理完成...")
        for i in range(30):
            time.sleep(2)
            status = requests.get(f"{BASE_URL}/api/status/{file_id}").json()
            if status.get("status") == "completed":
                break
    
    # 重置阶段二进度，从头开始测试
    print("\n重置阶段二进度...")
    reset_response = requests.post(
        f"{BASE_URL}/api/{file_id}/phase/2/set-progress",
        json={"unit_id": 0, "exercise_index": 0}
    )
    print(f"重置响应: {reset_response.status_code}")
    
    # 详细测试
    print("\n详细调试测试...")
    
    for i in range(8):
        print(f"\n{'='*60}")
        print(f"第 {i+1} 次测试")
        print('='*60)
        
        # 获取练习
        print(f"1. 获取练习...")
        exercise_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        print(f"   状态码: {exercise_response.status_code}")
        
        if exercise_response.status_code == 200:
            exercise_data = exercise_response.json()
            print(f"\n2. 完整响应数据:")
            print(json.dumps(exercise_data, indent=2, ensure_ascii=False))
            
            # 检查是否unit_complete
            if exercise_data.get("unit_complete"):
                print("\n⚠️  单元已完成!")
                break
                
            # 检查是否有错误
            if exercise_data.get("error"):
                print(f"\n⚠️  错误: {exercise_data.get('error')}")
                break
                
        # 调用next
        print(f"\n3. 调用next练习...")
        next_response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
        print(f"   next状态码: {next_response.status_code}")
        if next_response.status_code == 200:
            print(f"   next响应数据:")
            print(json.dumps(next_response.json(), indent=2, ensure_ascii=False))
            
        # 短暂等待
        time.sleep(0.5)

if __name__ == "__main__":
    test_phase2_debug()
