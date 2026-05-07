#!/usr/bin/env python3
"""Test the complete flow for 'holy fucking god'"""
import requests
import time
import json

BASE_URL = "http://localhost:8000"
TEST_TEXT = "holy fucking god"

def test_complete_flow():
    """Test the complete flow from text processing to phase 2 exercises"""
    print("Testing complete flow for:", TEST_TEXT)
    print("=" * 60)
    
    # Step 1: Process text
    print("Step 1: Processing text...")
    response = requests.post(
        f"{BASE_URL}/api/process-text",
        json={"text": TEST_TEXT}
    )
    assert response.status_code == 200
    file_id = response.json().get("file_id")
    print(f"✓ Text processed successfully, file_id: {file_id}")
    
    # Wait for processing to complete
    print("Waiting for processing to complete...")
    time.sleep(10)
    
    # Step 2: Check processing status
    print("Step 2: Checking processing status...")
    response = requests.get(f"{BASE_URL}/api/status/{file_id}")
    assert response.status_code == 200
    status = response.json()
    assert status["status"] == "completed"
    print("✓ Processing completed successfully")
    
    # Step 3: Get vocab
    print("Step 3: Getting vocabulary...")
    response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    assert response.status_code == 200
    vocab = response.json().get("vocab", [])
    print(f"✓ Vocabulary retrieved: {len(vocab)} words")
    for word in vocab:
        print(f"  - {word['word']}: {word.get('context_meaning', 'No meaning')}")
    
    # Step 4: Get phases
    print("Step 4: Getting phases...")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phases")
    assert response.status_code == 200
    phases = response.json()
    print(f"✓ Phases retrieved: {len(phases['phases'])} phases")
    for phase in phases['phases']:
        print(f"  - Phase {phase['phase_number']}: {phase['name']} (Units: {phase['units_count']})")
    
    # Step 5: Get phase 1 units
    print("Step 5: Getting phase 1 units...")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    assert response.status_code == 200
    phase1_units = response.json()
    print(f"✓ Phase 1 units retrieved: {len(phase1_units['units'])} units")
    
    # Step 6: Get phase 2 units
    print("Step 6: Getting phase 2 units...")
    response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    assert response.status_code == 200
    phase2_units = response.json()
    print(f"✓ Phase 2 units retrieved: {len(phase2_units['units'])} units")
    
    # Step 7: Test phase 2 exercises
    print("Step 7: Testing phase 2 exercises...")
    if phase2_units['units']:
        unit_id = 0
        # Get first exercise
        response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}")
        assert response.status_code == 200
        first_exercise = response.json()
        print(f"✓ First exercise retrieved: {first_exercise['exercise_type']}")
        
        # Get next exercise
        response = requests.post(
            f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}/next",
            json={}
        )
        assert response.status_code == 200
        next_response = response.json()
        print(f"✓ Next exercise index: {next_response.get('new_exercise_index', 'Unit complete')}")
        
        # Get second exercise
        if "new_exercise_index" in next_response:
            response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}")
            assert response.status_code == 200
            second_exercise = response.json()
            print(f"✓ Second exercise retrieved: {second_exercise['exercise_type']}")
            
            # Verify different exercise types
            assert first_exercise['exercise_type'] != second_exercise['exercise_type'], "Exercises should be different types"
            print("✓ Different exercise types generated")
    
    print("=" * 60)
    print("✅ All tests passed! The complete flow is working correctly.")

if __name__ == "__main__":
    test_complete_flow()
