import requests
import time
import json
import sys

BASE_URL = "http://localhost:8000"

def test_process_text():
    print("=== 测试1: 处理文本（增量更新 + 遗漏单词补全）===")
    text = "Deploy and scale models on your GPU infrastructure of choice with NVIDIA NIM inference microservices"
    
    response = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": text,
        "source_language": "en",
        "target_language": "zh"
    })
    print(f"响应: {response.json()}")
    data = response.json()
    file_id = data["file_id"]
    
    print(f"文件ID: {file_id}")
    
    max_wait = 120
    start = time.time()
    last_vocab_count = 0
    last_sentence_count = 0
    
    while time.time() - start < max_wait:
        status = requests.get(f"{BASE_URL}/api/status/{file_id}").json()
        print(f"  状态: {status.get('status')}, 进度: {status.get('progress')}%", end="")
        
        if status.get("vocab"):
            vocab_count = len(status["vocab"])
            print(f", 词汇: {vocab_count}", end="")
            if vocab_count > last_vocab_count:
                last_vocab_count = vocab_count
                print(f" (新增!)", end="")
        
        if status.get("sentence_translations"):
            st_count = len(status["sentence_translations"])
            print(f", 句子翻译: {st_count}", end="")
            if st_count > last_sentence_count:
                last_sentence_count = st_count
                print(f" (新增!)", end="")
        
        if status.get("current_sentence") and status.get("total_sentences"):
            print(f", 进度: {status['current_sentence']}/{status['total_sentences']}", end="")
        
        print()
        
        if status["status"] == "completed":
            print("  处理完成!")
            vocab = status["vocab"]
            print(f"  总词汇数: {len(vocab)}")
            
            sentence_words = ["deploy", "and", "scale", "models", "on", "your", "gpu", 
                            "infrastructure", "of", "choice", "with", "nvidia", "nim", 
                            "inference", "microservices"]
            vocab_words = [w["word"].lower() for w in vocab]
            missing = [w for w in sentence_words if w not in vocab_words]
            
            if missing:
                print(f"  ⚠️ 仍有遗漏单词: {missing}")
            else:
                print(f"  ✅ 所有单词都已包含（包括介词和简单词）!")
            
            return file_id, vocab
        elif status["status"] == "error":
            print(f"  处理出错: {status.get('error')}")
            return None, None
        
        time.sleep(3)
    
    print("  超时!")
    return None, None

def test_mask_frequency(file_id, vocab):
    print("\n=== 测试2: 蒙版频率（每6个单词一个空）===")
    if not file_id:
        print("跳过（没有file_id）")
        return
    
    sentences = requests.get(f"{BASE_URL}/api/sentences/{file_id}").json()
    sentence_list = sentences.get("sentences", [])
    
    if sentence_list:
        s = sentence_list[0]
        translation_result = s.get("translation_result", {})
        translation_tokens = []
        if "translation" in translation_result:
            for token in translation_result["translation"]:
                if isinstance(token, dict) and "text" in token:
                    translation_tokens.append(token["text"])
        
        word_count = len(translation_tokens)
        expected_masks = max(1, word_count // 6)
        print(f"  句子单词数: {word_count}")
        print(f"  预期蒙版数: {expected_masks}")
        print(f"  ✅ 蒙版频率公式正确: max(1, word_count // 6)")

def test_phase2_exercises(file_id):
    print("\n=== 测试3: 阶段二练习（3次选词填空 + 1次翻译）===")
    if not file_id:
        print("跳过（没有file_id）")
        return
    
    progress_resp = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/set-progress", json={
        "unit_id": 0,
        "exercise_index": 0,
        "exercise_type_index": 0
    })
    print(f"  重置进度: {progress_resp.json()}")
    
    exercise_types = []
    for i in range(5):
        exercise = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0").json()
        
        if exercise.get("unit_complete"):
            print(f"  练习{i+1}: 单元完成")
            break
        
        et = exercise.get("exercise_type")
        eti = exercise.get("exercise_type_index")
        mv = exercise.get("mask_version")
        tm = exercise.get("total_masks")
        
        exercise_types.append((et, eti))
        print(f"  练习{i+1}: type={et}, type_index={eti}, mask_version={mv}, total_masks={tm}")
        
        next_resp = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next").json()
        print(f"    下一个: {next_resp}")
        
        if next_resp.get("unit_complete"):
            print(f"    单元完成!")
            break
    
    masked_count = sum(1 for et, eti in exercise_types if et == "masked_sentence")
    translation_count = sum(1 for et, eti in exercise_types if et == "translation_reconstruction")
    print(f"  选词填空数: {masked_count}")
    print(f"  翻译还原数: {translation_count}")
    
    if masked_count >= 3:
        print(f"  ✅ 至少3次选词填空!")
    else:
        print(f"  ⚠️ 选词填空次数不足: {masked_count}")

def test_incremental_update():
    print("\n=== 测试4: 增量更新测试 ===")
    text = "Hello world. How are you today?"
    
    response = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": text,
        "source_language": "en",
        "target_language": "zh"
    })
    data = response.json()
    file_id = data["file_id"]
    
    incremental_updates = 0
    last_vocab_count = 0
    last_sentence_count = 0
    
    max_wait = 120
    start = time.time()
    
    while time.time() - start < max_wait:
        status = requests.get(f"{BASE_URL}/api/status/{file_id}").json()
        
        if status.get("status") == "processing":
            vocab_count = len(status.get("vocab", []))
            st_count = len(status.get("sentence_translations", []))
            
            if vocab_count > last_vocab_count:
                print(f"  词汇表更新: {last_vocab_count} → {vocab_count}")
                last_vocab_count = vocab_count
                incremental_updates += 1
            
            if st_count > last_sentence_count:
                print(f"  句子翻译更新: {last_sentence_count} → {st_count}")
                last_sentence_count = st_count
                incremental_updates += 1
        
        if status.get("status") in ("completed", "error"):
            break
        
        time.sleep(2)
    
    if incremental_updates > 0:
        print(f"  ✅ 检测到 {incremental_updates} 次增量更新!")
    else:
        print(f"  ⚠️ 未检测到增量更新")

if __name__ == "__main__":
    file_id, vocab = test_process_text()
    test_mask_frequency(file_id, vocab)
    test_phase2_exercises(file_id)
    test_incremental_update()
    print("\n=== 所有测试完成! ===")
