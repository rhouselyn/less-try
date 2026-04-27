#!/usr/bin/env python3
"""调试新文件的练习问题"""
import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_debug():
    print("=== 调试新文件练习问题 ===")
    
    # 处理新文本
    test_text = "The quick brown fox jumps over the lazy dog."
    response = requests.post(f"{BASE_URL}/api/process-text", json={"text": test_text})
    print(f"处理文本响应: {response.status_code}")
    
    if response.status_code != 200:
        print(f"❌ 处理失败: {response.text}")
        return
    
    file_id = response.json().get("file_id")
    print(f"文件ID: {file_id}")
    
    # 等待处理
    print("\n等待处理...")
    for i in range(60):
        time.sleep(1)
        status = requests.get(f"{BASE_URL}/api/status/{file_id}").json()
        if status.get("status") == "completed":
            print("✅ 处理完成")
            break
    
    # 重置进度
    print("\n重置进度...")
    reset_response = requests.post(
        f"{BASE_URL}/api/{file_id}/phase/2/set-progress",
        json={"unit_id": 0, "exercise_index": 0, "exercise_type_index": 0}
    )
    print(f"重置响应: {reset_response.status_code}")
    
    # 获取第一个练习
    print("\n=== 获取第一个练习 ===")
    exercise1 = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
    print(f"状态码: {exercise1.status_code}")
    print(f"响应数据: {json.dumps(exercise1.json(), indent=2, ensure_ascii=False)}")
    
    # 调用next
    print("\n=== 调用next ===")
    next1 = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
    print(f"next状态码: {next1.status_code}")
    print(f"next响应: {json.dumps(next1.json(), indent=2, ensure_ascii=False)}")
    
    # 获取第二个练习
    print("\n=== 获取第二个练习 ===")
    exercise2 = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
    print(f"状态码: {exercise2.status_code}")
    print(f"响应数据: {json.dumps(exercise2.json(), indent=2, ensure_ascii=False)}")

if __name__ == "__main__":
    test_debug()
