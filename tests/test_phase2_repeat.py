import requests
import time

def test_phase2_no_repetition():
    """Test that phase 2 fill-in-the-blank questions don't repeat"""
    BASE_URL = "http://localhost:8000"
    
    # 1. Process test text
    test_text = "holy fucking god"
    response = requests.post(f"{BASE_URL}/api/process-text", json={"text": test_text})
    assert response.status_code == 200
    file_id = response.json().get("file_id")
    assert file_id
    
    # 2. Wait for processing
    for i in range(60):
        time.sleep(1)
        status = requests.get(f"{BASE_URL}/api/status/{file_id}").json()
        if status.get("status") == "completed":
            break
    
    # 3. Reset phase 2 progress
    reset_response = requests.post(
        f"{BASE_URL}/api/{file_id}/phase/2/set-progress",
        json={"unit_id": 0, "exercise_index": 0, "exercise_type_index": 0}
    )
    assert reset_response.status_code == 200
    
    # 4. Get multiple exercises and check for repetition
    exercises = []
    for i in range(4):  # Get 4 exercises
        exercise_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        assert exercise_response.status_code == 200
        
        exercise_data = exercise_response.json()
        if exercise_data.get("unit_complete"):
            break
        
        exercises.append(exercise_data)
        
        # Move to next exercise
        next_response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
        assert next_response.status_code == 200
    
    # 5. Check for repetition
    exercise_types = [ex.get("exercise_type") for ex in exercises]
    print(f"Exercise types: {exercise_types}")
    
    # Should have both masked_sentence and translation_reconstruction
    assert "masked_sentence" in exercise_types
    assert "translation_reconstruction" in exercise_types
    
    # Check that we don't get the same exercise type repeatedly
    for i in range(1, len(exercise_types)):
        assert exercise_types[i] != exercise_types[i-1], f"Exercise type repeated: {exercise_types[i]}"
    
    print("✅ Phase 2 exercises don't repeat!")

if __name__ == "__main__":
    test_phase2_no_repetition()
