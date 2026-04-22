import requests
import time
import json
import os

BASE_URL = "http://localhost:8000"

def create_test_data():
    """创建新的测试数据"""
    print("=== 创建测试数据 ===")
    
    # 测试文本
    test_text = "hi man. what's up"
    
    print(f"测试文本: {test_text}")
    
    # 1. 处理文本
    process_url = f"{BASE_URL}/api/process-text"
    response = requests.post(process_url, json={
        "text": test_text,
        "source_language": "en",
        "target_language": "zh"
    })
    
    if response.status_code != 200:
        print(f"处理文本失败: {response.status_code}")
        print(response.text)
        return None
    
    process_data = response.json()
    file_id = process_data["file_id"]
    print(f"文件ID: {file_id}")
    
    # 2. 等待处理完成
    print("等待处理完成...")
    for i in range(30):
        status_url = f"{BASE_URL}/api/status/{file_id}"
        status_response = requests.get(status_url)
        
        if status_response.status_code == 200:
            status_data = status_response.json()
            if status_data.get("status") == "completed":
                print("处理完成！")
                break
            elif status_data.get("status") == "error":
                print("处理出错！")
                print(status_data.get("error"))
                return None
        
        time.sleep(1)
    else:
        print("处理超时！")
        return None
    
    # 3. 获取词汇表
    vocab_url = f"{BASE_URL}/api/vocab/{file_id}"
    vocab_response = requests.get(vocab_url)
    if vocab_response.status_code == 200:
        vocab_data = vocab_response.json()
        print(f"词汇表: {[w['word'] for w in vocab_data.get('vocab', [])]}")
    
    # 4. 获取句子
    sentences_url = f"{BASE_URL}/api/sentences/{file_id}"
    sentences_response = requests.get(sentences_url)
    if sentences_response.status_code == 200:
        sentences_data = sentences_response.json()
        print(f"句子: {[s['sentence'] for s in sentences_data.get('sentences', [])]}")
        for i, sent in enumerate(sentences_data.get('sentences', [])):
            if 'translation_result' in sent and 'translation' in sent['translation_result']:
                tokens = [t['text'] for t in sent['translation_result']['translation']]
                print(f"  句子 {i+1} tokens: {tokens}")
    
    print(f"\n✅ 测试数据创建成功！文件ID: {file_id}")
    return file_id

if __name__ == "__main__":
    file_id = create_test_data()
    if file_id:
        print(f"\n请记住这个文件ID: {file_id}")
