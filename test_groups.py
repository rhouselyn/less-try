#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_process_text():
    print("=== 测试文本处理（更长文本） ===")
    text = """I love programming. Python is a great language. 
    It makes coding fun and easy. Let's learn together!"""
    response = requests.post(
        f"{BASE_URL}/api/process-text",
        json={"text": text, "source_language": "en", "target_language": "zh"}
    )
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
    return result.get("file_id")

def test_get_status(file_id):
    print("\n=== 测试状态查询 ===")
    for i in range(120):  # 最多等待120秒
        time.sleep(1)
        response = requests.get(f"{BASE_URL}/api/status/{file_id}")
        status = response.json()
        print(f"状态: {status.get('status')}, 进度: {status.get('progress')}%")
        if status.get("status") == "completed":
            return status
        if status.get("status") == "error":
            raise Exception(f"处理错误: {status.get('error')}")
    raise Exception("处理超时")

def test_vocab(file_id):
    print("\n=== 测试词汇表查询 ===")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    print(f"状态码: {response.status_code}")
    result = response.json()
    vocab = result.get('vocab', [])
    print(f"词汇数: {len(vocab)}")
    print(f"词汇: {json.dumps([w['word'] for w in vocab], ensure_ascii=False)}")
    return vocab

def test_learning_progress(file_id):
    print("\n=== 测试学习进度查询（分组） ===")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/progress")
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
    return result

def test_multiple_words(file_id, vocab_count):
    print("\n=== 测试多个单词学习 ===")
    for i in range(vocab_count):
        print(f"\n--- 单词 {i+1}/{vocab_count} ---")
        response = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
        if response.status_code == 200:
            result = response.json()
            print(f"单词: {result.get('word')}")
            print(f"释义: {result.get('correct_meaning')}")
        
        # 下一个单词
        next_resp = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        if next_resp.status_code == 200:
            print(f"进度更新: {next_resp.json()}")
        
        # 检查覆盖度
        coverage_resp = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
        if coverage_resp.status_code == 200:
            print(f"覆盖度: {coverage_resp.json()}")
    
    print("\n=== 所有单词学习完成 ===")

def main():
    try:
        # 测试1: 处理文本
        file_id = test_process_text()
        if not file_id:
            print("错误: 没有获取到file_id")
            return
        
        # 测试2: 查询状态直到完成
        status = test_get_status(file_id)
        
        # 测试3: 查询词汇表
        vocab = test_vocab(file_id)
        
        # 测试4: 查询学习进度（分组）
        progress = test_learning_progress(file_id)
        
        # 测试5: 多个单词学习
        if vocab:
            test_multiple_words(file_id, min(len(vocab), 5))  # 测试前5个单词
        
        print("\n=== 所有测试完成！ ===")
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
