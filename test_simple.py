
import requests
import time

BASE_URL = "http://localhost:8000"

def test_simple():
    print("=== 简单功能测试 ===")
    
    # Test text
    test_text = "Hello world. This is a test."
    
    # Process text
    print("1. 处理文本...")
    response = requests.post(
        f"{BASE_URL}/api/process-text",
        json={
            "text": test_text,
            "source_language": "en",
            "target_language": "zh"
        }
    )
    print(f"状态: {response.status_code}")
    
    if response.status_code == 200:
        file_id = response.json()["file_id"]
        print(f"文件ID: {file_id}")
        
        # Wait
        time.sleep(5)
        
        # Test vocabulary
        print("2. 获取词汇表...")
        vocab_response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
        if vocab_response.status_code == 200:
            vocab = vocab_response.json()["vocab"]
            print(f"词汇数量: {len(vocab)}")
        
        # Test phases
        print("3. 获取阶段...")
        phases_response = requests.get(f"{BASE_URL}/api/{file_id}/phases")
        if phases_response.status_code == 200:
            phases = phases_response.json()["phases"]
            print(f"阶段数量: {len(phases)}")
        
        # Test phase 2 exercises
        print("4. 测试第二阶段练习...")
        exercise_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        if exercise_response.status_code == 200:
            exercise = exercise_response.json()
            print(f"练习类型: {exercise.get('exercise_type')}")
    
    print("=== 测试完成 ===")

if __name__ == "__main__":
    test_simple()
