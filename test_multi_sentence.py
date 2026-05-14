import requests
import time

BASE_URL = "http://localhost:8000"

def test_multi_sentence():
    print("=== 测试: 多句子交叉出题 ===")
    text = "Deploy and scale models on your GPU infrastructure. NVIDIA NIM inference microservices provide optimized model deployment. Scale your AI applications with flexible infrastructure choices."
    
    response = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": text,
        "source_language": "en",
        "target_language": "zh"
    })
    data = response.json()
    file_id = data["file_id"]
    print(f"文件ID: {file_id}")
    
    max_wait = 180
    start = time.time()
    last_vocab_count = 0
    last_st_count = 0
    incremental_updates = 0
    
    while time.time() - start < max_wait:
        status = requests.get(f"{BASE_URL}/api/status/{file_id}").json()
        
        if status.get("status") == "processing":
            vc = len(status.get("vocab", []))
            sc = len(status.get("sentence_translations", []))
            if vc > last_vocab_count:
                print(f"  词汇表更新: {last_vocab_count} → {vc}")
                last_vocab_count = vc
                incremental_updates += 1
            if sc > last_st_count:
                print(f"  句子翻译更新: {last_st_count} → {sc}")
                last_st_count = sc
                incremental_updates += 1
            if status.get("current_sentence") and status.get("total_sentences"):
                print(f"  进度: {status['current_sentence']}/{status['total_sentences']}")
        
        if status.get("status") == "completed":
            print(f"\n处理完成! 词汇数: {len(status['vocab'])}, 句子数: {len(status['sentence_translations'])}")
            if incremental_updates > 0:
                print(f"  ✅ 检测到 {incremental_updates} 次增量更新!")
            break
        
        if status.get("status") == "error":
            print(f"  出错: {status.get('error')}")
            return
        
        time.sleep(2)
    
    print("\n=== 阶段二: 交叉出题测试 ===")
    
    units_resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units").json()
    print(f"单元数: {len(units_resp['units'])}")
    for u in units_resp["units"]:
        print(f"  单元{u['unit_id']}: {u['exercises_count']}题")
    
    requests.post(f"{BASE_URL}/api/{file_id}/phase/2/set-progress", json={"exercise_index": 0})
    
    exercise_log = []
    current_unit = 0
    for i in range(20):
        exercise = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/{current_unit}").json()
        
        if exercise.get("unit_complete"):
            print(f"  单元{current_unit}完成!")
            current_unit += 1
            if current_unit >= len(units_resp['units']):
                break
            continue
        
        et = exercise.get("exercise_type")
        eiu = exercise.get("exercise_index_in_unit")
        teiu = exercise.get("total_exercises_in_unit")
        mv = exercise.get("mask_version")
        sp = exercise.get("sentence_preview", "")
        
        type_name = f"选词{mv+1}" if et == "masked_sentence" else "翻译"
        exercise_log.append((et, eiu, teiu, mv, sp[:40]))
        print(f"  单元{current_unit} 第{eiu+1}/{teiu}题: {type_name} | {sp[:40]}")
        
        next_resp = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/{current_unit}/next").json()
        if next_resp.get("all_complete"):
            print(f"  所有练习完成!")
            break
        if next_resp.get("unit_complete"):
            print(f"  → 单元完成!")
            current_unit += 1
    
    cross = False
    for i in range(len(exercise_log) - 1):
        if exercise_log[i][4] != exercise_log[i+1][4]:
            cross = True
            break
    if cross:
        print(f"\n  ✅ 不同句子之间有穿插!")
    else:
        print(f"\n  ⚠️ 没有检测到穿插")
    
    print(f"\n  总题数: {len(exercise_log)}")

if __name__ == "__main__":
    test_multi_sentence()
    print("\n=== 测试完成! ===")
