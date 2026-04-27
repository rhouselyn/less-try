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
    for i in range(60):
        time.sleep(1)
        status = requests.get(f"{BASE_URL}/api/status/{file_id}").json()
        if status.get("status") == "completed":
            print("✓ Processing completed successfully")
            break
    
    # Step 2: Check LLM output format
    print("Step 2: Checking LLM output format...")
    sentences = requests.get(f"{BASE_URL}/api/sentences/{file_id}").json().get("sentences", [])
    assert len(sentences) > 0
    
    sentence_data = sentences[0]
    translation_result = sentence_data.get("translation_result", {})
    
    # Check tokenized_translation format
    tokenized_translation = translation_result.get("tokenized_translation", "")
    assert "/" not in tokenized_translation, f"tokenized_translation should not contain /: {tokenized_translation}"
    print(f"✓ tokenized_translation format correct: {tokenized_translation}")
    
    # Check translation array
    translation = translation_result.get("translation", [])
    assert isinstance(translation, list)
    assert len(translation) > 0
    for token in translation:
        assert "translation" in token
        assert "/" not in token["translation"], f"translation should not contain /: {token['translation']}"
    print("✓ translation array format correct")
    
    # Step 3: Check vocabulary format
    print("Step 3: Checking vocabulary format...")
    vocab = requests.get(f"{BASE_URL}/api/vocab/{file_id}").json().get("vocab", [])
    assert len(vocab) > 0
    
    for entry in vocab:
        # Check required fields are present
        assert "word" in entry
        assert "tokens" in entry
        assert "variants" in entry
        assert "ipa" in entry
        assert "context_meaning" in entry
        assert "examples" in entry
        assert "options" in entry
        assert "grammar" in entry
        assert "morphology" in entry
        
        # Check no redundant translation field
        assert "translation" not in entry, "dictionary entries should not have translation field"
    print("✓ Vocabulary format correct")
    
    # Step 4: Test phase 2 exercises
    print("Step 4: Testing phase 2 exercises...")
    
    # Reset progress
    reset_response = requests.post(
        f"{BASE_URL}/api/{file_id}/phase/2/set-progress",
        json={"unit_id": 0, "exercise_index": 0, "exercise_type_index": 0}
    )
    assert reset_response.status_code == 200
    
    # Get exercises
    exercise_types = []
    for i in range(4):
        exercise_response = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        assert exercise_response.status_code == 200
        
        exercise_data = exercise_response.json()
        if exercise_data.get("unit_complete"):
            break
        
        exercise_type = exercise_data.get("exercise_type")
        exercise_types.append(exercise_type)
        print(f"  Exercise {i+1}: {exercise_type}")
        
        # Move to next
        next_response = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next")
        assert next_response.status_code == 200
    
    # Verify both exercise types
    assert "masked_sentence" in exercise_types
    assert "translation_reconstruction" in exercise_types
    print("✓ Both exercise types present")
    
    # Verify no repetition
    for i in range(1, len(exercise_types)):
        assert exercise_types[i] != exercise_types[i-1], f"Exercise type repeated: {exercise_types[i]}"
    print("✓ No exercise repetition")
    
    print("=" * 60)
    print("✅ All tests passed! The complete flow is working correctly.")

if __name__ == "__main__":
    test_complete_flow()
