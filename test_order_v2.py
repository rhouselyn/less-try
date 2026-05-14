import sys
sys.path.insert(0, '/workspace/backend')

from storage import Storage
import json
import shutil
import random

storage = Storage()
test_file_id = "test_order_v2"
test_dir = storage.get_file_dir(test_file_id)
if test_dir.exists():
    shutil.rmtree(test_dir)

vocab = [
    {"word": "hi", "tokens": ["hi"]},
    {"word": "man", "tokens": ["man"]},
    {"word": "how", "tokens": ["how"]},
    {"word": "are", "tokens": ["are"]},
    {"word": "you", "tokens": ["you"]},
    {"word": "doing", "tokens": ["doing"]},
    {"word": "today", "tokens": ["today"]},
]

storage.save_vocab(test_file_id, vocab)
storage.save_language_settings(test_file_id, "en", "zh")

print("=" * 60)
print("测试1: shuffled_order 一致性")
print("=" * 60)

random.seed(42)
shuffled1 = list(range(len(vocab)))
random.shuffle(shuffled1)
print(f"  第一次 seed(42) shuffle: {shuffled1}")

random.seed(42)
shuffled2 = list(range(len(vocab)))
random.shuffle(shuffled2)
print(f"  第二次 seed(42) shuffle: {shuffled2}")

if shuffled1 == shuffled2:
    print("  ✓ seed(42) 产生一致的顺序!")
else:
    print("  ✗ seed(42) 产生不一致的顺序!")

order1_words = [vocab[i]["word"] for i in shuffled1]
print(f"  单词顺序: {order1_words}")

print()
print("=" * 60)
print("测试2: 重新进入后 used_sentences 阻止翻译题")
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

storage.save_used_sentences(test_file_id, ["Hi man, how are you doing today?"])
used = storage.load_used_sentences(test_file_id)
print(f"  used_sentences: {used}")
print(f"  句子已被标记为已使用，重新进入时不会再次出现翻译题")
print(f"  ✗ 这是问题所在！")

storage.save_used_sentences(test_file_id, [])
used_after_clear = storage.load_used_sentences(test_file_id)
print(f"  清除 used_sentences 后: {used_after_clear}")
print(f"  ✓ 清除后可以重新生成翻译题")

print()
print("=" * 60)
print("结论:")
print("1. shuffled_order 用 seed(42) 生成，每次都一致")
print("2. 重新进入时 used_sentences 阻止翻译题再次出现")
print("3. 修复方案: 重新进入单元时清除 used_sentences")
print("=" * 60)

if test_dir.exists():
    shutil.rmtree(test_dir)
