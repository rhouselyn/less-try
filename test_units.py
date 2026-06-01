#!/usr/bin/env python3
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_api():
    print("=" * 60)
    print("Testing LessLingo API - Unit Exercises")
    print("=" * 60)

    print("\n1. Getting user preferences...")
    resp = requests.get(f"{BASE_URL}/api/user-preferences")
    assert resp.status_code == 200, f"Failed: {resp.status_code}"
    prefs = resp.json()
    print(f"   only_new_words: {prefs.get('only_new_words', False)}")
    print("   ✓ OK")

    print("\n2. Getting history records...")
    resp = requests.get(f"{BASE_URL}/api/history")
    assert resp.status_code == 200, f"Failed: {resp.status_code}"
    history = resp.json().get("records", [])
    if not history:
        print("   No history records found. Please create a file first.")
        return
    file_id = history[0]["file_id"]
    title = history[0].get("title", "unknown")
    print(f"   Using file: {title} ({file_id})")
    print("   ✓ OK")

    print("\n3. Getting Phase 1 units (only_new_words=False)...")
    requests.post(f"{BASE_URL}/api/user-preferences", json={"only_new_words": False})
    resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    assert resp.status_code == 200, f"Failed: {resp.status_code}"
    data = resp.json()
    units = data.get("units", [])
    current_unit = data.get("current_unit", 0)
    print(f"   Total units: {len(units)}")
    print(f"   Current unit: {current_unit}")
    if units:
        u = units[0]
        print(f"   First unit: word_count={u.get('word_count')}, exercises_count={u.get('exercises_count')}, completed={u.get('completed')}")
    print("   ✓ OK")

    print("\n4. Getting Phase 2 units...")
    resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    assert resp.status_code == 200, f"Failed: {resp.status_code}"
    data = resp.json()
    p2_units = data.get("units", [])
    print(f"   Total units: {len(p2_units)}")
    print("   ✓ OK")

    if not units:
        print("\n   No phase 1 units available, skipping exercise tests.")
        return

    print("\n5. Testing Phase 1 unit exercise (unit 0)...")
    unit = units[0]
    start_index = unit.get("start_index", 0)
    resp = requests.post(f"{BASE_URL}/api/learn/{file_id}/set-progress", json={"index": start_index})
    assert resp.status_code == 200, f"Failed to set progress: {resp.status_code}"
    print(f"   Set progress to {start_index}")

    resp = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
    assert resp.status_code == 200, f"Failed to get word: {resp.status_code}"
    word_data = resp.json()
    word_type = word_data.get("type", "unknown")
    print(f"   Exercise type: {word_type}")
    if word_type == "word":
        word = word_data.get("word", "unknown")
        meaning = word_data.get("enriched_meaning", word_data.get("meaning", ""))
        print(f"   Word: {word}")
        print(f"   Meaning: {meaning[:50]}..." if len(meaning) > 50 else f"   Meaning: {meaning}")
    elif word_type == "sentence_quiz":
        sentence = word_data.get("original_sentence", "")
        print(f"   Sentence: {sentence[:60]}..." if len(sentence) > 60 else f"   Sentence: {sentence}")
    elif word_type == "listening_quiz":
        sentence = word_data.get("original_sentence", "")
        print(f"   Listening: {sentence[:60]}..." if len(sentence) > 60 else f"   Listening: {sentence}")
    elif word_type == "unit_complete":
        print("   Unit already complete")
    else:
        print(f"   Unknown type: {word_type}")
        print(f"   Data: {json.dumps(word_data, indent=2)[:200]}")
    print("   ✓ OK")

    print("\n6. Testing Phase 2 unit exercise (unit 0)...")
    if p2_units and not p2_units[0].get("no_eligible_sentences"):
        resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0")
        assert resp.status_code == 200, f"Failed: {resp.status_code}"
        exercise = resp.json()
        ex_type = exercise.get("type", exercise.get("exercise_type", "unknown"))
        if exercise.get("unit_complete"):
            print("   Unit already complete")
        else:
            print(f"   Exercise type: {ex_type}")
        print("   ✓ OK")
    else:
        print("   No eligible sentences for Phase 2, skipping.")

    print("\n7. Testing only_new_words filter...")
    vocab_resp = requests.get(f"{BASE_URL}/api/vocab/{file_id}")
    vocab = vocab_resp.json().get("vocab", [])
    cached_count = 0
    for v in vocab:
        word = v.get("word", "")
        if word:
            cache_resp = requests.get(f"{BASE_URL}/api/learn/{file_id}/word-cache/{word}")
            if cache_resp.status_code == 200:
                cached_count += 1
    print(f"   Total vocab: {len(vocab)}, Cached: {cached_count}")

    requests.post(f"{BASE_URL}/api/user-preferences", json={"only_new_words": True})
    resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    assert resp.status_code == 200, f"Failed: {resp.status_code}"
    filtered_data = resp.json()
    filtered_units = filtered_data.get("units", [])
    print(f"   Filtered units: {len(filtered_units)} (was {len(units)})")

    if filtered_units:
        fu = filtered_units[0]
        print(f"   First filtered unit: word_count={fu.get('word_count')}, exercises_count={fu.get('exercises_count')}")
        
        print("\n   Testing exercise in filtered mode...")
        start_index = fu.get("start_index", 0)
        requests.post(f"{BASE_URL}/api/learn/{file_id}/set-progress", json={"index": start_index})
        resp = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
        assert resp.status_code == 200, f"Failed: {resp.status_code}"
        fword = resp.json()
        ftype = fword.get("type", "unknown")
        print(f"   Exercise type: {ftype}")
        if ftype == "word":
            print(f"   Word: {fword.get('word', 'unknown')}")
        elif ftype == "unit_complete":
            print("   Unit complete (all words cached)")
        print("   ✓ OK")
    else:
        print("   No units after filtering (all words cached)")

    requests.post(f"{BASE_URL}/api/user-preferences", json={"only_new_words": False})
    print("\n   Reset only_new_words to False")

    print("\n" + "=" * 60)
    print("All tests passed! ✓")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_api()
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)
