import sys
import json
import random
import re
from pathlib import Path

sys.path.insert(0, '/workspace/backend')
from storage import Storage
from main import (
    generate_and_save_learning_plan, find_item_in_plan, get_unit_flat_range,
    MAX_SENTENCE_WORDS_FOR_QUIZ, is_punctuation_only, is_source_lang_text,
    get_translation_phrases, BACKUP_VOCAB_BY_LANG, BACKUP_VOCAB
)

storage = Storage()

def find_existing_file():
    files_dir = Path("/workspace/data/files")
    if not files_dir.exists():
        return None
    for d in files_dir.iterdir():
        if d.is_dir():
            vocab_path = d / "vocab.json"
            pipeline_path = d / "pipeline_data.json"
            if vocab_path.exists() and pipeline_path.exists():
                return d.name
    return None

def create_test_data():
    file_id = "test_debug_phase1"
    file_dir = storage.get_file_dir(file_id)
    
    vocab = [
        {"word": "obrigatório", "meaning": "强制的，必须的", "context_meaning": "强制的", "tokens": ["obrigatório"]},
        {"word": "usar", "meaning": "使用", "context_meaning": "使用", "tokens": ["usar"]},
        {"word": "único", "meaning": "唯一的", "context_meaning": "唯一的", "tokens": ["único"]},
        {"word": "modelo", "meaning": "模型", "context_meaning": "模型", "tokens": ["modelo"]},
        {"word": "pipeline", "meaning": "管道", "context_meaning": "管道", "tokens": ["pipeline"]},
        {"word": "inferência", "meaning": "推理", "context_meaning": "推理", "tokens": ["inferência"]},
        {"word": "ensembles", "meaning": "集成", "context_meaning": "集成", "tokens": ["ensembles"]},
        {"word": "proibidos", "meaning": "被禁止的", "context_meaning": "被禁止的", "tokens": ["proibidos"]},
        {"word": "É", "meaning": "是", "context_meaning": "是", "tokens": ["é"]},
        {"word": "um", "meaning": "一个", "context_meaning": "一个", "tokens": ["um"]},
        {"word": "uma", "meaning": "一个(阴)", "context_meaning": "一个", "tokens": ["uma"]},
        {"word": "de", "meaning": "的", "context_meaning": "的", "tokens": ["de"]},
        {"word": "são", "meaning": "是(复数)", "context_meaning": "是", "tokens": ["são"]},
    ]
    
    pipeline_data = [
        {
            "sentence": "É obrigatório usar um único modelo",
            "translation_result": {
                "translation": [
                    {"text": "É", "lang": "pt"},
                    {"text": "obrigatório", "lang": "pt"},
                    {"text": "usar", "lang": "pt"},
                    {"text": "um", "lang": "pt"},
                    {"text": "único", "lang": "pt"},
                    {"text": "modelo", "lang": "pt"}
                ],
                "tokenized_translation": "必须使用唯一的模型",
                "translation_phrases": ["必须使用", "唯一的", "模型"],
                "redundant_tokens": ["一个", "强制", "规定"]
            }
        },
        {
            "sentence": "uma única pipeline de inferência",
            "translation_result": {
                "translation": [
                    {"text": "uma", "lang": "pt"},
                    {"text": "única", "lang": "pt"},
                    {"text": "pipeline", "lang": "pt"},
                    {"text": "de", "lang": "pt"},
                    {"text": "inferência", "lang": "pt"}
                ],
                "tokenized_translation": "唯一的推理管道",
                "translation_phrases": ["唯一的", "推理", "管道"],
                "redundant_tokens": ["一个", "推断", "流水线"]
            }
        },
        {
            "sentence": "ensembles são proibidos",
            "translation_result": {
                "translation": [
                    {"text": "ensembles", "lang": "pt"},
                    {"text": "são", "lang": "pt"},
                    {"text": "proibidos", "lang": "pt"}
                ],
                "tokenized_translation": "集成是被禁止的",
                "translation_phrases": ["集成", "是", "被禁止的"],
                "redundant_tokens": ["禁止", "组合", "方法"]
            }
        }
    ]
    
    storage.save_vocab(file_id, vocab)
    with open(file_dir / "pipeline_data.json", 'w', encoding='utf-8') as f:
        json.dump({"data": pipeline_data}, f, ensure_ascii=False, indent=2)
    storage.save_language_settings(file_id, "pt", "zh", 20)
    
    return file_id, vocab, pipeline_data

def simulate_frontend_flow(file_id):
    print("\n" + "="*80)
    print("模拟前端流程 - 逐步遍历第一阶段题目")
    print("="*80)
    
    plan = storage.load_learning_plan(file_id)
    if not plan:
        vocab = storage.load_vocab(file_id)
        pipeline_data = storage.load_pipeline_data(file_id)
        generate_and_save_learning_plan(file_id, vocab, pipeline_data)
        plan = storage.load_learning_plan(file_id)
    
    print(f"\n学习计划共 {len(plan)} 个单元")
    
    for unit_id, unit_plan in enumerate(plan):
        items = unit_plan.get("items", [])
        start_idx, end_idx = get_unit_flat_range(plan, unit_id)
        print(f"\n--- 单元 {unit_id} (flat index {start_idx}-{end_idx-1}) ---")
        
        for step_in_unit, item in enumerate(items):
            item_type = item.get("type", "unknown")
            if item_type == "word":
                vocab_idx = item.get("vocab_index", "?")
                vocab_data = storage.load_vocab(file_id)
                if isinstance(vocab_data, dict):
                    vocab_list = vocab_data.get("vocab", vocab_data)
                else:
                    vocab_list = vocab_data
                word = vocab_list[vocab_idx]["word"] if vocab_idx < len(vocab_list) else "?"
                print(f"  [{step_in_unit}] WORD: {word} (vocab_index={vocab_idx})")
            elif item_type == "sentence_quiz":
                sentence = item.get("sentence", "?")
                print(f"  [{step_in_unit}] SENTENCE_QUIZ: \"{sentence}\"")
            elif item_type == "listening_quiz":
                sentence = item.get("sentence", "?")
                print(f"  [{step_in_unit}] LISTENING_QUIZ: \"{sentence}\"")
            else:
                print(f"  [{step_in_unit}] UNKNOWN: {item_type}")
    
    print("\n" + "="*80)
    print("模拟前端API调用流程")
    print("="*80)
    
    for unit_id, unit_plan in enumerate(plan):
        items = unit_plan.get("items", [])
        start_idx, end_idx = get_unit_flat_range(plan, unit_id)
        
        print(f"\n=== 单元 {unit_id} ===")
        
        storage.save_learning_progress(file_id, start_idx)
        
        current_index = start_idx
        step_count = 0
        seen_questions = []
        
        while current_index < end_idx:
            uid, step_in_unit = find_item_in_plan(plan, current_index)
            if uid is None:
                break
            
            item = plan[uid].get("items", [])[step_in_unit]
            item_type = item.get("type", "unknown")
            
            if item_type == "sentence_quiz":
                sentence = item.get("sentence", "?")
                entry = f"SENTENCE_QUIZ: \"{sentence}\""
                if entry in seen_questions:
                    print(f"  *** DUPLICATE DETECTED at index {current_index}: {entry}")
                seen_questions.append(entry)
                print(f"  Step {step_count}: index={current_index} → {entry}")
            elif item_type == "listening_quiz":
                sentence = item.get("sentence", "?")
                entry = f"LISTENING_QUIZ: \"{sentence}\""
                if entry in seen_questions:
                    print(f"  *** DUPLICATE DETECTED at index {current_index}: {entry}")
                seen_questions.append(entry)
                print(f"  Step {step_count}: index={current_index} → {entry}")
            elif item_type == "word":
                vocab_idx = item.get("vocab_index", "?")
                vocab_data = storage.load_vocab(file_id)
                if isinstance(vocab_data, dict):
                    vocab_list = vocab_data.get("vocab", vocab_data)
                else:
                    vocab_list = vocab_data
                word = vocab_list[vocab_idx]["word"] if vocab_idx < len(vocab_list) else "?"
                print(f"  Step {step_count}: index={current_index} → WORD: {word}")
            
            current_index += 1
            step_count += 1
        
        sentence_quizzes = [q for q in seen_questions if q.startswith("SENTENCE_QUIZ")]
        listening_quizzes = [q for q in seen_questions if q.startswith("LISTENING_QUIZ")]
        
        print(f"\n  统计: 翻译题 {len(sentence_quizzes)} 道, 听力题 {len(listening_quizzes)} 道")
        if len(sentence_quizzes) != len(set(sentence_quizzes)):
            print(f"  *** 翻译题有重复!")
        if len(listening_quizzes) != len(set(listening_quizzes)):
            print(f"  *** 听力题有重复!")

def simulate_api_sequence(file_id):
    print("\n" + "="*80)
    print("模拟前端API调用序列 (setProgress → getRandomWord → nextWord → getRandomWord ...)")
    print("="*80)
    
    plan = storage.load_learning_plan(file_id)
    if not plan:
        print("No plan found!")
        return
    
    for unit_id in range(len(plan)):
        start_idx, end_idx = get_unit_flat_range(plan, unit_id)
        
        print(f"\n=== 单元 {unit_id} (start_index={start_idx}) ===")
        
        storage.save_learning_progress(file_id, start_idx)
        
        seen_sequence = []
        current_flat = start_idx
        
        while current_flat < end_idx:
            uid, step_in_unit = find_item_in_plan(plan, current_flat)
            if uid is None:
                break
            
            item = plan[uid]["items"][step_in_unit]
            item_type = item["type"]
            
            if item_type == "sentence_quiz":
                desc = f"SENTENCE_QUIZ(idx={current_flat}): \"{item['sentence']}\""
            elif item_type == "listening_quiz":
                desc = f"LISTENING_QUIZ(idx={current_flat}): \"{item['sentence']}\""
            elif item_type == "word":
                vocab_data = storage.load_vocab(file_id)
                if isinstance(vocab_data, dict):
                    vocab_list = vocab_data.get("vocab", vocab_data)
                else:
                    vocab_list = vocab_data
                vi = item.get("vocab_index", 0)
                w = vocab_list[vi]["word"] if vi < len(vocab_list) else "?"
                desc = f"WORD(idx={current_flat}): {w}"
            else:
                desc = f"UNKNOWN(idx={current_flat}): {item_type}"
            
            seen_sequence.append(desc)
            print(f"  {desc}")
            current_flat += 1
        
        sq = [s for s in seen_sequence if "SENTENCE_QUIZ" in s]
        lq = [s for s in seen_sequence if "LISTENING_QUIZ" in s]
        print(f"\n  翻译题: {len(sq)} 道, 听力题: {len(lq)} 道")
        
        for i, s in enumerate(sq):
            for j, s2 in enumerate(sq):
                if i < j and s == s2:
                    print(f"  *** 翻译题重复: [{i}] == [{j}] = {s}")
        for i, s in enumerate(lq):
            for j, s2 in enumerate(lq):
                if i < j and s == s2:
                    print(f"  *** 听力题重复: [{i}] == [{j}] = {s}")

if __name__ == "__main__":
    file_id = find_existing_file()
    if file_id:
        print(f"使用已有数据: {file_id}")
    else:
        print("创建测试数据...")
        file_id, _, _ = create_test_data()
        print(f"测试数据已创建: {file_id}")
    
    simulate_frontend_flow(file_id)
    simulate_api_sequence(file_id)
