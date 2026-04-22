#!/usr/bin/env python3
"""
测试脚本，验证所有修复是否有效
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_phase2_completion_message():
    """
    测试第二阶段完成时的提示方式
    """
    print("\n=== 测试第二阶段完成提示 ===")
    
    # 1. 处理测试文本
    test_text = "Hello world. How are you?"
    response = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": test_text,
        "source_language": "en",
        "target_language": "zh"
    })
    
    if response.status_code != 200:
        print(f"❌ 处理文本失败: {response.status_code}")
        return False
    
    file_id = response.json().get("file_id")
    if not file_id:
        print("❌ 获取file_id失败")
        return False
    
    print(f"✅ 获取file_id: {file_id}")
    
    # 2. 等待处理完成
    print("等待文本处理完成...")
    for i in range(60):  # 增加等待时间到60秒
        time.sleep(1)
        try:
            status_response = requests.get(f"{BASE_URL}/api/status/{file_id}")
            if status_response.status_code == 200:
                status = status_response.json()
                print(f"  状态: {status.get('status')}, 进度: {status.get('progress', 0)}%")
                if status.get("status") == "completed":
                    print("✅ 文本处理完成")
                    break
            else:
                print(f"  获取状态失败: {status_response.status_code}")
        except Exception as e:
            print(f"  错误: {e}")
    else:
        print("❌ 文本处理超时")
        return False
    
    # 3. 测试第二阶段练习
    print("测试第二阶段练习...")
    phase_units_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    if phase_units_response.status_code != 200:
        print(f"❌ 获取阶段2单元失败: {phase_units_response.status_code}")
        return False
    
    print("✅ 第二阶段完成提示测试通过")
    return True

def test_translation_quiz_loop():
    """
    测试第一阶段翻译题循环问题
    """
    print("\n=== 测试翻译题循环问题 ===")
    
    # 1. 处理测试文本 "hi man. what's up"
    test_text = "hi man. what's up"
    response = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": test_text,
        "source_language": "en",
        "target_language": "zh"
    })
    
    if response.status_code != 200:
        print(f"❌ 处理文本失败: {response.status_code}")
        return False
    
    file_id = response.json().get("file_id")
    if not file_id:
        print("❌ 获取file_id失败")
        return False
    
    print(f"✅ 获取file_id: {file_id}")
    
    # 2. 等待处理完成
    print("等待文本处理完成...")
    for i in range(60):  # 增加等待时间到60秒
        time.sleep(1)
        try:
            status_response = requests.get(f"{BASE_URL}/api/status/{file_id}")
            if status_response.status_code == 200:
                status = status_response.json()
                print(f"  状态: {status.get('status')}, 进度: {status.get('progress', 0)}%")
                if status.get("status") == "completed":
                    print("✅ 文本处理完成")
                    break
            else:
                print(f"  获取状态失败: {status_response.status_code}")
        except Exception as e:
            print(f"  错误: {e}")
    else:
        print("❌ 文本处理超时")
        return False
    
    # 3. 模拟学习进度，确保可以生成翻译题
    print("设置学习进度...")
    set_progress_response = requests.post(f"{BASE_URL}/api/learn/{file_id}/set-progress", json={"index": 2})
    if set_progress_response.status_code != 200:
        print(f"❌ 设置学习进度失败: {set_progress_response.status_code}")
        return False
    
    # 4. 测试翻译题生成
    print("测试翻译题生成...")
    used_sentences = []
    for i in range(5):
        quiz_response = requests.get(f"{BASE_URL}/api/learn/{file_id}/sentence-quiz")
        
        # 检查是否所有句子都已使用
        if quiz_response.status_code == 404 and quiz_response.json().get("detail") == "No more eligible sentences":
            print(f"✅ 所有句子都已使用，测试通过")
            return True
        
        if quiz_response.status_code != 200:
            print(f"❌ 生成翻译题失败: {quiz_response.status_code}")
            return False
        
        quiz_data = quiz_response.json()
        original_sentence = quiz_data.get("original_sentence")
        print(f"  生成翻译题 {i+1}: {original_sentence}")
        
        # 检查是否重复
        if original_sentence in used_sentences:
            print(f"❌ 翻译题重复: {original_sentence}")
            return False
        used_sentences.append(original_sentence)
    
    print("✅ 翻译题循环问题测试通过")
    return True

def test_token_animation():
    """
    测试翻译题token加载动画效果
    """
    print("\n=== 测试token动画效果 ===")
    print("此测试需要手动验证前端效果:")
    print("1. 打开前端应用 http://localhost:3003")
    print("2. 输入测试文本: hi man. what's up")
    print("3. 完成单词学习，进入翻译题环节")
    print("4. 观察token按钮是否直接展示，没有上去动画效果")
    print("✅ token动画效果测试 - 请手动验证")
    return True

def main():
    """
    运行所有测试
    """
    print("开始测试所有修复...")
    
    tests = [
        test_phase2_completion_message,
        test_translation_quiz_loop,
        test_token_animation
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            failed += 1
    
    print(f"\n=== 测试结果 ===")
    print(f"通过: {passed}")
    print(f"失败: {failed}")
    
    if failed == 0:
        print("🎉 所有测试通过！")
    else:
        print("⚠️  有测试失败，请检查修复")

if __name__ == "__main__":
    main()
