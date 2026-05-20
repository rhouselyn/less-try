import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000"

def test_phase1_questions(file_id):
    print("\n" + "="*60)
    print("测试第一阶段题目")
    print("="*60)
    
    plan_resp = requests.get(f"{BASE_URL}/api/learn/{file_id}/progress")
    plan_data = plan_resp.json()
    total_units = plan_data.get("total_units", 0)
    print(f"第一阶段总单元数: {total_units}")
    
    requests.post(f"{BASE_URL}/api/learn/{file_id}/set-progress", json={"index": 0})
    
    current_index = 0
    question_count = 0
    type_counts = {"word": 0, "sentence_quiz": 0, "listening_quiz": 0}
    sentence_quiz_sentences = []
    listening_quiz_sentences = []
    
    while True:
        resp = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
        data = resp.json()
        
        q_type = data.get("type", "word")
        question_count += 1
        type_counts[q_type] = type_counts.get(q_type, 0) + 1
        
        if q_type == "sentence_quiz":
            sentence = data.get("original_sentence", "")
            sentence_quiz_sentences.append(sentence)
            correct_tokens = data.get("correct_tokens", [])
            tokens = data.get("tokens", [])
            has_correct = all(ct in tokens for ct in correct_tokens)
            print(f"  [{question_count}] 翻译题: '{sentence[:50]}...' | 正确token数: {len(correct_tokens)} | 选项数: {len(tokens)} | 正确token在选项中: {'✓' if has_correct else '✗'}")
            if not has_correct:
                print(f"    ⚠️ 错误: 正确token不在选项中! correct_tokens={correct_tokens}, tokens={tokens}")
        
        elif q_type == "listening_quiz":
            sentence = data.get("original_sentence", "")
            listening_quiz_sentences.append(sentence)
            correct_words = data.get("correct_words", [])
            options = data.get("options", [])
            has_correct = all(cw in options for cw in correct_words)
            print(f"  [{question_count}] 听力题: '{sentence[:50]}...' | 正确词数: {len(correct_words)} | 选项数: {len(options)} | 正确词在选项中: {'✓' if has_correct else '✗'}")
            if not has_correct:
                print(f"    ⚠️ 错误: 正确词不在选项中! correct_words={correct_words}, options={options}")
        
        elif q_type == "word":
            word = data.get("word", "")
            options = data.get("options", [])
            correct_index = data.get("correct_index", -1)
            has_valid = 0 <= correct_index < len(options)
            print(f"  [{question_count}] 单词题: '{word}' | 选项数: {len(options)} | 正确索引: {correct_index} | 索引有效: {'✓' if has_valid else '✗'}")
            if not has_valid:
                print(f"    ⚠️ 错误: 正确索引无效!")
        
        elif q_type in ("unit_complete", "all_complete"):
            print(f"  [{question_count}] 单元完成!")
            if q_type == "all_complete":
                break
        
        next_resp = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
        next_data = next_resp.json()
        
        if next_data.get("type") == "unit_complete":
            print(f"  --- 单元边界 (index={next_data.get('new_index')}) ---")
            current_index = next_data.get("new_index", current_index + 1)
        elif next_data.get("type") == "all_complete":
            print(f"  --- 所有单元完成 ---")
            break
        else:
            current_index = next_data.get("new_index", current_index + 1)
        
        if question_count > 200:
            print("  ⚠️ 超过200题，停止测试")
            break
    
    print(f"\n第一阶段统计:")
    print(f"  总题数: {question_count}")
    print(f"  单词题: {type_counts.get('word', 0)}")
    print(f"  翻译题: {type_counts.get('sentence_quiz', 0)}")
    print(f"  听力题: {type_counts.get('listening_quiz', 0)}")
    
    overlap = set(sentence_quiz_sentences) & set(listening_quiz_sentences)
    if overlap:
        print(f"  ⚠️ 翻译题和听力题有重复句子: {overlap}")
    else:
        print(f"  ✓ 翻译题和听力题无重复句子")
    
    return type_counts


def test_phase2_questions(file_id):
    print("\n" + "="*60)
    print("测试第二阶段题目")
    print("="*60)
    
    units_resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    units_data = units_resp.json()
    units = units_data.get("units", [])
    print(f"第二阶段总单元数: {len(units)}")
    
    requests.post(f"{BASE_URL}/api/{file_id}/phase/2/set-progress", json={"exercise_index": 0})
    
    type_counts = {"masked_sentence": 0, "translation_reconstruction": 0}
    question_count = 0
    
    for unit in units:
        unit_id = unit.get("unit_id", 0)
        print(f"\n--- 单元 {unit_id} ---")
        
        exercise_resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}")
        exercise_data = exercise_resp.json()
        
        if exercise_data.get("unit_complete"):
            print(f"  单元已完成，跳过")
            continue
        
        if exercise_data.get("no_eligible_sentences"):
            print(f"  无可用句子，跳过")
            continue
        
        while True:
            ex_type = exercise_data.get("exercise_type", "")
            question_count += 1
            type_counts[ex_type] = type_counts.get(ex_type, 0) + 1
            
            if ex_type == "masked_sentence":
                data = exercise_data.get("data", {})
                masked = data.get("masked_sentence", "")
                answer_words = data.get("answer_words", [])
                options = data.get("options", [])
                has_answers = all(aw in options for aw in answer_words)
                print(f"  [{question_count}] 选词填空: '{masked[:60]}...' | 答案数: {len(answer_words)} | 选项数: {len(options)} | 答案在选项中: {'✓' if has_answers else '✗'}")
                if not has_answers:
                    print(f"    ⚠️ 错误: 答案不在选项中! answer_words={answer_words}, options={options}")
            
            elif ex_type == "translation_reconstruction":
                data = exercise_data.get("data", {})
                native = data.get("native_translation", "")
                original_tokens = data.get("original_tokens", [])
                options = data.get("options", [])
                has_tokens = all(ot in options for ot in original_tokens)
                print(f"  [{question_count}] 翻译还原: '{native[:60]}...' | 原始token数: {len(original_tokens)} | 选项数: {len(options)} | token在选项中: {'✓' if has_tokens else '✗'}")
                if not has_tokens:
                    print(f"    ⚠️ 错误: 原始token不在选项中! original_tokens={original_tokens}, options={options}")
            
            next_resp = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}/next")
            next_data = next_resp.json()
            
            if next_data.get("unit_complete") or next_data.get("all_complete"):
                print(f"  单元完成!")
                break
            
            exercise_resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}")
            exercise_data = exercise_resp.json()
            
            if exercise_data.get("unit_complete"):
                print(f"  单元完成!")
                break
            
            if question_count > 200:
                print("  ⚠️ 超过200题，停止测试")
                break
        
        if question_count > 200:
            break
    
    print(f"\n第二阶段统计:")
    print(f"  总题数: {question_count}")
    print(f"  选词填空: {type_counts.get('masked_sentence', 0)}")
    print(f"  翻译还原: {type_counts.get('translation_reconstruction', 0)}")
    
    return type_counts


def find_existing_file_id():
    try:
        history_resp = requests.get(f"{BASE_URL}/api/history")
        history_data = history_resp.json()
        records = history_data.get("records", [])
        if records:
            return records[-1].get("file_id")
    except:
        pass
    return None


if __name__ == "__main__":
    print("等待后端启动...")
    for i in range(30):
        try:
            resp = requests.get(f"{BASE_URL}/")
            if resp.status_code == 200:
                print("后端已启动!")
                break
        except:
            pass
        time.sleep(1)
    else:
        print("后端启动超时!")
        sys.exit(1)
    
    file_id = find_existing_file_id()
    if not file_id:
        print("未找到已有文件，创建测试数据...")
        test_text = "The cat sat on the mat. The dog ran in the park. She reads books every day. We love to eat pizza."
        resp = requests.post(f"{BASE_URL}/api/process-text", json={
            "text": test_text,
            "source_language": "en",
            "target_language": "zh"
        })
        data = resp.json()
        file_id = data.get("file_id")
        print(f"创建文件: {file_id}")
        
        print("等待处理完成...")
        for i in range(120):
            status_resp = requests.get(f"{BASE_URL}/api/status/{file_id}")
            status_data = status_resp.json()
            if status_data.get("status") == "completed":
                print("处理完成!")
                break
            time.sleep(2)
        else:
            print("处理超时!")
            sys.exit(1)
    else:
        print(f"使用已有文件: {file_id}")
    
    phase1_counts = test_phase1_questions(file_id)
    phase2_counts = test_phase2_questions(file_id)
    
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    print(f"第一阶段: {phase1_counts}")
    print(f"第二阶段: {phase2_counts}")
    print("\n✓ 所有测试完成!")
