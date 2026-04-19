#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def main():
    # Step 1: Process text
    print("=== Processing text ===")
    proc_res = client.post("/api/process-text", json={"text": "hi bro", "source_language": "en", "target_language": "zh"})
    file_id = proc_res.json()["file_id"]
    print(f"File ID: {file_id}")

    # Step 2: Poll until complete
    import time
    for i in range(60):
        time.sleep(1)
        status_res = client.get(f"/api/status/{file_id}")
        status_data = status_res.json()
        print(f"Status: {status_data['status']}")
        if status_data['status'] == 'completed':
            break

    # Step3: Get word details
    print("\n=== Getting word details ===")
    word_detail_res = client.get(f"/api/word/{file_id}/bro")
    print(f"Status code: {word_detail_res.status_code}")
    print(f"Response: {word_detail_res.text}")

if __name__ == "__main__":
    main()
