
import requests
import time

BASE_URL = "http://localhost:8000"

def test_process_text():
    print("Testing text processing...")
    test_text = """The quick brown fox jumps over the lazy dog. This is a simple test sentence for our learning application. It has more than eight words so we can test the masked sentence exercise."""
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
                # Test phases API
                print("\nTesting phases API...")
                phases_response = requests.get(f"{BASE_URL}/api/{file_id}/phases")
                print(f"Phases status: {phases_response.status_code}")
                if phases_response.status_code == 200:
                    print("Phases data received!")
                    print(phases_response.json())
                
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
                            print(exercise_response.json())
        
        return file_id
    return None

if __name__ == "__main__":
    try:
        test_process_text()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
