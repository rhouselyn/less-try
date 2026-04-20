#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_process_text():
    print("=== 测试文本处理 ===")
    response = requests.post(
        f"{BASE_URL}/api/process-text",
        json={"text": "hi bro", "source_language": "en", "target_language": "zh"}
    )
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
    return result.get("file_id")

def test_get_status(file_id):
    print("\n=== 测试状态查询 ===")
    for i in range(60):  # 最多等待60秒
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
    print(f"词汇数: {len(result.get('vocab', []))}")
    print(f"词汇: {json.dumps([w['word'] for w in result.get('vocab', [])], ensure_ascii=False)}")
    return result.get('vocab')

def test_sentences(file_id):
    print("\n=== 测试句子查询 ===")
    response = requests.get(f"{BASE_URL}/api/sentences/{file_id}")
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"句子数: {len(result.get('sentences', []))}")
    for i, sent in enumerate(result.get('sentences', [])):
        print(f"句子{i}: {json.dumps(sent, indent=2, ensure_ascii=False)}")
    return result.get('sentences')

def test_get_random_word(file_id):
    print("\n=== 测试随机单词获取 ===")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
    return result

def test_next_word(file_id):
    print("\n=== 测试下一个单词 ===")
    response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
    return result

def test_check_coverage(file_id):
    print("\n=== 测试覆盖度检查 ===")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
    return result

def test_generate_sentence_quiz(file_id):
    print("\n=== 测试句子翻译题生成 ===")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/sentence-quiz")
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
    return result

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
        
        # 测试4: 查询句子
        sentences = test_sentences(file_id)
        
        # 测试5: 获取随机单词
        random_word = test_get_random_word(file_id)
        
        # 测试6: 下一个单词
        next_word_result = test_next_word(file_id)
        
        # 测试7: 覆盖度检查
        coverage = test_check_coverage(file_id)
        
        # 如果可以生成句子翻译题，测试一下
        if coverage.get('can_form_sentences'):
            quiz = test_generate_sentence_quiz(file_id)
        
        print("\n=== 所有测试完成！ ===")
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
