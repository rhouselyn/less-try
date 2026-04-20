
import requests
import time

BASE_URL = "http://localhost:8000"

def test_long_sentence():
    print("Testing with long sentence...")
    test_text = """The quick brown fox jumps over the lazy dog. This is a longer sentence that contains multiple words for testing vocabulary extraction. Each word should be properly recognized and included in the vocabulary list. The system should handle sentences of varying lengths and complexity. Let's see if all words are captured correctly."""
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
        
        # Wait for processing
        print("Waiting for processing...")
        time.sleep(10)
        
        # Get vocabulary
        print("\nGetting vocabulary...")
        vocab_response = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
        print(f"Vocab status: {vocab_response.status_code}")
        if vocab_response.status_code == 200:
            vocab_data = vocab_response.json()
            print(f"Vocabulary count: {len(vocab_data['vocab'])}")
            print("Vocabulary list:")
            for word in vocab_data['vocab']:
                print(f"- {word['word']}: {word['context_meaning']}")

if __name__ == "__main__":
    try:
        test_long_sentence()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
