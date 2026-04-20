
import requests
import time

BASE_URL = "http://localhost:8000"

def test_exercise():
    print("Testing translation reconstruction exercise...")
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
        
        # First, call next exercise once to get to index 1
        print("Calling next exercise to get to index 1...")
        next_response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
        print(f"Next response status: {next_response.status_code}")
        
        # Now get exercise
        print("Getting exercise at index 1...")
        exercise_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        print(f"Exercise status: {exercise_response.status_code}")
        if exercise_response.status_code == 200:
            print("Exercise data received!")
            print(exercise_response.json())

if __name__ == "__main__":
    try:
        test_exercise()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
