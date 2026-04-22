#!/usr/bin/env python3
"""
测试脚本，验证修复是否有效
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_text_processing():
    """测试文本处理功能"""
    print("=== 测试文本处理 ===")
    
    test_text = "I'm good, don't worry."
    
    # 提交文本处理请求
    response = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": test_text,
        "source_language": "en",
        "target_language": "zh"
    })
    
    if response.status_code != 200:
        print(f"文本处理请求失败: {response.status_code}")
        return None
    
    data = response.json()
    file_id = data.get("file_id")
    print(f"文件ID: {file_id}")
    
    # 等待处理完成
    print("等待处理完成...")
    for i in range(30):
        status_response = requests.get(f"{BASE_URL}/api/status/{file_id}")
        status_data = status_response.json()
        if status_data.get("status") == "completed":
            print("处理完成!")
            break
        elif status_data.get("status") == "error":
            print(f"处理出错: {status_data.get('error')}")
            return None
        time.sleep(1)
    else:
        print("处理超时")
        return None
    
    return file_id

def test_word_details(file_id):
    """测试单词详情查询"""
    print("\n=== 测试单词详情查询 ===")
    
    # 测试查询 "I'm"
    word = "I'm"
    response = requests.get(f"{BASE_URL}/api/word/{file_id}/{word}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"查询单词 '{word}' 成功!")
        print(f"单词: {data.get('word')}")
        print(f"释义: {data.get('meaning')}")
        print(f"例句: {data.get('examples', [])}")
    else:
        print(f"查询单词 '{word}' 失败: {response.status_code}")
        print(response.text)
    
    # 测试查询 "good"
    word = "good"
    response = requests.get(f"{BASE_URL}/api/word/{file_id}/{word}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n查询单词 '{word}' 成功!")
        print(f"单词: {data.get('word')}")
        print(f"释义: {data.get('meaning')}")
        print(f"例句: {data.get('examples', [])}")
    else:
        print(f"\n查询单词 '{word}' 失败: {response.status_code}")
        print(response.text)

def test_sentence_exercises(file_id):
    """测试句子练习"""
    print("\n=== 测试句子练习 ===")
    
    # 首先完成一些单词学习，以便能够生成句子练习
    print("完成单词学习...")
    for i in range(5):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        if response.status_code != 200:
            print(f"更新学习进度失败: {response.status_code}")
            break
        time.sleep(0.5)
    
    # 检查是否可以生成句子练习
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    if response.status_code == 200:
        data = response.json()
        print(f"是否可以生成句子练习: {data.get('can_form_sentences')}")
    
    # 获取阶段信息
    response = requests.get(f"{BASE_URL}/api/{file_id}/phases")
    if response.status_code == 200:
        data = response.json()
        print(f"阶段数量: {len(data.get('phases', []))}")
    
    # 测试阶段2的练习
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
    if response.status_code == 200:
        data = response.json()
        print(f"\n练习类型: {data.get('exercise_type')}")
        
        if data.get('exercise_type') == 'masked_sentence':
            exercise_data = data.get('data', {})
            print(f"原始句子: {exercise_data.get('original_sentence')}")
            print(f"蒙版句子: {exercise_data.get('masked_sentence')}")
            print(f"正确答案: {exercise_data.get('answer_words')}")
            print(f"选项: {exercise_data.get('options')}")
            
            # 检查选项是否包含当前句子的单词
            original_sentence = exercise_data.get('original_sentence', '').lower()
            options = exercise_data.get('options', [])
            current_sentence_words = set()
            
            # 简单提取句子中的单词
            import re
            current_sentence_words = set(re.findall(r"\b\w+(?:'\w+)?\b", original_sentence))
            
            print(f"\n当前句子中的单词: {current_sentence_words}")
            
            # 检查选项中是否包含当前句子的单词
            for option in options:
                option_lower = option.lower()
                if option_lower in current_sentence_words:
                    print(f"警告: 选项 '{option}' 来自当前句子!")
                else:
                    print(f"选项 '{option}' 来自其他句子或词库")
    else:
        print(f"获取练习失败: {response.status_code}")
        print(response.text)

def main():
    """主测试函数"""
    print("开始测试修复效果...")
    
    # 测试1: 文本处理
    file_id = test_text_processing()
    if not file_id:
        print("测试失败: 文本处理失败")
        return
    
    # 测试2: 单词详情查询
    test_word_details(file_id)
    
    # 测试3: 句子练习
    test_sentence_exercises(file_id)
    
    print("\n测试完成!")

if __name__ == "__main__":
    main()
