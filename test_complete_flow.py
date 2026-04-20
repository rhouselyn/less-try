#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_process_text():
    print("=== 测试文本处理（hi bro） ===")
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
    vocab = result.get('vocab', [])
    print(f"词汇数: {len(vocab)}")
    print(f"词汇: {json.dumps([w['word'] for w in vocab], ensure_ascii=False)}")
    return vocab

def test_complete_learning_flow(file_id, vocab_count):
    print("\n=== 测试完整学习流程 ===")
    
    # 重置学习进度
    reset_response = requests.post(f"{BASE_URL}/api/learn/{file_id}/set-progress", json={"index": 0})
    print(f"重置进度: {reset_response.status_code}")
    
    # 循环学习所有单词
    for i in range(vocab_count):
        print(f"\n--- 学习单词 {i+1}/{vocab_count} ---")
        
        # 获取当前单词
        word_response = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
        if word_response.status_code == 200:
            word_data = word_response.json()
            print(f"当前单词: {word_data.get('word')}")
        else:
            print(f"获取单词失败: {word_response.status_code}")
            break
        
        # 检查覆盖度
        coverage_response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
        if coverage_response.status_code == 200:
            coverage = coverage_response.json()
            print(f"覆盖度: {json.dumps(coverage, indent=2, ensure_ascii=False)}")
        
        # 下一个单词
        next_response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        if next_response.status_code == 200:
            next_data = next_response.json()
            print(f"进度更新: new_index = {next_data.get('new_index')}")
        else:
            print(f"更新进度失败: {next_response.status_code}")
            break
        
        # 检查是否学习完成
        if next_data.get('new_index') >= vocab_count:
            print("\n=== 学习完成！ ===")
            break
    
    # 学习完成后检查覆盖度
    print("\n=== 学习完成后检查覆盖度 ===")
    coverage_response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    if coverage_response.status_code == 200:
        coverage = coverage_response.json()
        print(f"覆盖度: {json.dumps(coverage, indent=2, ensure_ascii=False)}")
    
    # 生成句子翻译题
    if coverage.get('can_form_sentences'):
        print("\n=== 测试句子翻译题生成 ===")
        quiz_response = requests.get(f"{BASE_URL}/api/learn/{file_id}/sentence-quiz")
        if quiz_response.status_code == 200:
            quiz_data = quiz_response.json()
            print(f"响应: {json.dumps(quiz_data, indent=2, ensure_ascii=False)}")
    
    print("\n=== 完整学习流程测试完成！ ===")

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
        
        # 测试4: 查询单词详情并检查上下文句子翻译
        if vocab and len(vocab) > 0:
            print("\n=== 测试单词详情和上下文句子翻译 ===")
            word_to_test = vocab[0]["word"]
            print(f"测试单词: {word_to_test}")
            word_detail = None
            word_detail_response = requests.get(f"{BASE_URL}/api/word/{file_id}/{word_to_test}")
            print(f"单词详情状态码: {word_detail_response.status_code}")
            if word_detail_response.status_code == 200:
                word_detail = word_detail_response.json()
                print(f"单词详情: {json.dumps(word_detail, indent=2, ensure_ascii=False)}")
                
                # 检查 context_sentences
                if "context_sentences" in word_detail and word_detail["context_sentences"]:
                    print(f"\n✓ 上下文句子数量: {len(word_detail['context_sentences'])}")
                    for i, ctx in enumerate(word_detail["context_sentences"]):
                        print(f"  上下文 {i+1}:")
                        translation_found = False
                        if isinstance(ctx, dict):
                            print(f"    原句: {ctx.get('sentence', 'N/A')}")
                            print(f"    翻译: {ctx.get('translation', 'N/A')}")
                            if ctx.get('translation'):
                                translation_found = True
                        else:
                            print(f"    原句 (字符串): {ctx}")
                            # Check if context_translations exists
                            if "context_translations" in word_detail and len(word_detail["context_translations"]) > i:
                                print(f"    翻译: {word_detail['context_translations'][i]}")
                                translation_found = True
                        if translation_found:
                            print(f"    ✓ 翻译存在!")
                        else:
                            print(f"    ✗ 翻译不存在!")
        
        # 测试5: 完整学习流程
        if vocab:
            test_complete_learning_flow(file_id, len(vocab))
        
        print("\n=== 所有测试完成！ ===")
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
