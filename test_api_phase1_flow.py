import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_phase1_flow():
    print("=" * 80)
    print("测试第一阶段流程 - 模拟前端API调用序列")
    print("=" * 80)
    
    file_id = "test_debug_phase1"
    
    phase1_resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_data = phase1_resp.json()
    print(f"\nPhase 1 单元数: {len(phase1_data['units'])}")
    
    for unit_info in phase1_data['units']:
        unit_id = unit_info['unit_id']
        start_index = unit_info.get('start_index', unit_id * 10)
        end_index = unit_info.get('end_index', start_index + unit_info['exercises_count'])
        print(f"\n单元 {unit_id}: start_index={start_index}, end_index={end_index}, exercises={unit_info['exercises_count']}")
        
        print(f"\n--- 模拟前端 handlePhase1UnitClick({unit_id}) ---")
        
        set_prog_resp = requests.post(f"{BASE_URL}/api/learn/{file_id}/set-progress", json={"index": start_index})
        print(f"  setProgress({start_index}): {set_prog_resp.json()}")
        
        random_word_resp = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
        first_item = random_word_resp.json()
        item_type = first_item.get('type', 'word')
        
        if item_type == 'sentence_quiz':
            print(f"  getRandomWord() → SENTENCE_QUIZ: \"{first_item.get('original_sentence', '')}\"")
        elif item_type == 'listening_quiz':
            print(f"  getRandomWord() → LISTENING_QUIZ: \"{first_item.get('original_sentence', '')}\"")
        elif item_type == 'word':
            print(f"  getRandomWord() → WORD: \"{first_item.get('word', '')}\"")
        else:
            print(f"  getRandomWord() → {item_type}")
        
        seen_items = [f"{item_type}: {first_item.get('original_sentence', first_item.get('word', ''))}"]
        
        current_index = start_index
        step_count = 1
        
        while True:
            print(f"\n--- Step {step_count}: 模拟前端 getNextWord() ---")
            
            next_word_resp = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
            next_data = next_word_resp.json()
            new_index = next_data.get('new_index', current_index + 1)
            
            print(f"  nextWord() → new_index={new_index}")
            
            if next_data.get('type') == 'unit_complete':
                print(f"  → UNIT_COMPLETE")
                break
            
            if next_data.get('sentence_quiz'):
                sq = next_data['sentence_quiz']
                desc = f"SENTENCE_QUIZ: \"{sq.get('original_sentence', '')}\""
                print(f"  → {desc}")
                seen_items.append(desc)
                current_index = new_index
                step_count += 1
                continue
            
            if next_data.get('listening_quiz'):
                lq = next_data['listening_quiz']
                desc = f"LISTENING_QUIZ: \"{lq.get('original_sentence', '')}\""
                print(f"  → {desc}")
                seen_items.append(desc)
                current_index = new_index
                step_count += 1
                continue
            
            random_word_resp = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
            item = random_word_resp.json()
            item_type = item.get('type', 'word')
            
            if item_type == 'sentence_quiz':
                desc = f"SENTENCE_QUIZ: \"{item.get('original_sentence', '')}\""
                print(f"  getRandomWord() → {desc}")
                seen_items.append(desc)
            elif item_type == 'listening_quiz':
                desc = f"LISTENING_QUIZ: \"{item.get('original_sentence', '')}\""
                print(f"  getRandomWord() → {desc}")
                seen_items.append(desc)
            elif item_type == 'unit_complete' or item_type == 'all_complete':
                print(f"  getRandomWord() → {item_type}")
                break
            else:
                desc = f"WORD: \"{item.get('word', '')}\""
                print(f"  getRandomWord() → {desc}")
                seen_items.append(desc)
            
            current_index = new_index
            step_count += 1
            
            if step_count > 50:
                print("  *** 超过50步，停止")
                break
        
        print(f"\n--- 单元 {unit_id} 题目序列 ---")
        for i, item in enumerate(seen_items):
            print(f"  [{i}] {item}")
        
        sq_items = [s for s in seen_items if s.startswith("SENTENCE_QUIZ")]
        lq_items = [s for s in seen_items if s.startswith("LISTENING_QUIZ")]
        word_items = [s for s in seen_items if s.startswith("WORD")]
        
        print(f"\n  翻译题: {len(sq_items)} 道")
        print(f"  听力题: {len(lq_items)} 道")
        print(f"  单词题: {len(word_items)} 道")
        
        for i, s in enumerate(sq_items):
            for j, s2 in enumerate(sq_items):
                if i < j and s == s2:
                    print(f"  *** 翻译题重复: [{i}] == [{j}] = {s}")
        
        for i, s in enumerate(lq_items):
            for j, s2 in enumerate(lq_items):
                if i < j and s == s2:
                    print(f"  *** 听力题重复: [{i}] == [{j}] = {s}")

def test_phase2_flow():
    print("\n" + "=" * 80)
    print("测试第二阶段流程")
    print("=" * 80)
    
    file_id = "test_debug_phase1"
    
    phase2_resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2_data = phase2_resp.json()
    print(f"\nPhase 2 单元数: {len(phase2_data['units'])}")
    
    for unit_info in phase2_data['units']:
        unit_id = unit_info['unit_id']
        print(f"\n单元 {unit_id}: exercises={unit_info['exercises_count']}, completed={unit_info['completed']}")
        
        if unit_info.get('no_eligible_sentences'):
            print("  没有可用的句子")
            continue
        
        exercise_resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}")
        exercise_data = exercise_resp.json()
        
        if exercise_data.get('unit_complete'):
            print("  单元已完成")
            continue
        
        exercise_type = exercise_data.get('exercise_type', 'unknown')
        print(f"  第一个练习类型: {exercise_type}")
        
        if exercise_type == 'masked_sentence':
            data = exercise_data.get('data', {})
            print(f"  句子: {data.get('original_sentence', '')}")
            print(f"  mask_version: {exercise_data.get('mask_version', '')}")
        elif exercise_type == 'translation_reconstruction':
            data = exercise_data.get('data', {})
            print(f"  句子: {data.get('original_sentence', '')}")

if __name__ == "__main__":
    test_phase1_flow()
    test_phase2_flow()
