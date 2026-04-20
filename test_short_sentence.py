
import requests
import time

BASE_URL = "http://localhost:8000"

def test_short_sentence():
    print("Testing with short sentence...")
    test_text = "Hello world. This is a short sentence."
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
        time.sleep(5)
        
        # Test phase 2 units
        print("\nTesting phase 2 units API...")
        phase2_units_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
        print(f"Phase 2 units status: {phase2_units_response.status_code}")
        if phase2_units_response.status_code == 200:
            print("Phase 2 units data received!")
            print(phase2_units_response.json())
            
            # Test get phase 2 unit exercise (should handle short sentences gracefully)
            print("\nTesting phase 2 unit exercise API...")
            exercise_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
            print(f"Exercise status: {exercise_response.status_code}")
            if exercise_response.status_code == 200:
                print("Exercise data received!")
                print(exercise_response.json())

if __name__ == "__main__":
    try:
        test_short_sentence()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
