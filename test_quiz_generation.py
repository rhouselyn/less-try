import requests
import json
import time

# Test the quiz generation endpoints
BASE_URL = "http://localhost:8000"

# First, let's create a test text to process
test_text = """Hello world! This is a test sentence. I love programming. Python is my favorite language."""

print("Testing quiz generation endpoints...")
print("=" * 50)

# Step 1: Process the text
print("Step 1: Processing test text...")
process_response = requests.post(f"{BASE_URL}/api/process-text", json={
    "text": test_text,
    "source_language": "en",
    "target_language": "zh"
})

if process_response.status_code == 200:
    process_data = process_response.json()
    file_id = process_data.get("file_id")
    print(f"✓ Text processed successfully. File ID: {file_id}")
else:
    print(f"✗ Failed to process text: {process_response.text}")
    exit(1)

# Wait for processing to complete
print("\nStep 2: Waiting for processing to complete...")
for i in range(10):
    status_response = requests.get(f"{BASE_URL}/api/status/{file_id}")
    if status_response.status_code == 200:
        status_data = status_response.json()
        if status_data.get("status") == "completed":
            print("✓ Processing completed!")
            break
        else:
            print(f"Processing in progress... {status_data.get('progress', 0)}%")
            time.sleep(1)
    else:
        print(f"Error checking status: {status_response.text}")
        time.sleep(1)
else:
    print("✗ Processing timed out")
    exit(1)

# Step 3: Test multiple choice generation
print("\nStep 3: Testing multiple choice generation...")
mc_response = requests.post(f"{BASE_URL}/api/generate-multiple-choice/{file_id}", json={})

if mc_response.status_code == 200:
    mc_data = mc_response.json()
    questions = mc_data.get("questions", [])
    print(f"✓ Multiple choice questions generated: {len(questions)}")
    if questions:
        print("Sample question:")
        print(json.dumps(questions[0], indent=2, ensure_ascii=False))
else:
    print(f"✗ Failed to generate multiple choice questions: {mc_response.text}")

# Step 4: Test matching generation
print("\nStep 4: Testing matching generation...")
match_response = requests.post(f"{BASE_URL}/api/generate-matching/{file_id}", json={})

if match_response.status_code == 200:
    match_data = match_response.json()
    questions = match_data.get("questions", [])
    print(f"✓ Matching questions generated: {len(questions)}")
    if questions:
        print("Sample matching pair:")
        print(json.dumps(questions[0], indent=2, ensure_ascii=False))
else:
    print(f"✗ Failed to generate matching questions: {match_response.text}")

print("\n" + "=" * 50)
print("Test completed!")
