import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_process_and_phase2():
    print("=== 测试: 处理文本 + 阶段二交叉出题 + 10题/单元 ===")
    text = "Deploy and scale models on your GPU infrastructure of choice with NVIDIA NIM inference microservices"
    
    response = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": text,
        "source_language": "en",
        "target_language": "zh"
    })
    data = response.json()
    file_id = data["file_id"]
    print(f"文件ID: {file_id}")
    
    max_wait = 120
    start = time.time()
    last_vocab_count = 0
    last_sentence_count = 0
    incremental_updates = 0
    
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
            
            if status.get("current_sentence") and status.get("total_sentences"):
                print(f"  进度: {status['current_sentence']}/{status['total_sentences']}")
        
        if status.get("status") == "completed":
            vocab = status["vocab"]
            print(f"\n处理完成! 词汇数: {len(vocab)}")
            
            sentence_words = ["deploy", "and", "scale", "models", "on", "your", "gpu", 
                            "infrastructure", "of", "choice", "with", "nvidia", "nim", 
                            "inference", "microservices"]
            vocab_words = [w["word"].lower() for w in vocab]
            missing = [w for w in sentence_words if w not in vocab_words]
            
            if missing:
                print(f"  ⚠️ 遗漏单词: {missing}")
            else:
                print(f"  ✅ 所有单词都已包含!")
            
            if incremental_updates > 0:
                print(f"  ✅ 检测到 {incremental_updates} 次增量更新!")
            else:
                print(f"  ⚠️ 未检测到增量更新（处理太快）")
            
            break
        
        if status.get("status") == "error":
            print(f"  处理出错: {status.get('error')}")
            return None
        
        time.sleep(2)
    
    print("\n=== 测试阶段二: 交叉出题 + 10题/单元 ===")
    
    units_resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units").json()
    print(f"阶段二单元数: {len(units_resp['units'])}")
    for u in units_resp["units"]:
        print(f"  单元{u['unit_id']}: {u['exercises_count']}题, 完成={u['completed']}")
    
    progress_resp = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/set-progress", json={"exercise_index": 0})
    print(f"重置进度: {progress_resp.json()}")
    
    exercise_log = []
    for i in range(15):
        exercise = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/0").json()
        
        if exercise.get("unit_complete"):
            print(f"  练习{i+1}: 单元0完成")
            break
        
        et = exercise.get("exercise_type")
        eiu = exercise.get("exercise_index_in_unit")
        teiu = exercise.get("total_exercises_in_unit")
        mv = exercise.get("mask_version")
        tm = exercise.get("total_masks")
        sp = exercise.get("sentence_preview")
        
        type_name = f"选词{mv+1}" if et == "masked_sentence" else "翻译"
        exercise_log.append((et, eiu, teiu, mv, sp))
        print(f"  练习{i+1}: 第{eiu+1}/{teiu}题, {type_name}, 句子={sp}")
        
        next_resp = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/0/next").json()
        
        if next_resp.get("unit_complete"):
            print(f"  → 单元完成! 新单元: {next_resp.get('new_unit')}")
            
            print(f"\n=== 测试单元1 ===")
            exercise2 = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/1").json()
            if not exercise2.get("unit_complete"):
                et2 = exercise2.get("exercise_type")
                eiu2 = exercise2.get("exercise_index_in_unit")
                teiu2 = exercise2.get("total_exercises_in_unit")
                sp2 = exercise2.get("sentence_preview")
                type_name2 = "选词" if et2 == "masked_sentence" else "翻译"
                print(f"  单元1第1题: 第{eiu2+1}/{teiu2}题, {type_name2}, 句子={sp2}")
            break
    
    if len(exercise_log) == 10:
        print(f"\n  ✅ 单元0正好10题!")
    elif len(exercise_log) > 0:
        print(f"\n  单元0共 {len(exercise_log)} 题")
    
    cross_sentence = False
    for i in range(len(exercise_log) - 1):
        if exercise_log[i][4] != exercise_log[i+1][4]:
            cross_sentence = True
            break
    if cross_sentence:
        print(f"  ✅ 不同句子之间有穿插!")
    else:
        print(f"  ⚠️ 只有一个句子，无法测试穿插")
    
    return file_id

if __name__ == "__main__":
    test_process_and_phase2()
    print("\n=== API测试完成! ===")
