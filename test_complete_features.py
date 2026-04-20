
import requests
import time

BASE_URL = "http://localhost:8000"

def test_complete_features():
    print("=== 完整功能测试 ===")
    
    # Test 1: Process a long text
    print("\n1. 测试长文本处理...")
    test_text = """The quick brown fox jumps over the lazy dog. This is a longer sentence that contains multiple words for testing vocabulary extraction. Each word should be properly recognized and included in the vocabulary list. The system should handle sentences of varying lengths and complexity. Let's see if all words are captured correctly."""
    response = requests.post(
        f"{BASE_URL}/api/process-text",
        json={
            "text": test_text,
            "source_language": "en",
            "target_language": "zh"
        }
    )
    print(f"响应状态: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        file_id = data["file_id"]
        print(f"文件ID: {file_id}")
        
        # Wait for processing
        print("等待处理完成...")
        time.sleep(10)
        
        # Test 2: Check vocabulary list
        print("\n2. 测试词汇表...")
        vocab_response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
        print(f"词汇表状态: {vocab_response.status_code}")
        if vocab_response.status_code == 200:
            vocab_data = vocab_response.json()
            print(f"词汇数量: {len(vocab_data['vocab'])}")
            print("词汇列表:")
            for i, word in enumerate(vocab_data['vocab'][:10]):  # Show first 10
                print(f"{i+1}. {word['word']}: {word['context_meaning']}")
            if len(vocab_data['vocab']) > 10:
                print(f"... 还有 {len(vocab_data['vocab']) - 10} 个单词")
        
        # Test 3: Test phase 2 exercises
        print("\n3. 测试第二阶段练习...")
        
        # Get phases
        phases_response = requests.get(f"{BASE_URL}/api/{file_id}/phases")
        print(f"阶段状态: {phases_response.status_code}")
        if phases_response.status_code == 200:
            phases_data = phases_response.json()
            print("阶段信息:")
            for phase in phases_data['phases']:
                print(f"  阶段 {phase['phase_number']}: {phase['name']} - {phase['units_count']} 单元")
        
        # Get phase 2 units
        phase2_units_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
        print(f"第二阶段单元状态: {phase2_units_response.status_code}")
        if phase2_units_response.status_code == 200:
            phase2_units_data = phase2_units_response.json()
            print(f"第二阶段单元数: {len(phase2_units_data['units'])}")
            
            # Test phase 2 exercises
            if phase2_units_data['units']:
                print("\n测试第二阶段练习...")
                for i in range(3):  # Test 3 exercises
                    exercise_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
                    print(f"练习 {i+1} 状态: {exercise_response.status_code}")
                    if exercise_response.status_code == 200:
                        exercise_data = exercise_response.json()
                        print(f"  练习类型: {exercise_data['exercise_type']}")
                        if exercise_data['exercise_type'] == 'masked_sentence':
                            print(f"  原始句子: {exercise_data['data']['original_sentence']}")
                            print(f"  蒙版句子: {exercise_data['data']['masked_sentence']}")
                            print(f"  答案: {exercise_data['data']['answer_words']}")
                        elif exercise_data['exercise_type'] == 'translation_reconstruction':
                            print(f"  母语翻译: {exercise_data['data']['native_translation']}")
                            print(f"  原始tokens: {exercise_data['data']['original_tokens']}")
                    
                    # Move to next exercise
                    next_response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
                    if next_response.status_code == 200:
                        next_data = next_response.json()
                        if next_data.get('unit_complete'):
                            print("单元完成！")
                            break
                    time.sleep(1)
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    try:
        test_complete_features()
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
