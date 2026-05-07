#!/usr/bin/env python3
"""详细测试第二阶段练习重复问题"""
import requests
import time
import json

BASE_URL = "http://localhost:8000"
# 使用更长的测试文本，包含多个句子
TEST_TEXT = """The quick brown fox jumps over the lazy dog. This is a simple test sentence. Learning English can be fun and rewarding. Practice makes perfect. Let's continue our learning journey."""

def test_phase2_exercises():
    """详细测试第二阶段练习"""
    print("=== 详细测试第二阶段练习 ===")
    print(f"测试文本: {TEST_TEXT}")
    print("=" * 60)
    
    # 步骤1：处理文本
    print("\n1. 处理文本...")
    response = requests.post(
        f"{BASE_URL}/api/process-text",
        json={"text": TEST_TEXT}
    )
    assert response.status_code == 200, f"处理文本失败: {response.status_code}"
    file_id = response.json().get("file_id")
    print(f"文件ID: {file_id}")
    
    # 等待处理完成
    print("\n2. 等待处理完成...")
    max_attempts = 60
    for i in range(max_attempts):
        time.sleep(2)
        try:
            status_response = requests.get(f"{BASE_URL}/api/status/{file_id}")
            if status_response.status_code == 200:
                status = status_response.json()
                print(f"进度: {status.get('progress', 0)}%, 状态: {status.get('status')}")
                if status.get("status") == "completed":
                    print("处理完成!")
                    break
        except Exception as e:
            print(f"检查状态出错: {e}")
    else:
        print("处理超时!")
        return
    
    # 获取处理好的数据
    print("\n3. 获取处理数据...")
    vocab_response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    assert vocab_response.status_code == 200
    vocab = vocab_response.json().get("vocab", [])
    print(f"词汇表大小: {len(vocab)}")
    
    sentences_response = requests.get(f"{BASE_URL}/api/sentences/{file_id}")
    assert sentences_response.status_code == 200
    sentences = sentences_response.json().get("sentences", [])
    print(f"句子数量: {len(sentences)}")
    for i, s in enumerate(sentences):
        print(f"  句子{i+1}: {s.get('sentence')}")
    
    # 获取阶段二单元
    print("\n4. 获取阶段二单元...")
    phase2_units_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    assert phase2_units_response.status_code == 200
    phase2_units = phase2_units_response.json()
    print(f"阶段二单元数量: {len(phase2_units.get('units', []))}")
    
    # 详细测试第一个单元的练习
    print("\n5. 详细测试第一个单元的练习...")
    exercise_types = []
    sentences_used = []
    
    # 获取多个练习
    for i in range(10):
        print(f"\n--- 获取第 {i+1} 个练习 ---")
        try:
            exercise_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
            
            if exercise_response.status_code == 200:
                exercise_data = exercise_response.json()
                
                if exercise_data.get("unit_complete"):
                    print("单元完成!")
                    break
                
                exercise_type = exercise_data.get("exercise_type")
                exercise_types.append(exercise_type)
                
                data = exercise_data.get("data", {})
                if exercise_type == "masked_sentence":
                    sentence = data.get("masked_sentence")
                else:
                    sentence = data.get("native_translation")
                sentences_used.append(sentence)
                
                print(f"练习类型: {exercise_type}")
                print(f"内容: {sentence}")
                
                # 下一个练习
                print(f"调用下一个练习...")
                next_response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
                print(f"下一个练习响应: {next_response.status_code}")
                
            else:
                print(f"获取练习失败: {exercise_response.status_code}")
                print(f"响应内容: {exercise_response.text}")
                break
                
        except Exception as e:
            print(f"出错: {e}")
            import traceback
            traceback.print_exc()
            break
    
    # 统计结果
    print("\n" + "=" * 60)
    print("结果统计:")
    print(f"总练习数: {len(exercise_types)}")
    
    type_counts = {}
    for t in exercise_types:
        type_counts[t] = type_counts.get(t, 0) + 1
    print(f"练习类型分布: {type_counts}")
    
    # 检查问题
    has_both_types = len(type_counts) == 2
    print(f"是否有两种练习类型: {'是' if has_both_types else '否'}")
    
    if not has_both_types:
        print("\n⚠️  发现问题: 只有一种练习类型!")
        
    return {
        "file_id": file_id,
        "exercise_types": exercise_types,
        "has_both_types": has_both_types
    }

if __name__ == "__main__":
    test_phase2_exercises()
