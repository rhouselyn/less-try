def test_llm_temperature_is_zero():
    """Test that LLM temperature is set to 0 for consistent results"""
    import requests
    import json
    
    # Create a test file with consistent text
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
    
    # Get vocab
    response = requests.get(f"http://localhost:8000/api/vocab/{file_id}")
    assert response.status_code == 200
    vocab = response.json().get("vocab", [])
    assert len(vocab) > 0, "No vocab generated"
    
    # Get the same word twice to check consistency
    word = vocab[0]["word"]
    responses = []
    for i in range(2):
        response = requests.get(f"http://localhost:8000/api/word/{file_id}/{word}")
        assert response.status_code == 200
        word_data = response.json()
        responses.append(word_data)
    
    # Verify both responses are identical
    assert responses[0]["word"] == responses[1]["word"], "Word differs"
    assert responses[0]["meaning"] == responses[1]["meaning"], "Meaning differs"
    assert len(responses[0]["examples"]) == len(responses[1]["examples"]), "Examples count differs"
