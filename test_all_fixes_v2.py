import sys
sys.path.insert(0, '/workspace/backend')

from storage import Storage
import json
import shutil
import asyncio

storage = Storage()
test_file_id = "test_all_fixes_v2"
test_dir = storage.get_file_dir(test_file_id)
if test_dir.exists():
    shutil.rmtree(test_dir)

sentences_data = [
    {
        "sentence": "Hi man, how are you doing today?",
        "word_count": 7,
        "translation_result": {
            "translation": [
                {"text": "Hi", "translation": "嗨", "phonetic": "/haɪ/", "morphology": "interj"},
                {"text": "man", "translation": "伙计", "phonetic": "/mæn/", "morphology": "n"},
                {"text": "how", "translation": "怎样", "phonetic": "/haʊ/", "morphology": "adv"},
                {"text": "are", "translation": "是", "phonetic": "/ɑːr/", "morphology": "v"},
                {"text": "you", "translation": "你", "phonetic": "/juː/", "morphology": "pron"},
                {"text": "doing", "translation": "做", "phonetic": "/ˈduːɪŋ/", "morphology": "v"},
                {"text": "today", "translation": "今天", "phonetic": "/təˈdeɪ/", "morphology": "n"},
            ],
            "tokenized_translation": "嗨，伙计，你今天怎么样？",
            "redundant_tokens": ["昨天", "明天", "很好", "他们"],
            "dictionary_entries": [
                {"word": "hi", "ipa": "/haɪ/", "context_meaning": "嗨", "variants": [], "examples": ["Hi there!", "Hi, how are you?"], "options": ["嗨", "再见", "谢谢", "对不起"], "grammar": "感叹词", "translation": "嗨", "tokens": ["hi"], "morphology": "interj"},
                {"word": "man", "ipa": "/mæn/", "context_meaning": "伙计", "variants": [{"type": "复数", "form": "men"}], "examples": ["Hey man!", "The man is tall."], "options": ["伙计", "女人", "孩子", "动物"], "grammar": "名词", "translation": "男人/伙计", "tokens": ["man"], "morphology": "n"},
                {"word": "how", "ipa": "/haʊ/", "context_meaning": "怎样", "variants": [], "examples": ["How are you?", "How do you do?"], "options": ["怎样", "什么", "哪里", "何时"], "grammar": "副词", "translation": "怎样", "tokens": ["how"], "morphology": "adv"},
                {"word": "are", "ipa": "/ɑːr/", "context_meaning": "是", "variants": [{"type": "过去式", "form": "were"}, {"type": "原形", "form": "be"}], "examples": ["You are kind.", "They are friends."], "options": ["是", "有", "做", "去"], "grammar": "动词be的复数形式", "translation": "是", "tokens": ["are"], "morphology": "v"},
                {"word": "you", "ipa": "/juː/", "context_meaning": "你", "variants": [{"type": "反身代词", "form": "yourself"}, {"type": "宾格", "form": "you"}], "examples": ["You are nice.", "I like you."], "options": ["你", "我", "他", "她"], "grammar": "代词", "translation": "你", "tokens": ["you"], "morphology": "pron"},
                {"word": "doing", "ipa": "/ˈduːɪŋ/", "context_meaning": "做", "variants": [{"type": "原形", "form": "do"}, {"type": "过去式", "form": "did"}], "examples": ["What are you doing?", "Doing homework is boring."], "options": ["做", "说", "想", "看"], "grammar": "动词do的现在分词", "translation": "做", "tokens": ["doing"], "morphology": "v"},
                {"word": "today", "ipa": "/təˈdeɪ/", "context_meaning": "今天", "variants": [], "examples": ["Today is Monday.", "I am happy today."], "options": ["今天", "昨天", "明天", "后天"], "grammar": "名词/副词", "translation": "今天", "tokens": ["today"], "morphology": "n"},
            ]
        }
    }
]
storage.save_pipeline_data(test_file_id, sentences_data)
storage.save_vocab(test_file_id, sentences_data[0]["translation_result"]["dictionary_entries"])
storage.save_language_settings(test_file_id, "en", "zh")

from main import get_phase_units, get_phase_unit_exercise, next_phase_exercise

print("=" * 60)
print("测试1: 阶段二单元完成后打勾（4题单元）")
print("=" * 60)

async def test_phase2_checkmark():
    result = await get_phase_units(test_file_id, 2)
    units = result.get("units", [])
    total_exercises = units[0].get('exercises_count', 0)
    print(f"  单元0: exercises_count={total_exercises}")
    
    for i in range(total_exercises):
        await get_phase_unit_exercise(test_file_id, 2, 0)
        next_res = await next_phase_exercise(test_file_id, 2, 0)
        if next_res.get('unit_complete') or next_res.get('all_complete'):
            print(f"  完成第{i+1}题后: unit_complete={next_res.get('unit_complete')}, all_complete={next_res.get('all_complete')}")
            break
    
    max_progress = storage.load_phase2_max_progress(test_file_id)
    print(f"  max_exercise_index: {max_progress}")
    
    result2 = await get_phase_units(test_file_id, 2)
    units2 = result2.get("units", [])
    for u in units2:
        completed = u.get('completed')
        print(f"  单元 {u['unit_id']}: exercises_count={u.get('exercises_count')}, completed={completed}")
    
    assert units2[0].get('completed') == True, f"单元0应该已完成! completed={units2[0].get('completed')}"
    print("  ✓ 阶段二单元0已标记为完成!")

asyncio.run(test_phase2_checkmark())

print()
print("=" * 60)
print("测试2: 阶段一单元完成后打勾（max_index机制）")
print("=" * 60)

async def test_phase1_checkmark():
    storage.save_learning_progress(test_file_id, 7)
    max_idx = storage.load_learning_max_progress(test_file_id)
    print(f"  保存 progress=7 后: max_index={max_idx}")
    assert max_idx >= 7, f"max_index 应该 >= 7! 实际: {max_idx}"
    
    result = await get_phase_units(test_file_id, 1)
    units = result.get("units", [])
    for u in units:
        print(f"  单元 {u['unit_id']}: word_count={u.get('word_count')}, completed={u.get('completed')}")
    
    assert units[0].get('completed') == True, f"单元0应该已完成!"
    print("  ✓ 阶段一单元0已标记为完成!")
    
    storage.save_learning_progress(test_file_id, 0)
    max_idx2 = storage.load_learning_max_progress(test_file_id)
    print(f"  保存 progress=0 后: max_index={max_idx2}")
    assert max_idx2 >= 7, f"max_index 不应减少! 实际: {max_idx2}"
    
    result2 = await get_phase_units(test_file_id, 1)
    units2 = result2.get("units", [])
    assert units2[0].get('completed') == True, f"重新进入后单元0应该仍然显示完成!"
    print("  ✓ 重新进入后，阶段一单元0仍然标记为完成!")

asyncio.run(test_phase1_checkmark())

print()
print("=" * 60)
print("测试3: 阶段一重新进入已完成单元")
print("=" * 60)

async def test_phase1_reentry():
    storage.save_learning_progress(test_file_id, 0)
    
    from main import get_random_word
    word = await get_random_word(test_file_id)
    print(f"  重新进入单元0，获取第一个单词: {word.get('word')}")
    
    from main import next_word
    next_res = await next_word(test_file_id)
    new_index = next_res.get("new_index")
    print(f"  学完一个词后: new_index={new_index}")
    
    vocab = storage.load_vocab(test_file_id)
    vocab_length = len(vocab)
    print(f"  词汇总数: {vocab_length}")
    
    unit_size = 10
    current_unit_end = min((new_index // unit_size + 1) * unit_size, vocab_length)
    print(f"  当前单元结束索引: {current_unit_end}")
    print(f"  new_index >= current_unit_end? {new_index >= current_unit_end}")
    
    if new_index < current_unit_end:
        print("  ✓ 可以继续学习下一个词（不会立即退出）")
    else:
        print("  单元完成，返回单元列表")

asyncio.run(test_phase1_reentry())

print()
print("=" * 60)
print("所有测试完成!")
print("=" * 60)

if test_dir.exists():
    shutil.rmtree(test_dir)
