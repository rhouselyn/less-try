import requests
import time

BASE_URL = "http://localhost:8000"

# 测试用例：输入"hi bro"，学习语言为中文，母语为英文
def test_hi_bro_translation():
    print("=== 测试 'hi bro' 翻译问题 ===")
    
    # 1. 处理文本
    text = "hi bro"
    source_lang = "en"
    target_lang = "zh"
    
    print(f"输入文本: {text}")
    print(f"源语言: {source_lang}")
    print(f"目标语言: {target_lang}")
    
    response = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": text,
        "source_language": source_lang,
        "target_language": target_lang
    })
    
    if response.status_code != 200:
        print(f"错误: {response.status_code} - {response.text}")
        return False
    
    file_id = response.json().get("file_id")
    print(f"文件ID: {file_id}")
    
    # 2. 轮询处理状态
    max_polls = 60
    poll_count = 0
    
    while poll_count < max_polls:
        time.sleep(1)
        poll_count += 1
        
        status_response = requests.get(f"{BASE_URL}/api/status/{file_id}")
        if status_response.status_code != 200:
            print(f"状态查询错误: {status_response.status_code} - {status_response.text}")
            return False
        
        status_data = status_response.json()
        print(f"处理状态: {status_data.get('status')}, 进度: {status_data.get('progress', 0)}%")
        
        if status_data.get('status') == 'completed':
            break
    
    if status_data.get('status') != 'completed':
        print("处理未完成")
        return False
    
    # 3. 获取句子翻译
    sentences_response = requests.get(f"{BASE_URL}/api/sentences/{file_id}")
    if sentences_response.status_code != 200:
        print(f"获取句子翻译错误: {sentences_response.status_code} - {sentences_response.text}")
        return False
    
    sentences_data = sentences_response.json()
    print("\n句子翻译结果 (原始数据):")
    print(sentences_data)
    
    # 处理句子数据
    sentences = sentences_data.get('sentences', [])
    if isinstance(sentences, list):
        for i, item in enumerate(sentences):
            print(f"\n句子 {i+1}:")
            if isinstance(item, dict):
                print(f"原文: {item.get('sentence')}")
                if 'translation_result' in item:
                    print(f"翻译: {item['translation_result'].get('tokenized_translation', '无翻译')}")
            else:
                print(f"数据类型: {type(item)}, 内容: {item}")

    # 4. 获取词汇表
    vocab_response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    if vocab_response.status_code != 200:
        print(f"获取词汇表错误: {vocab_response.status_code} - {vocab_response.text}")
        return False
    
    vocab_data = vocab_response.json()
    print("\n词汇表 (原始数据):")
    print(vocab_data)
    
    # 处理词汇数据
    vocab = vocab_data.get('vocab', [])
    if isinstance(vocab, list):
        print("\n词汇表:")
        for word in vocab:
            if isinstance(word, dict):
                print(f"\n单词: {word.get('word')}")
                print(f"释义: {word.get('context_meaning')}")
                print(f"选项: {word.get('options', [])}")
            else:
                print(f"数据类型: {type(word)}, 内容: {word}")
    
    # 5. 获取学习数据
    unit_id = 0
    learn_response = requests.get(f"{BASE_URL}/api/learn/{file_id}/unit/{unit_id}")
    if learn_response.status_code != 200:
        print(f"获取学习数据错误: {learn_response.status_code} - {learn_response.text}")
        return False
    
    learn_data = learn_response.json()
    print("\n学习数据:")
    for i, word in enumerate(learn_data.get('words', [])):
        print(f"\n单词 {i+1}: {word.get('word')}")
        print(f"正确释义: {word.get('correct_meaning')}")
        print(f"选项: {word.get('options', [])}")
        print(f"记忆辅助: {word.get('memory_hint', '无')}")
    
    return True

if __name__ == "__main__":
    print("开始测试...")
    success = test_hi_bro_translation()
    print(f"\n测试结果: {'成功' if success else '失败'}")
