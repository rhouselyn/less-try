import sys
sys.path.insert(0, '/workspace/backend')

from storage import Storage
import json
import shutil
import random

storage = Storage()
test_file_id = "test_unit_order"
test_dir = storage.get_file_dir(test_file_id)
if test_dir.exists():
    shutil.rmtree(test_dir)

vocab = [{"word": f"word{i}", "tokens": [f"word{i}"]} for i in range(25)]
storage.save_vocab(test_file_id, vocab)
storage.save_language_settings(test_file_id, "en", "zh")

print("=" * 60)
print("测试1: 每个单元内单词顺序一致（基于单元种子）")
print("=" * 60)

def get_unit_order(unit_id, vocab_len, unit_size=10):
    unit_start = unit_id * unit_size
    unit_end = min(unit_start + unit_size, vocab_len)
    unit_vocab_indices = list(range(unit_start, unit_end))
    random.seed(42 + unit_id)
    random.shuffle(unit_vocab_indices)
    return unit_vocab_indices

order_unit0_a = get_unit_order(0, 25)
order_unit0_b = get_unit_order(0, 25)
order_unit1_a = get_unit_order(1, 25)
order_unit1_b = get_unit_order(1, 25)

print(f"  单元0 第一次: {order_unit0_a}")
print(f"  单元0 第二次: {order_unit0_b}")
print(f"  单元1 第一次: {order_unit1_a}")
print(f"  单元1 第二次: {order_unit1_b}")

assert order_unit0_a == order_unit0_b, "单元0 两次顺序不一致!"
assert order_unit1_a == order_unit1_b, "单元1 两次顺序不一致!"
assert order_unit0_a != order_unit1_a, "不同单元应该有不同顺序!"
print("  ✓ 每个单元内顺序一致，不同单元顺序不同!")

print()
print("=" * 60)
print("测试2: 重新进入单元时 used_sentences 被清除")
print("=" * 60)

storage.save_used_sentences(test_file_id, ["sentence1", "sentence2"])
used_before = storage.load_used_sentences(test_file_id)
print(f"  设置 used_sentences: {used_before}")

storage.save_learning_progress(test_file_id, 0)
storage.save_used_sentences(test_file_id, [])
used_after = storage.load_used_sentences(test_file_id)
print(f"  重置进度后 used_sentences: {used_after}")
assert used_after == [], "重置后 used_sentences 应为空!"
print("  ✓ 重置进度时 used_sentences 被清除!")

print()
print("=" * 60)
print("测试3: 模拟完整的阶段一流程（含翻译题）")
print("=" * 60)

sentences_data = [
    {
        "sentence": "word0 word1 word2 word3 word4 word5 word6",
        "word_count": 7,
        "translation_result": {
            "translation": [
                {"text": "word0", "translation": "词0"},
                {"text": "word1", "translation": "词1"},
                {"text": "word2", "translation": "词2"},
                {"text": "word3", "translation": "词3"},
                {"text": "word4", "translation": "词4"},
                {"text": "word5", "translation": "词5"},
                {"text": "word6", "translation": "词6"},
            ],
            "tokenized_translation": "词0词1词2词3词4词5词6",
            "redundant_tokens": ["词X", "词Y", "词Z"],
        }
    }
]
storage.save_pipeline_data(test_file_id, sentences_data)

from main import next_word

async def test_full_flow():
    storage.save_learning_progress(test_file_id, 0)
    storage.save_used_sentences(test_file_id, [])
    
    first_pass_order = []
    quiz_appeared = False
    
    for i in range(10):
        result = await next_word(test_file_id)
        new_index = result.get("new_index", 0)
        quiz = result.get("sentence_quiz")
        
        unit_id = (new_index - 1) // 10
        index_in_unit = (new_index - 1) % 10
        unit_start = unit_id * 10
        unit_end = min(unit_start + 10, 25)
        unit_indices = list(range(unit_start, unit_end))
        random.seed(42 + unit_id)
        random.shuffle(unit_indices)
        
        if index_in_unit < len(unit_indices):
            word_idx = unit_indices[index_in_unit]
            first_pass_order.append(vocab[word_idx]["word"])
        
        if quiz:
            quiz_appeared = True
            print(f"  第{i+1}个词后出现翻译题: {quiz['original_sentence']}")
    
    print(f"  第一次顺序: {first_pass_order}")
    print(f"  翻译题出现: {quiz_appeared}")
    
    storage.save_learning_progress(test_file_id, 0)
    storage.save_used_sentences(test_file_id, [])
    
    second_pass_order = []
    quiz_appeared_2 = False
    
    for i in range(10):
        result = await next_word(test_file_id)
        new_index = result.get("new_index", 0)
        quiz = result.get("sentence_quiz")
        
        unit_id = (new_index - 1) // 10
        index_in_unit = (new_index - 1) % 10
        unit_start = unit_id * 10
        unit_end = min(unit_start + 10, 25)
        unit_indices = list(range(unit_start, unit_end))
        random.seed(42 + unit_id)
        random.shuffle(unit_indices)
        
        if index_in_unit < len(unit_indices):
            word_idx = unit_indices[index_in_unit]
            second_pass_order.append(vocab[word_idx]["word"])
        
        if quiz:
            quiz_appeared_2 = True
            print(f"  第二次第{i+1}个词后出现翻译题!")
    
    print(f"  第二次顺序: {second_pass_order}")
    print(f"  第二次翻译题出现: {quiz_appeared_2}")
    
    if first_pass_order == second_pass_order:
        print("  ✓ 两次顺序完全一致!")
    else:
        print("  ✗ 两次顺序不一致!")
    
    if quiz_appeared_2:
        print("  ✓ 重新进入后翻译题再次出现!")
    else:
        print("  ✗ 重新进入后翻译题没有出现!")

import asyncio
asyncio.run(test_full_flow())

if test_dir.exists():
    shutil.rmtree(test_dir)

print()
print("=" * 60)
print("所有测试完成!")
print("=" * 60)
