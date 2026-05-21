import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_phase1_flow():
    print("=" * 60)
    print("测试 Phase 1 前端流程模拟")
    print("=" * 60)

    text = "É obrigatório usar um único modelo e uma única pipeline de inferência; ensembles são proibidos."
    source_lang = "pt"
    target_lang = "zh"

    print(f"\n1. 处理文本: {text[:50]}...")
    resp = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": text,
        "source_language": source_lang,
        "target_language": target_lang
    }, timeout=30)
    data = resp.json()
    file_id = data.get("file_id")
    print(f"   file_id: {file_id}")

    print("\n2. 等待处理完成...")
    for i in range(120):
        time.sleep(2)
        status_resp = requests.get(f"{BASE_URL}/api/status/{file_id}")
        status = status_resp.json()
        prog = status.get("progress", 0)
        print(f"   轮询 {i+1}: progress={prog}%, status={status.get('status')}")
        if status.get("status") == "completed":
            print("   处理完成!")
            break
        if status.get("status") == "error":
            print(f"   处理错误: {status.get('error')}")
            return
    else:
        print("   超时!")
        return

    print("\n3. 获取 Phase 1 单元列表...")
    resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/1/units")
    units_data = resp.json()
    units = units_data.get("units", [])
    print(f"   共 {len(units)} 个单元")
    for i, u in enumerate(units):
        print(f"   单元 {i}: start_index={u.get('start_index')}, end_index={u.get('end_index')}, exercises={u.get('exercises_count')}")

    print("\n4. 查看学习计划详情...")
    plan_resp = requests.get(f"{BASE_URL}/api/learn/{file_id}/progress")
    print(f"   进度: {plan_resp.json()}")

    print("\n5. 逐个单元测试前端流程...")
    for unit_id, unit in enumerate(units):
        start_index = unit.get("start_index", unit_id * 10)
        end_index = unit.get("end_index", start_index + 10)
        print(f"\n   === 单元 {unit_id} (start_index={start_index}, end_index={end_index}) ===")

        seen_items = []
        seen_sentences = {"sentence_quiz": [], "listening_quiz": []}

        print(f"   5.1 setProgress({start_index})")
        resp = requests.post(f"{BASE_URL}/api/learn/{file_id}/set-progress", json={"index": start_index})
        print(f"       结果: {resp.json()}")

        print(f"   5.2 getRandomWord()")
        resp = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
        first_item = resp.json()
        item_type = first_item.get("type", "unknown")
        print(f"       type={item_type}")

        if item_type == "sentence_quiz":
            sentence = first_item.get("original_sentence", "")
            print(f"       句子: {sentence}")
            seen_sentences["sentence_quiz"].append(sentence)
            seen_items.append({"type": "sentence_quiz", "sentence": sentence, "step": first_item.get("step_in_unit")})
        elif item_type == "listening_quiz":
            sentence = first_item.get("original_sentence", "")
            print(f"       句子: {sentence}")
            seen_sentences["listening_quiz"].append(sentence)
            seen_items.append({"type": "listening_quiz", "sentence": sentence, "step": first_item.get("step_in_unit")})
        elif item_type == "word":
            word = first_item.get("word", "")
            print(f"       单词: {word}")
            seen_items.append({"type": "word", "word": word, "step": first_item.get("step_in_unit")})
        else:
            print(f"       其他: {json.dumps(first_item, ensure_ascii=False)[:200]}")
            seen_items.append({"type": item_type})

        step_count = 1
        max_steps = 50

        while step_count < max_steps:
            step_count += 1

            print(f"   5.3 nextWord() (第{step_count}步)")
            resp = requests.post(f"{BASE_URL}/api/learn/{file_id}/next-word")
            next_resp = resp.json()

            new_index = next_resp.get("new_index")
            resp_type = next_resp.get("type")

            if resp_type == "unit_complete":
                print(f"       unit_complete! new_index={new_index}")
                seen_items.append({"type": "unit_complete"})
                break

            if next_resp.get("sentence_quiz"):
                sq = next_resp["sentence_quiz"]
                sentence = sq.get("original_sentence", "")
                step_in_unit = sq.get("step_in_unit")
                print(f"       sentence_quiz: 句子='{sentence}', step_in_unit={step_in_unit}")
                seen_sentences["sentence_quiz"].append(sentence)
                seen_items.append({"type": "sentence_quiz", "sentence": sentence, "step": step_in_unit})
                continue

            if next_resp.get("listening_quiz"):
                lq = next_resp["listening_quiz"]
                sentence = lq.get("original_sentence", "")
                step_in_unit = lq.get("step_in_unit")
                print(f"       listening_quiz: 句子='{sentence}', step_in_unit={step_in_unit}")
                seen_sentences["listening_quiz"].append(sentence)
                seen_items.append({"type": "listening_quiz", "sentence": sentence, "step": step_in_unit})
                continue

            print(f"       word类型 (无quiz), new_index={new_index}, 调用getRandomWord()")

            resp2 = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word")
            word_resp = resp2.json()
            word_type = word_resp.get("type", "unknown")

            if word_type == "sentence_quiz":
                sentence = word_resp.get("original_sentence", "")
                step_in_unit = word_resp.get("step_in_unit")
                print(f"       getRandomWord -> sentence_quiz: 句子='{sentence}', step_in_unit={step_in_unit}")
                seen_sentences["sentence_quiz"].append(sentence)
                seen_items.append({"type": "sentence_quiz", "sentence": sentence, "step": step_in_unit})
            elif word_type == "listening_quiz":
                sentence = word_resp.get("original_sentence", "")
                step_in_unit = word_resp.get("step_in_unit")
                print(f"       getRandomWord -> listening_quiz: 句子='{sentence}', step_in_unit={step_in_unit}")
                seen_sentences["listening_quiz"].append(sentence)
                seen_items.append({"type": "listening_quiz", "sentence": sentence, "step": step_in_unit})
            elif word_type == "unit_complete":
                print(f"       getRandomWord -> unit_complete")
                seen_items.append({"type": "unit_complete"})
                break
            elif word_type == "all_complete":
                print(f"       getRandomWord -> all_complete")
                seen_items.append({"type": "all_complete"})
                break
            else:
                word = word_resp.get("word", "")
                step_in_unit = word_resp.get("step_in_unit")
                print(f"       getRandomWord -> word: '{word}', step_in_unit={step_in_unit}")
                seen_items.append({"type": "word", "word": word, "step": step_in_unit})

        print(f"\n   单元 {unit_id} 汇总:")
        print(f"   总步数: {len(seen_items)}")
        for i, item in enumerate(seen_items):
            if item["type"] == "sentence_quiz":
                print(f"     [{i}] sentence_quiz: '{item.get('sentence', '')}' (step={item.get('step')})")
            elif item["type"] == "listening_quiz":
                print(f"     [{i}] listening_quiz: '{item.get('sentence', '')}' (step={item.get('step')})")
            elif item["type"] == "word":
                print(f"     [{i}] word: '{item.get('word', '')}' (step={item.get('step')})")
            else:
                print(f"     [{i}] {item['type']}")

        for quiz_type, sentences in seen_sentences.items():
            if len(sentences) != len(set(sentences)):
                print(f"   ⚠️  {quiz_type} 有重复句子!")
                for s in sentences:
                    count = sentences.count(s)
                    if count > 1:
                        print(f"       '{s}' 出现了 {count} 次")
            else:
                print(f"   ✅ {quiz_type} 无重复 ({len(sentences)} 个)")

    print("\n" + "=" * 60)
    print("Phase 1 测试完成")
    print("=" * 60)


def test_phase2_flow():
    print("\n" + "=" * 60)
    print("测试 Phase 2 前端流程模拟")
    print("=" * 60)

    text = "É obrigatório usar um único modelo e uma única pipeline de inferência; ensembles são proibidos."
    source_lang = "pt"
    target_lang = "zh"

    resp = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": text,
        "source_language": source_lang,
        "target_language": target_lang
    }, timeout=30)
    data = resp.json()
    file_id = data.get("file_id")
    print(f"file_id: {file_id}")

    for i in range(120):
        time.sleep(2)
        status_resp = requests.get(f"{BASE_URL}/api/status/{file_id}")
        status = status_resp.json()
        if status.get("status") == "completed":
            break
        if status.get("status") == "error":
            print(f"处理错误: {status.get('error')}")
            return
    else:
        print("超时!")
        return

    print("\n获取 Phase 2 单元列表...")
    resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/units")
    units_data = resp.json()
    units = units_data.get("units", [])
    print(f"共 {len(units)} 个单元")

    for unit_id, unit in enumerate(units):
        if unit.get("no_eligible_sentences"):
            print(f"单元 {unit_id}: 无符合条件的句子")
            continue

        print(f"\n=== 单元 {unit_id} ===")
        seen_exercises = []
        step_count = 0
        max_steps = 50

        while step_count < max_steps:
            step_count += 1

            resp = requests.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}")
            exercise_data = resp.json()

            if exercise_data.get("unit_complete"):
                print(f"  [{step_count}] unit_complete")
                break

            ex_type = exercise_data.get("exercise_type")
            mask_ver = exercise_data.get("mask_version")
            ex_idx = exercise_data.get("exercise_index_in_unit")
            total_ex = exercise_data.get("total_exercises_in_unit")
            preview = exercise_data.get("sentence_preview", "")

            print(f"  [{step_count}] {ex_type}, mask_version={mask_ver}, exercise_index={ex_idx}/{total_ex}, preview='{preview[:50]}'")
            seen_exercises.append({
                "type": ex_type,
                "mask_version": mask_ver,
                "exercise_index": ex_idx,
                "preview": preview
            })

            resp = requests.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}/next")
            next_resp = resp.json()

            if next_resp.get("unit_complete") or next_resp.get("all_complete"):
                print(f"  [{step_count + 1}] 完成 (next API返回unit_complete)")
                break

        print(f"\n单元 {unit_id} 汇总: 共 {len(seen_exercises)} 个练习")
        for i, ex in enumerate(seen_exercises):
            print(f"  [{i}] {ex['type']}, mask_v={ex['mask_version']}, idx={ex['exercise_index']}, preview='{ex['preview'][:40]}'")

        unique_keys = [(e["type"], e["mask_version"], e["exercise_index"]) for e in seen_exercises]
        if len(unique_keys) != len(set(unique_keys)):
            print("  ⚠️  有重复练习!")
        else:
            print("  ✅ 无重复练习")


if __name__ == "__main__":
    test_phase1_flow()
    test_phase2_flow()
