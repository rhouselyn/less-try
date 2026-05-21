import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000"

def test_phase1_step_by_step():
    print("=" * 80)
    print("第一阶段 - 逐步测试每道题目")
    print("=" * 80)
    
    file_id = "test_debug_phase1"
    
    phase1_resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    phase1_data = phase1_resp.json()
    units = phase1_data.get('units', [])
    print(f"\nPhase 1 单元数: {len(units)}")
    
    for unit_info in units:
        unit_id = unit_info['unit_id']
        start_index = unit_info.get('start_index', unit_id * 10)
        end_index = unit_info.get('end_index', start_index + unit_info['exercises_count'])
        
        print(f"\n{'='*60}")
        print(f"单元 {unit_id}: start={start_index}, end={end_index}, exercises={unit_info['exercises_count']}")
        print(f"{'='*60}")
        
        requests.post(f"{BASE_URL}/api/learn/{file_id}/set-progress", json={"index": start_index})
        
        first_resp = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
        first_item = first_resp.json()
        
        seen_sequence = []
        current_index = start_index
        step_count = 0
        
        def record_item(item_data, source="getRandomWord"):
            nonlocal step_count
            item_type = item_data.get('type', 'word')
            
            if item_type == 'sentence_quiz':
                sentence = item_data.get('original_sentence', '')
                entry = f"SENTENCE_QUIZ: \"{sentence}\""
                print(f"  [{step_count}] idx={current_index} ({source}) → {entry}")
                seen_sequence.append(entry)
            elif item_type == 'listening_quiz':
                sentence = item_data.get('original_sentence', '')
                entry = f"LISTENING_QUIZ: \"{sentence}\""
                print(f"  [{step_count}] idx={current_index} ({source}) → {entry}")
                seen_sequence.append(entry)
            elif item_type == 'word':
                word = item_data.get('word', '')
                entry = f"WORD: \"{word}\""
                print(f"  [{step_count}] idx={current_index} ({source}) → {entry}")
                seen_sequence.append(entry)
            else:
                entry = f"{item_type}"
                print(f"  [{step_count}] idx={current_index} ({source}) → {entry}")
                seen_sequence.append(entry)
            
            step_count += 1
        
        record_item(first_item, "getRandomWord(init)")
        
        while True:
            next_resp = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
            next_data = next_resp.json()
            new_index = next_data.get('new_index', current_index + 1)
            
            if next_data.get('type') == 'unit_complete':
                print(f"  [{step_count}] → UNIT_COMPLETE (new_index={new_index})")
                break
            
            if next_data.get('sentence_quiz'):
                current_index = new_index
                sq = next_data['sentence_quiz']
                entry = f"SENTENCE_QUIZ: \"{sq.get('original_sentence', '')}\""
                print(f"  [{step_count}] idx={current_index} (nextWord) → {entry}")
                seen_sequence.append(entry)
                step_count += 1
                continue
            
            if next_data.get('listening_quiz'):
                current_index = new_index
                lq = next_data['listening_quiz']
                entry = f"LISTENING_QUIZ: \"{lq.get('original_sentence', '')}\""
                print(f"  [{step_count}] idx={current_index} (nextWord) → {entry}")
                seen_sequence.append(entry)
                step_count += 1
                continue
            
            current_index = new_index
            
            rand_resp = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
            rand_data = rand_resp.json()
            
            if rand_data.get('type') in ('unit_complete', 'all_complete'):
                print(f"  [{step_count}] → {rand_data['type']}")
                break
            
            record_item(rand_data, "getRandomWord(fallback)")
            
            if step_count > 50:
                print("  *** 超过50步，停止")
                break
        
        sq_items = [s for s in seen_sequence if s.startswith("SENTENCE_QUIZ")]
        lq_items = [s for s in seen_sequence if s.startswith("LISTENING_QUIZ")]
        word_items = [s for s in seen_sequence if s.startswith("WORD")]
        
        print(f"\n  统计: 翻译题 {len(sq_items)} 道, 听力题 {len(lq_items)} 道, 单词题 {len(word_items)} 道")
        
        has_dup = False
        for i, s in enumerate(sq_items):
            for j, s2 in enumerate(sq_items):
                if i < j and s == s2:
                    print(f"  *** 翻译题重复: [{i}] == [{j}] = {s}")
                    has_dup = True
        for i, s in enumerate(lq_items):
            for j, s2 in enumerate(lq_items):
                if i < j and s == s2:
                    print(f"  *** 听力题重复: [{i}] == [{j}] = {s}")
                    has_dup = True
        
        if not has_dup:
            print("  ✓ 没有发现重复题目")

def test_phase2_step_by_step():
    print("\n" + "=" * 80)
    print("第二阶段 - 逐步测试每道题目")
    print("=" * 80)
    
    file_id = "test_debug_phase1"
    
    phase2_resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    phase2_data = phase2_resp.json()
    units = phase2_data.get('units', [])
    print(f"\nPhase 2 单元数: {len(units)}")
    
    for unit_info in units:
        unit_id = unit_info['unit_id']
        print(f"\n--- 单元 {unit_id} ---")
        
        if unit_info.get('no_eligible_sentences'):
            print("  没有可用的句子")
            continue
        
        exercise_resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}")
        exercise_data = exercise_resp.json()
        
        step_count = 0
        seen_exercises = []
        
        while True:
            if exercise_data.get('unit_complete'):
                print(f"  单元 {unit_id} 已完成")
                break
            
            exercise_type = exercise_data.get('exercise_type', 'unknown')
            data = exercise_data.get('data', {})
            sentence = data.get('original_sentence', '')
            mask_version = exercise_data.get('mask_version', '')
            
            entry = f"{exercise_type}(mask={mask_version}): \"{sentence}\""
            print(f"  [{step_count}] {entry}")
            seen_exercises.append(entry)
            step_count += 1
            
            answer_words = data.get('answer_words', [])
            if answer_words:
                submit_resp = requests.post(
                    f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}/answer",
                    json={"answer_words": answer_words, "mask_version": mask_version}
                )
                submit_data = submit_resp.json()
                
                if submit_data.get('unit_complete'):
                    print(f"  [{step_count}] → UNIT_COMPLETE")
                    break
                
                exercise_data = submit_data.get('next_exercise', {})
                if not exercise_data:
                    exercise_data = submit_data
            else:
                print(f"  *** 没有answer_words，无法继续")
                break
            
            if step_count > 30:
                print("  *** 超过30步，停止")
                break
        
        print(f"  统计: 共 {len(seen_exercises)} 道题")
        
        has_dup = False
        for i, s in enumerate(seen_exercises):
            for j, s2 in enumerate(seen_exercises):
                if i < j and s == s2:
                    print(f"  *** 重复: [{i}] == [{j}] = {s}")
                    has_dup = True
        if not has_dup:
            print("  ✓ 没有发现重复题目")

if __name__ == "__main__":
    test_phase1_step_by_step()
    test_phase2_step_by_step()
