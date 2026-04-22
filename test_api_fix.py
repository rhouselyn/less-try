import requests
import time

BASE_URL = "http://localhost:8000"
FILE_ID = "text_20260422_072122_331"

def test_check_coverage():
    """测试覆盖度检查API"""
    print("\n=== 测试覆盖度检查 ===")
    
    # 首先设置学习进度为2（已学2个单词）
    set_progress_url = f"{BASE_URL}/api/learn/{FILE_ID}/set-progress"
    response = requests.post(set_progress_url, json={"index": 2})
    print(f"设置学习进度响应: {response.status_code}")
    print(f"响应内容: {response.text}")
    
    # 等待一下
    time.sleep(0.5)
    
    # 测试覆盖度检查
    check_url = f"{BASE_URL}/api/learn/{FILE_ID}/check-coverage"
    response = requests.get(check_url)
    print(f"覆盖度检查响应: {response.status_code}")
    print(f"响应内容: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"can_form_sentences: {data.get('can_form_sentences')}")
        print(f"unit_completed: {data.get('unit_completed')}")
        
        if data.get('can_form_sentences'):
            print("\n✅ 覆盖度检查成功！可以生成句子翻译题！")
            return True
    
    print("\n❌ 覆盖度检查失败！")
    return False

def test_sentence_quiz():
    """测试句子翻译题生成API"""
    print("\n=== 测试句子翻译题生成 ===")
    
    quiz_url = f"{BASE_URL}/api/learn/{FILE_ID}/sentence-quiz"
    response = requests.get(quiz_url)
    print(f"句子翻译题响应: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"原文: {data.get('original_sentence')}")
        print(f"正确翻译: {data.get('correct_translation')}")
        print(f"正确tokens: {data.get('correct_tokens')}")
        print(f"所有选项tokens: {data.get('tokens')}")
        print("\n✅ 句子翻译题生成成功！")
        return True
    
    print(f"响应内容: {response.text}")
    print("\n❌ 句子翻译题生成失败！")
    return False

def test_get_vocab():
    """测试获取词汇表API"""
    print("\n=== 测试获取词汇表 ===")
    
    vocab_url = f"{BASE_URL}/api/vocab/{FILE_ID}"
    response = requests.get(vocab_url)
    print(f"词汇表响应: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"词汇表长度: {len(data.get('vocab', []))}")
        for i, word in enumerate(data.get('vocab', [])):
            print(f"{i+1}. {word.get('word')}")
        print("\n✅ 词汇表获取成功！")
        return True
    
    print(f"响应内容: {response.text}")
    print("\n❌ 词汇表获取失败！")
    return False

def test_get_sentences():
    """测试获取句子API"""
    print("\n=== 测试获取句子 ===")
    
    sentences_url = f"{BASE_URL}/api/sentences/{FILE_ID}"
    response = requests.get(sentences_url)
    print(f"句子响应: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"句子数量: {len(data.get('sentences', []))}")
        for i, sent in enumerate(data.get('sentences', [])):
            print(f"{i+1}. {sent.get('sentence')}")
        print("\n✅ 句子获取成功！")
        return True
    
    print(f"响应内容: {response.text}")
    print("\n❌ 句子获取失败！")
    return False

if __name__ == "__main__":
    print("=== 开始测试API修复 ===")
    
    # 测试获取词汇表
    test_get_vocab()
    
    # 测试获取句子
    test_get_sentences()
    
    # 测试覆盖度检查
    if test_check_coverage():
        # 测试句子翻译题生成
        test_sentence_quiz()
    
    print("\n=== 测试完成 ===")
