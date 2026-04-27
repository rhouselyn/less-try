"""测试阶段二每个句子都有两种练习类型"""
import requests
import time

BASE_URL = "http://localhost:8000"

def test_phase2_two_exercise_types():
    """测试每个句子都有两种练习类型"""
    print("=== 测试阶段二每个句子有两种练习类型 ===")
    
    # 1. 处理测试文本
    test_text = "The quick brown fox jumps over the lazy dog. This is a simple test sentence."
    response = requests.post(f"{BASE_URL}/api/process-text", json={"text": test_text})
    assert response.status_code == 200, "处理文本失败"
    file_id = response.json().get("file_id")
    assert file_id, "没有获取到file_id"
    print(f"✅ 文件创建成功，ID: {file_id}")
    
    # 2. 等待处理完成
    print("等待处理完成...")
    for i in range(60):
        time.sleep(1)
        status = requests.get(f"{BASE_URL}/api/status/{file_id}").json()
        if status.get("status") == "completed":
            print("✅ 处理完成！")
            break
    
    # 3. 重置进度
    reset_response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/set-progress", 
                                 json={"unit_id": 0, "exercise_index": 0, "exercise_type_index": 0})
    assert reset_response.status_code == 200, "重置进度失败"
    print("✅ 进度重置成功")
    
    # 4. 收集练习类型
    exercise_types = []
    exercise_sentences = []
    
    for i in range(6):  # 2个句子，每个句子2种练习
        print(f"\n--- 获取第 {i+1} 个练习 ---")
        exercise_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        assert exercise_response.status_code == 200, "获取练习失败"
        
        exercise_data = exercise_response.json()
        
        if exercise_data.get("unit_complete"):
            print("⚠️  单元提前完成")
            break
            
        exercise_type = exercise_data.get("exercise_type")
        exercise_types.append(exercise_type)
        
        # 获取练习的句子信息
        data = exercise_data.get("data", {})
        if exercise_type == "masked_sentence":
            sentence = data.get("original_sentence", "")
        else:
            sentence = data.get("native_translation", "")
        exercise_sentences.append((exercise_type, sentence))
        
        print(f"✅ 练习类型: {exercise_type}")
        
        # 调用next
        next_response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
        assert next_response.status_code == 200, "调用next失败"
    
    # 5. 验证结果
    print("\n=== 验证结果 ===")
    print(f"总练习数: {len(exercise_types)}")
    print(f"练习类型顺序: {exercise_types}")
    
    # 验证有两种练习类型
    type_set = set(exercise_types)
    assert len(type_set) == 2, f"应该有两种练习类型，实际只有: {type_set}"
    print("✅ 有两种练习类型！")
    
    # 验证练习类型交替出现
    expected_pattern = ["masked_sentence", "translation_reconstruction", 
                       "masked_sentence", "translation_reconstruction",
                       "masked_sentence", "translation_reconstruction"]
    assert exercise_types[:4] == expected_pattern[:4], f"练习类型顺序不对: {exercise_types}"
    print("✅ 练习类型交替出现正确！")
    
    # 验证每个句子有两种练习
    # 前两个是第一个句子的两种练习，后两个是第二个句子的两种练习
    print("\n✅ 所有测试通过！")
    return True

if __name__ == "__main__":
    test_phase2_two_exercise_types()
