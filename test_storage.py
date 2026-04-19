#!/usr/bin/env python3
import sys
sys.path.append('/workspace/backend')

from storage import Storage

# Test the Storage class
def test_storage():
    print("Testing Storage class...")
    
    # Create storage instance
    storage = Storage()
    
    # Test directory structure
    print("\n1. Testing directory structure:")
    print(f"Base directory: {storage.base_dir}")
    print(f"Files directory: {storage.files_dir}")
    print(f"Uploads directory: {storage.uploads_dir}")
    print(f"Progress directory: {storage.progress_dir}")
    
    # Test file operations
    test_file_id = "test_file_123"
    print(f"\n2. Testing file operations for {test_file_id}:")
    
    # Test metadata
    metadata = {
        "file_id": test_file_id,
        "filename": "test.txt",
        "source_language": "en",
        "target_language": "zh",
        "upload_time": "2024-01-01T00:00:00",
        "file_size": 100
    }
    storage.save_file_metadata(test_file_id, metadata)
    loaded_metadata = storage.load_file_metadata(test_file_id)
    print(f"Saved metadata: {metadata}")
    print(f"Loaded metadata: {loaded_metadata}")
    
    # Test pipeline data
    test_data = [
        {"sentence": "Hello", "translation_result": {"translation": [{"text": "Hello", "translation": "你好"}]}}
    ]
    storage.save_pipeline_data(test_file_id, test_data)
    loaded_data = storage.load_pipeline_data(test_file_id)
    print(f"Saved pipeline data: {test_data}")
    print(f"Loaded pipeline data: {loaded_data}")
    
    # Test vocab
    test_vocab = [
        {"word": "Hello", "ipa": "həˈloʊ", "context_meaning": "你好", "morphology": "", "sentence_index": 0}
    ]
    storage.save_vocab(test_file_id, test_vocab)
    loaded_vocab = storage.load_vocab(test_file_id)
    print(f"Saved vocab: {test_vocab}")
    print(f"Loaded vocab: {loaded_vocab}")
    
    # Test progress
    test_progress = {
        "completed_sentences": 1,
        "total_sentences": 1,
        "completed_vocab": 1,
        "total_vocab": 1,
        "stage": 1
    }
    storage.save_progress(test_file_id, test_progress)
    loaded_progress = storage.load_progress(test_file_id)
    print(f"Saved progress: {test_progress}")
    print(f"Loaded progress: {loaded_progress}")
    
    # Test list files
    print("\n3. Testing list_files:")
    files = storage.list_files()
    print(f"Files: {files}")
    
    # Test delete file
    print(f"\n4. Testing delete_file for {test_file_id}:")
    storage.delete_file(test_file_id)
    print(f"File {test_file_id} deleted")
    
    # Verify deletion
    files_after_delete = storage.list_files()
    print(f"Files after deletion: {files_after_delete}")
    
    print("\nAll tests completed successfully!")

if __name__ == "__main__":
    test_storage()
