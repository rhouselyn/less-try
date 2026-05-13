import sys
sys.path.insert(0, '/workspace/backend')

from storage import Storage
from text_processor import TextProcessor
import json
import os
import shutil
import asyncio

storage = Storage()
tp = TextProcessor()

print("=" * 60)
print("问题1: 阶段二单元完成后打勾测试")
print("=" * 60)

test_file_id = "test_real_scenario"
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
            "grammar_explanation": "这是一个日常问候语",
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

from main import get_phase_units, get_phase_unit_exercise, next_phase_exercise, check_coverage

async def test_phase2_completion():
    print("\n--- 获取阶段二单元列表 ---")
    result = await get_phase_units(test_file_id, 2)
    units = result.get("units", [])
    print(f"  单元数: {len(units)}")
    for u in units:
        print(f"  单元 {u['unit_id']}: exercises_count={u.get('exercises_count')}, completed={u.get('completed')}")
    
    if not units:
        print("  ✗ 没有阶段二单元!")
        return
    
    total_exercises = units[0].get('exercises_count', 0)
    print(f"  单元0总题目数: {total_exercises}")
    
    if total_exercises == 0:
        print("  ✗ 单元0没有题目!")
        return
    
    print("\n--- 完成单元0的所有题目 ---")
    for i in range(total_exercises):
        exercise = await get_phase_unit_exercise(test_file_id, 2, 0)
        exercise_type = exercise.get('exercise_type', 'unknown')
        exercise_idx = exercise.get('exercise_index_in_unit', '?')
        total_in_unit = exercise.get('total_exercises_in_unit', '?')
        is_last = (exercise_idx + 1) >= total_in_unit
        print(f"  题目 {exercise_idx + 1}/{total_in_unit}: {exercise_type} {'[最后一题!]' if is_last else ''}")
        
        next_res = await next_phase_exercise(test_file_id, 2, 0)
        
        if next_res.get('unit_complete'):
            print(f"  ✓ 后端返回 unit_complete=True!")
            break
        elif next_res.get('all_complete'):
            print(f"  ✓ 后端返回 all_complete=True!")
            break
    
    print("\n--- 检查完成状态 ---")
    current_progress = storage.load_phase2_progress(test_file_id)
    max_progress = storage.load_phase2_max_progress(test_file_id)
    print(f"  current_exercise_index: {current_progress}")
    print(f"  max_exercise_index: {max_progress}")
    
    result2 = await get_phase_units(test_file_id, 2)
    units2 = result2.get("units", [])
    for u in units2:
        print(f"  单元 {u['unit_id']}: exercises_count={u.get('exercises_count')}, completed={u.get('completed')}")
    
    if units2[0].get('completed'):
        print("  ✓ 单元0已标记为完成!")
    else:
        print("  ✗ 单元0未标记为完成! BUG!")

asyncio.run(test_phase2_completion())

print()
print("=" * 60)
print("问题2: 阶段一第一单元完成后没有翻译题")
print("=" * 60)

async def test_phase1_coverage():
    # 模拟学完第一单元（7个词，索引0-6，学完后current_index=7）
    # 但实际上getNextWord在学完每个词后调用nextWord API，index+1
    # 第一单元有7个词，学完后current_index=7
    
    storage.save_learning_progress(test_file_id, 7)
    current = storage.load_learning_progress(test_file_id)
    print(f"  设置学习进度为7（学完所有7个词）")
    print(f"  当前学习进度: {current}")
    
    coverage = await check_coverage(test_file_id)
    print(f"  can_form_sentences: {coverage.get('can_form_sentences')}")
    print(f"  unit_completed: {coverage.get('unit_completed')}")
    
    if not coverage.get('can_form_sentences'):
        print("  ✗ 不能生成句子! 原因分析:")
        
        vocab = storage.load_vocab(test_file_id)
        sentences = storage.load_pipeline_data(test_file_id)
        print(f"  词汇数: {len(vocab)}, 句子数: {len(sentences)}")
        
        for s in sentences:
            if "sentence" in s:
                word_count = s.get("word_count", 0)
                print(f"  句子: '{s['sentence']}' word_count={word_count}")
                
                if word_count < 2:
                    tr = s.get("translation_result", {})
                    if "translation" in tr:
                        actual_count = len(tr["translation"])
                        print(f"    translation tokens count: {actual_count}")
                
                tr = s.get("translation_result", {})
                if "translation" in tr:
                    tokens = [t.get("text", "").lower() for t in tr["translation"] if isinstance(t, dict) and "text" in t]
                    print(f"    sentence tokens: {tokens}")
                    
                    for w in vocab:
                        w_tokens = w.get("tokens", [w["word"]])
                        for wt in w_tokens:
                            for st in tokens:
                                if wt.lower() in st or st in wt.lower():
                                    print(f"    匹配: {wt} <-> {st}")
    else:
        print("  ✓ 可以生成句子!")

asyncio.run(test_phase1_coverage())

print()
print("=" * 60)
print("问题3: 再次进入阶段一第一单元只做一个单词就退出")
print("=" * 60)

async def test_phase1_reentry():
    # 模拟已学完第一单元（7个词），current_index=7
    storage.save_learning_progress(test_file_id, 7)
    
    # 模拟用户点击第一单元（unitId=0）
    progressData = {"current_index": 7}  # 模拟API返回
    currentIndex = progressData.get("current_index", 0)
    unitStart = 0 * 10  # 0
    print(f"  当前进度: {currentIndex}, 单元起始: {unitStart}")
    print(f"  currentIndex < unitStart? {currentIndex < unitStart}")
    
    if currentIndex < unitStart:
        print("  会调用 setProgress(0)")
    else:
        print("  不会调用 setProgress（进度不倒退）")
    
    # 然后调用getRandomWord，获取当前索引的单词
    # current_index=7，但只有7个词（索引0-6），所以会循环
    print(f"  getRandomWord 会返回索引7%7=0的单词（循环回到第一个词）")
    
    # 用户学完一个词后调用nextWord
    # nextWord会将current_index从7增加到8
    # 然后getNextWord检查：newIndex=8 >= vocabLength=7 → allWordsLearned=True
    # 然后检查coverage → can_form_sentences
    # 如果can_form_sentences=False → 直接返回单元列表
    
    print("  nextWord后: newIndex=8 >= vocabLength=7 → allWordsLearned=True")
    print("  然后checkCoverage → 如果can_form_sentences=False → 直接退出到单元列表!")
    print("  ✗ 这就是问题！重新进入已完成的单元，学一个词就退出了!")

asyncio.run(test_phase1_reentry())

if test_dir.exists():
    shutil.rmtree(test_dir)
