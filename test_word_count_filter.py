#!/usr/bin/env python3
"""
测试 word_count >= 2 条件
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def test_word_count_filter():
    """测试 word_count >= 2 条件"""
    print_section("测试 word_count >= 2 条件")

    # 找到测试文件
    import os
    data_dir = "/workspace/data/files"
    files = [f for f in os.listdir(data_dir) if f.startswith("text_")]
    if not files:
        print("没有找到测试数据")
        return

    files.sort(reverse=True)
    file_id = files[0]
    print(f"使用文件ID: {file_id}")

    # 重置进度和已使用句子
    requests.post(f"{BASE_URL}/api/learn/{file_id}/set-progress", json={"index": 3})
    storage_path = f"/workspace/data/files/{file_id}/used_sentences.json"
    with open(storage_path, 'w') as f:
        json.dump([], f)
    print("已重置学习进度为 3，已使用句子为空")

    # 加载句子数据
    sentences = requests.get(f"{BASE_URL}/api/{file_id}/sentences").json()
    print(f"\n句子总数: {len(sentences)}")

    print("\n--- 句子单词数分析 ---")
    for s in sentences:
        sentence = s.get("sentence", "")
        word_count = len(sentence.split())
        status = "✅ 参与" if word_count >= 2 else "❌ 跳过"
        print(f"  '{sentence}' -> {word_count} 个单词 {status}")

    # 测试 sentence-quiz API
    print("\n--- 测试 sentence-quiz API ---")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/sentence-quiz")
    print(f"状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"原始句子: {data.get('original_sentence')}")
        print(f"单词数: {len(data.get('original_sentence', '').split())}")
        print(f"正确翻译: {data.get('correct_translation')}")
        print(f"选项: {data.get('tokens')}")
        print(f"unit_completed: {data.get('unit_completed')}")
    elif response.status_code == 404:
        print(f"没有符合条件的句子: {response.json()}")
    else:
        print(f"错误: {response.text}")

if __name__ == "__main__":
    test_word_count_filter()
