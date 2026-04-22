import requests
import json
import time

# 测试数据
test_text = "I'm good, don't worry. I'm fine."

def test_word_query():
    """测试单词查询功能，特别是处理缩写形式"""
    print("=== 测试单词查询功能 ===")
    
    # 1. 处理文本
    print("1. 处理文本...")
    response = requests.post('http://localhost:8000/api/process-text', json={
        "text": test_text,
        "source_language": "en",
        "target_language": "zh"
    })
    
    if response.status_code != 200:
        print(f"错误: {response.status_code}, {response.text}")
        return
    
    file_id = response.json()['file_id']
    print(f"文件ID: {file_id}")
    
    # 2. 等待处理完成
    print("2. 等待处理完成...")
    for _ in range(30):
        status_response = requests.get(f'http://localhost:8000/api/status/{file_id}')
        status_data = status_response.json()
        if status_data['status'] == 'completed':
            print("处理完成！")
            break
        elif status_data['status'] == 'error':
            print(f"处理错误: {status_data.get('error', 'Unknown error')}")
            return
        time.sleep(1)
    else:
        print("处理超时")
        return
    
    # 3. 测试查询 "I'm" 单词
    print("3. 测试查询 'I'm' 单词...")
    word_response = requests.get(f'http://localhost:8000/api/word/{file_id}/I%27m')
    
    if word_response.status_code == 200:
        word_data = word_response.json()
        print(f"✅ 成功查询到 'I'm' 的详情:")
        print(f"   单词: {word_data.get('word', 'N/A')}")
        print(f"   释义: {word_data.get('meaning', 'N/A')}")
        print(f"   音标: {word_data.get('ipa', 'N/A')}")
        if word_data.get('examples', []):
            print(f"   示例: {word_data['examples'][0].get('sentence', 'N/A')}")
        if word_data.get('variants_detail', []):
            print(f"   变体: {[v['form'] for v in word_data['variants_detail']]}")
    else:
        print(f"❌ 错误: {word_response.status_code}, {word_response.text}")
    
    # 4. 测试查询 "don't" 单词
    print("4. 测试查询 'don't' 单词...")
    word_response = requests.get(f'http://localhost:8000/api/word/{file_id}/don%27t')
    
    if word_response.status_code == 200:
        word_data = word_response.json()
        print(f"✅ 成功查询到 'don't' 的详情:")
        print(f"   单词: {word_data.get('word', 'N/A')}")
        print(f"   释义: {word_data.get('meaning', 'N/A')}")
        print(f"   音标: {word_data.get('ipa', 'N/A')}")
        if word_data.get('examples', []):
            print(f"   示例: {word_data['examples'][0].get('sentence', 'N/A')}")
        if word_data.get('variants_detail', []):
            print(f"   变体: {[v['form'] for v in word_data['variants_detail']]}")
    else:
        print(f"❌ 错误: {word_response.status_code}, {word_response.text}")
    
    # 5. 测试查询普通单词 "good"
    print("5. 测试查询普通单词 'good'...")
    word_response = requests.get(f'http://localhost:8000/api/word/{file_id}/good')
    
    if word_response.status_code == 200:
        word_data = word_response.json()
        print(f"✅ 成功查询到 'good' 的详情:")
        print(f"   单词: {word_data.get('word', 'N/A')}")
        print(f"   释义: {word_data.get('meaning', 'N/A')}")
        print(f"   音标: {word_data.get('ipa', 'N/A')}")
        if word_data.get('examples', []):
            print(f"   示例: {word_data['examples'][0].get('sentence', 'N/A')}")
        if word_data.get('variants_detail', []):
            print(f"   变体: {[v['form'] for v in word_data['variants_detail']]}")
    else:
        print(f"❌ 错误: {word_response.status_code}, {word_response.text}")

if __name__ == "__main__":
    test_word_query()
