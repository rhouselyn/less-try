def test_phase2_questions_not_duplicate():
    """Test that phase 2 questions are not duplicate"""
    import requests
    import json
    
    # Create a test file
    test_text = "holy fucking god"
    
    # Process the text
    response = requests.post(
        "http://localhost:8000/api/process-text",
        json={"text": test_text}
    )
    assert response.status_code == 200
    
    # Get the file_id from the response
    file_id = response.json().get("file_id")
    assert file_id, "No file_id in response"
    
    # Wait for processing to complete
    import time
    time.sleep(5)
    
    # Get phase 2 units
    response = requests.get(f"http://localhost:8000/api/{file_id}/phase/2/units")
    assert response.status_code == 200
    units = response.json()
    
    # Get first unit's exercises
    unit_id = 0
    response = requests.get(f"http://localhost:8000/api/{file_id}/phase/2/unit/{unit_id}")
    assert response.status_code == 200
    first_exercise = response.json()
    
    # Get next exercise index
    response = requests.post(
        f"http://localhost:8000/api/{file_id}/phase/2/unit/{unit_id}/next",
        json={}
    )
    assert response.status_code == 200
    next_response = response.json()
    
    # Get the next exercise using the new index
    if "new_exercise_index" in next_response:
        new_index = next_response["new_exercise_index"]
        response = requests.get(f"http://localhost:8000/api/{file_id}/phase/2/unit/{unit_id}")
        assert response.status_code == 200
        second_exercise = response.json()
        
        # Verify exercises are different
        assert first_exercise["data"]["sentence"] != second_exercise["data"]["sentence"]
        # Verify both exercise types are used
        assert first_exercise["exercise_type"] != second_exercise["exercise_type"]
