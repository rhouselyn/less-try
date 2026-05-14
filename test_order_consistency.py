import sys
sys.path.insert(0, '/workspace/backend')

from storage import Storage
import json
import shutil
import asyncio

storage = Storage()
test_file_id = "test_order_consistency"
test_dir = storage.get_file_dir(test_file_id)
if test_dir.exists():
    shutil.rmtree(test_dir)

vocab = [
    {"word": "hi", "tokens": ["hi"], "translation": "嗨"},
    {"word": "man", "tokens": ["man"], "translation": "伙计"},
    {"word": "how", "tokens": ["how"], "translation": "怎样"},
    {"word": "are", "tokens": ["are"], "translation": "是"},
    {"word": "you", "tokens": ["you"], "translation": "你"},
    {"word": "doing", "tokens": ["doing"], "translation": "做"},
    {"word": "today", "tokens": ["today"], "translation": "今天"},
]

storage.save_vocab(test_file_id, vocab)
storage.save_language_settings(test_file_id, "en", "zh")

from main import get_random_word, next_word

print("=" * 60)
print("测试1: 单词顺序一致性")
print("=" * 60)

async def test_order():
    storage.save_learning_progress(test_file_id, 0)
    
    order1 = []
    for i in range(7):
        word = await get_random_word(test_file_id)
        order1.append(word.get("word", "?"))
        await next_word(test_file_id)
    
    print(f"  第一次顺序: {order1}")
    
    storage.save_learning_progress(test_file_id, 0)
    
    order2 = []
    for i in range(7):
        word = await get_random_word(test_file_id)
        order2.append(word.get("word", "?"))
        await next_word(test_file_id)
    
    print(f"  第二次顺序: {order2}")
    
    if order1 == order2:
        print("  ✓ 两次顺序一致!")
    else:
        print("  ✗ 两次顺序不一致!")

asyncio.run(test_order())

print()
print("=" * 60)
print("测试2: 重新进入后翻译题是否出现")
print("=" * 60)

sentences_data = [
    {
        "sentence": "Hi man, how are you doing today?",
        "word_count": 7,
        "translation_result": {
            "translation": [
                {"text": "Hi", "translation": "嗨"},
                {"text": "man", "translation": "伙计"},
                {"text": "how", "translation": "怎样"},
                {"text": "are", "translation": "是"},
                {"text": "you", "translation": "你"},
                {"text": "doing", "translation": "做"},
                {"text": "today", "translation": "今天"},
            ],
            "tokenized_translation": "嗨，伙计，你今天怎么样？",
            "redundant_tokens": ["昨天", "明天", "很好", "他们"],
        }
    }
]
storage.save_pipeline_data(test_file_id, sentences_data)

async def test_translation_reentry():
    storage.save_learning_progress(test_file_id, 0)
    if test_dir.exists():
        used_path = test_dir / "used_sentences.json"
        if used_path.exists():
            used_path.unlink()
    
    print("  --- 第一次进入 ---")
    for i in range(7):
        word = await get_random_word(test_file_id)
        result = await next_word(test_file_id)
        quiz = result.get("sentence_quiz")
        if quiz:
            print(f"  第{i+1}个词后出现翻译题: {quiz['original_sentence']}")
            break
    
    used = storage.load_used_sentences(test_file_id) or []
    print(f"  used_sentences: {used}")
    
    print("\n  --- 重新进入（重置进度） ---")
    storage.save_learning_progress(test_file_id, 0)
    
    for i in range(7):
        word = await get_random_word(test_file_id)
        result = await next_word(test_file_id)
        quiz = result.get("sentence_quiz")
        if quiz:
            print(f"  ✓ 第{i+1}个词后再次出现翻译题!")
            break
    else:
        print(f"  ✗ 重新进入后没有翻译题!")

asyncio.run(test_translation_reentry())

if test_dir.exists():
    shutil.rmtree(test_dir)
