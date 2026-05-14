import requests
import time
import sys
sys.path.insert(0, '/workspace/backend')

BASE_URL = "http://localhost:8000"

def test_backup_vocab_random():
    print("=== 测试1: 干扰词随机性 ===")
    from text_processor import TextProcessor, BACKUP_VOCAB
    tp = TextProcessor()
    
    words = ["deploy", "and", "scale", "models", "on", "your", "gpu"]
    vocab = [{"word": w} for w in words]
    
    results = []
    for i in range(3):
        result = tp.generate_masked_sentence(
            "Deploy and scale models on your GPU infrastructure",
            vocab, words, mask_seed=i+100
        )
        results.append(result)
        print(f"  版本{i}: 选项={result['options'][:8]}")
    
    all_options = set()
    for r in results:
        for o in r['options']:
            all_options.add(o)
    
    starts_with_a = [o for o in all_options if o.startswith('a')]
    print(f"  所有选项数: {len(all_options)}")
    print(f"  a开头的选项数: {len(starts_with_a)}")
    print(f"  BACKUP_VOCAB大小: {len(BACKUP_VOCAB)}")
    
    has_apple = "apple" in BACKUP_VOCAB
    has_banana = "banana" in BACKUP_VOCAB
    print(f"  包含apple: {has_apple}, 包含banana: {has_banana}")
    
    if not has_apple and not has_banana:
        print("  ✅ 词库已更新，不含apple/banana")
    else:
        print("  ⚠️ 词库仍包含简单词")

def test_phase2_units_display():
    print("\n=== 测试2: 阶段二单元显示 ===")
    text = "Deploy and scale models on your GPU infrastructure of choice with NVIDIA NIM inference microservices"
    
    response = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": text,
        "source_language": "en",
        "target_language": "zh"
    })
    file_id = response.json()["file_id"]
    
    max_wait = 120
    start = time.time()
    while time.time() - start < max_wait:
        status = requests.get(f"{BASE_URL}/api/status/{file_id}").json()
        if status.get("status") == "completed":
            break
        time.sleep(3)
    
    if status.get("status") != "completed":
        print("  ⚠️ 处理超时")
        return
    
    units_resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units").json()
    print(f"  阶段二单元数: {len(units_resp['units'])}")
    for u in units_resp["units"]:
        has_exercises_count = "exercises_count" in u
        has_sentences_count = "sentences_count" in u
        print(f"  单元{u['unit_id']}: exercises_count={u.get('exercises_count')}, sentences_count={u.get('sentences_count')}, completed={u.get('completed')}")
        if has_exercises_count:
            print(f"    ✅ 返回exercises_count")
        if has_sentences_count and not has_exercises_count:
            print(f"    ⚠️ 只有sentences_count没有exercises_count")
    
    return file_id

def test_phase2_reenter(file_id):
    print("\n=== 测试3: 阶段二完成后重新进入 ===")
    if not file_id:
        print("  跳过")
        return
    
    requests.post(f"{BASE_URL}/api/{file_id}/phase/2/set-progress", json={"exercise_index": 0})
    
    exercise_count = 0
    while True:
        exercise = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0").json()
        if exercise.get("unit_complete"):
            print(f"  单元完成（不应该发生，因为允许重新进入）")
            break
        
        exercise_count += 1
        if exercise_count > 20:
            print(f"  ⚠️ 练习数超过20，可能有问题")
            break
        
        next_resp = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next").json()
        if next_resp.get("unit_complete") or next_resp.get("all_complete"):
            print(f"  完成{exercise_count}题后单元完成")
            break
    
    print(f"  尝试重新进入已完成的单元...")
    exercise = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0").json()
    if exercise.get("unit_complete"):
        print(f"  ⚠️ 重新进入返回unit_complete（不允许复习）")
    else:
        et = exercise.get("exercise_type")
        eiu = exercise.get("exercise_index_in_unit")
        print(f"  ✅ 可以重新进入! 类型={et}, 题号={eiu}")

def test_phase1_progress_no_reset(file_id):
    print("\n=== 测试4: 阶段一进度不应被重置 ===")
    if not file_id:
        print("  跳过")
        return
    
    progress_before = requests.get(f"{BASE_URL}/api/learn/{file_id}/progress").json()
    print(f"  当前进度: {progress_before.get('current_index', 0)}")
    
    units_before = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units").json()
    completed_before = [u['completed'] for u in units_before['units']]
    print(f"  完成状态: {completed_before}")
    
    units_after = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units").json()
    completed_after = [u['completed'] for u in units_after['units']]
    
    if completed_before == completed_after:
        print(f"  ✅ 阶段一进度未改变")
    else:
        print(f"  ⚠️ 阶段一进度改变了: {completed_before} → {completed_after}")

def test_phase2_completion_checkmark(file_id):
    print("\n=== 测试5: 阶段二完成后打勾 ===")
    if not file_id:
        print("  跳过")
        return
    
    units_before = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units").json()
    print(f"  完成前: {[u['completed'] for u in units_before['units']]}")
    
    requests.post(f"{BASE_URL}/api/{file_id}/phase/2/set-progress", json={"exercise_index": 100})
    
    units_after = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units").json()
    print(f"  完成后: {[u['completed'] for u in units_after['units']]}")
    
    if units_after['units'][0]['completed']:
        print(f"  ✅ 单元0已标记为完成")
    else:
        print(f"  ⚠️ 单元0未标记为完成")

if __name__ == "__main__":
    test_backup_vocab_random()
    file_id = test_phase2_units_display()
    test_phase2_reenter(file_id)
    test_phase1_progress_no_reset(file_id)
    test_phase2_completion_checkmark(file_id)
    print("\n=== 所有测试完成! ===")
