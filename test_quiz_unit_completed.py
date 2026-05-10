#!/usr/bin/env python3
"""
测试 generateSentenceQuiz 的 unit_completed 返回值
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_quiz_unit_completed():
    """测试 generateSentenceQuiz 的 unit_completed"""
    
    print("=" * 60)
    print("测试 generateSentenceQuiz 的 unit_completed")
    print("=" * 60)
    
    # 使用已有的文件
    file_id = "text_20260510_102006_175"
    print(f"\n使用文件: {file_id}")
    
    # Step 1: 获取词汇表
    print("\n1. 获取词汇表")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab = response.json().get("vocab", [])
    print(f"词汇数量: {len(vocab)}")
    
    # Step 2: 学习所有单词
    print("\n2. 学习所有单词")
    for i in range(len(vocab) + 5):
        response = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word", timeout=30)
        result = response.json()
        new_index = result.get("new_index")
        print(f"  学习单词 {i+1}: new_index={new_index}")
        if new_index is None or new_index >= len(vocab):
            break
    
    # Step 3: 检查 checkCoverage
    print("\n3. 检查 checkCoverage")
    response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    coverage = response.json()
    print(f"checkCoverage 返回:")
    print(f"  can_form_sentences: {coverage.get('can_form_sentences')}")
    print(f"  unit_completed: {coverage.get('unit_completed')}")
    
    # Step 4: 检查 generateSentenceQuiz
    print("\n4. 检查 generateSentenceQuiz")
    try:
        response = requests.get(f"{BASE_URL}/api/learn/{file_id}/sentence-quiz", timeout=30)
        quiz = response.json()
        print(f"generateSentenceQuiz 返回:")
        print(f"  exercise_type: {quiz.get('exercise_type')}")
        print(f"  unit_completed: {quiz.get('unit_completed')}")
        print(f"  完整响应: {json.dumps(quiz, indent=2, ensure_ascii=False)[:500]}")
    except Exception as e:
        print(f"generateSentenceQuiz 错误: {e}")
    
    # Step 5: 对比
    print("\n5. 对比结果")
    print(f"  checkCoverage.unit_completed = {coverage.get('unit_completed')}")
    print(f"  generateSentenceQuiz.unit_completed = {quiz.get('unit_completed') if 'quiz' in dir() else 'N/A'}")
    
    if coverage.get('unit_completed') != quiz.get('unit_completed'):
        print("\n⚠️ 警告: checkCoverage 和 generateSentenceQuiz 的 unit_completed 不一致!")
    else:
        print("\n✓ unit_completed 一致")

if __name__ == "__main__":
    test_quiz_unit_completed()
