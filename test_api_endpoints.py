#!/usr/bin/env python3
"""
通过 HTTP API 测试修复后的逻辑
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def test_api_endpoints():
    """测试 API 端点"""
    print_section("测试 HTTP API 端点")

    # 1. 获取最新的 file_id
    data_dir = "/workspace/data/files"
    import os
    files = [f for f in os.listdir(data_dir) if f.startswith("text_")]
    if not files:
        print("没有找到处理过的文件")
        return

    files.sort(reverse=True)
    file_id = files[0]
    print(f"使用文件ID: {file_id}")

    # 2. 测试 checkCoverage
    print("\n--- 测试 checkCoverage ---")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    print(f"状态码: {response.status_code}")
    coverage_data = response.json()
    print(f"响应数据: {json.dumps(coverage_data, ensure_ascii=False, indent=2)}")

    # 3. 测试 generateSentenceQuiz
    print("\n--- 测试 generateSentenceQuiz ---")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/sentence-quiz")
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        quiz_data = response.json()
        print(f"响应数据: {json.dumps(quiz_data, ensure_ascii=False, indent=2)}")
        print(f"\nunit_completed 字段: {quiz_data.get('unit_completed')}")
        print(f"tokens 数量: {len(quiz_data.get('tokens', []))}")
        print(f"原始句子: {quiz_data.get('original_sentence')}")
    else:
        print(f"错误: {response.text}")

def test_learning_flow():
    """测试学习流程"""
    print_section("测试学习流程")

    # 获取最新的 file_id
    data_dir = "/workspace/data/files"
    import os
    files = [f for f in os.listdir(data_dir) if f.startswith("text_")]
    if not files:
        return

    files.sort(reverse=True)
    file_id = files[0]

    # 获取 vocab
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab_data = response.json()
    vocab = vocab_data.get("vocab", [])
    print(f"词汇表长度: {len(vocab)}")

    # 重置学习进度为0
    requests.post(f"{BASE_URL}/api/learn/{file_id}/set-progress", json={"index": 0})
    print("已重置学习进度为 0")

    # 学习单词直到完成第一个单元
    print("\n--- 学习单词 ---")
    for i in range(len(vocab) + 5):  # 多学几个以确保覆盖所有单词
        response = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
        if response.status_code != 200:
            print(f"获取单词失败: {response.status_code}")
            break
        word_data = response.json()
        print(f"学习单词 {i+1}: {word_data.get('word')}")

        # 点击下一个
        next_response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        if next_response.status_code != 200:
            print(f"下一个单词失败: {next_response.status_code}")
            break

        time.sleep(0.1)  # 稍微延迟避免过快

    # 检查学习进度
    print("\n--- 检查学习进度 ---")
    coverage_response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    coverage_data = coverage_response.json()
    print(f"checkCoverage: {json.dumps(coverage_data, ensure_ascii=False, indent=2)}")

    # 获取阶段一单元数据
    print("\n--- 获取阶段一单元数据 ---")
    phase1_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    if phase1_response.status_code == 200:
        phase1_data = phase1_response.json()
        print(f"阶段一单元: {json.dumps(phase1_data, ensure_ascii=False, indent=2)}")

        # 检查是否有单元完成
        units = phase1_data.get("units", [])
        completed_count = sum(1 for u in units if u.get("completed"))
        print(f"\n已完成单元数: {completed_count}/{len(units)}")

        for i, unit in enumerate(units):
            status = "✅ 完成" if unit.get("completed") else "❌ 未完成"
            print(f"  单元 {i}: {status}")

if __name__ == "__main__":
    print("等待后端服务启动...")
    time.sleep(2)

    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        print(f"后端服务状态: {response.json()}")
    except Exception as e:
        print(f"无法连接到后端服务: {e}")
        print("请确保后端服务正在运行: cd /workspace/backend && python main.py")
        exit(1)

    test_api_endpoints()
    test_learning_flow()

    print_section("测试完成")
