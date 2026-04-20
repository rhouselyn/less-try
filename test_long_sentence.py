
import requests
import time

BASE_URL = "http://localhost:8000"

def test_long_sentence():
    print("Testing with long sentence...")
    # Long test text with many words
    test_text = """The quick brown fox jumps over the lazy dog. This is a longer sentence with more words to test the vocabulary list. I want to see if all words are included in the word list. The fox is very quick and the dog is very lazy. They are both animals that live in different environments."""
    response = requests.post(
        f"{BASE_URL}/api/process-text",
        json={
            "text": test_text,
            "source_language": "en",
            "target_language": "zh"
        }
    )
    print(f"Response status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        file_id = data["file_id"]
        print(f"File ID: {file_id}")
        
        # Wait a bit for processing
        print("Waiting for processing...")
        time.sleep(10)
        
        # Check status
        status_response = requests.get(f"{BASE_URL}/api/status/{file_id}")
        print(f"Status status: {status_response.status_code}")
        if status_response.status_code == 200:
            status_data = status_response.json()
            print(f"Status: {status_data['status']}")
            
            if status_data["status"] == "completed":
                # Check vocab list
                print("\nTesting vocab list...")
                vocab_response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
                print(f"Vocab status: {vocab_response.status_code}")
                if vocab_response.status_code == 200:
                    vocab_data = vocab_response.json()
                    vocab_list = vocab_data.get("vocab", [])
                    print(f"Vocab count: {len(vocab_list)}")
                    print("Vocab words:")
                    for word in vocab_list:
                        print(f"- {word['word']}: {word['context_meaning']}")
                
                # Test phase 2 units
                print("\nTesting phase 2 units API...")
                phase2_units_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
                print(f"Phase 2 units status: {phase2_units_response.status_code}")
                if phase2_units_response.status_code == 200:
                    print("Phase 2 units data received!")
                    print(phase2_units_response.json())
                    
                    units = phase2_units_response.json()["units"]
                    if units:
                        # Test get phase 2 unit exercise
                        print("\nTesting phase 2 unit exercise API...")
                        exercise_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
                        print(f"Exercise status: {exercise_response.status_code}")
                        if exercise_response.status_code == 200:
                            print("Exercise data received!")
                            exercise_data = exercise_response.json()
                            print(f"Exercise type: {exercise_data['exercise_type']}")
                            print(f"Exercise data: {exercise_data['data']}")

if __name__ == "__main__":
    try:
        test_long_sentence()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
