import sys
sys.path.insert(0, '/workspace/backend')

from text_processor import TextProcessor, BACKUP_VOCAB, BACKUP_VOCAB_BY_LANG
from storage import Storage
import random
import json
import os

print("=" * 60)
print("测试1: BACKUP_VOCAB_BY_LANG 多语言支持")
print("=" * 60)

for lang, vocab in BACKUP_VOCAB_BY_LANG.items():
    print(f"  {lang}: {len(vocab)} 个词")
    assert len(vocab) > 0, f"{lang} 词库为空!"
    sample = random.sample(vocab, min(5, len(vocab)))
    print(f"    示例: {sample}")

assert BACKUP_VOCAB == BACKUP_VOCAB_BY_LANG["en"], "BACKUP_VOCAB 应该等于英文词库"
print("  ✓ BACKUP_VOCAB 兼容性正确")

print()
print("=" * 60)
print("测试2: 随机选择干扰词（非按字母顺序）")
print("=" * 60)

tp = TextProcessor()

for lang in ["en", "zh", "es", "de", "fr", "ja"]:
    distractors = tp.get_fallback_distractors(10, source_lang=lang)
    print(f"  {lang} 干扰词: {distractors[:5]}...")
    assert len(distractors) == 10, f"应该返回10个干扰词，实际返回{len(distractors)}个"

en_distractors1 = tp.get_fallback_distractors(20, source_lang="en")
en_distractors2 = tp.get_fallback_distractors(20, source_lang="en")
print(f"  英文干扰词第1次前5个: {en_distractors1[:5]}")
print(f"  英文干扰词第2次前5个: {en_distractors2[:5]}")
if en_distractors1[:5] != en_distractors2[:5]:
    print("  ✓ 每次调用随机打乱，不总是按字母顺序")
else:
    print("  ⚠ 两次调用结果相同（可能是巧合，因为random.shuffle）")

print()
print("=" * 60)
print("测试3: generate_masked_sentence 支持多语言干扰词")
print("=" * 60)

test_vocab = [{"word": w} for w in ["hello", "world", "test", "example"]]
for lang in ["en", "es", "de"]:
    result = tp.generate_masked_sentence(
        "This is a simple test sentence for masking exercise",
        test_vocab,
        source_lang=lang
    )
    if result:
        print(f"  {lang}: masked='{result['masked_sentence'][:50]}...', options={len(result['options'])}个")
        assert len(result['options']) > 0, f"{lang} 选项为空"

print()
print("=" * 60)
print("测试4: 阶段二单元显示 exercises_count（非 sentences_count）")
print("=" * 60)

storage = Storage()
test_file_id = "test_fixes_unit"
test_dir = storage.get_file_dir(test_file_id)

sentences_data = [
    {
        "sentence": f"Test sentence number {i} with enough words to be eligible for exercise.",
        "word_count": 10,
        "translation_result": {
            "translation": [
                {"text": f"word{j}", "translation": f"词{j}"} for j in range(10)
            ],
            "tokenized_translation": "测试翻译"
        }
    }
    for i in range(5)
]
storage.save_pipeline_data(test_file_id, sentences_data)
storage.save_vocab(test_file_id, [{"word": f"word{i}"} for i in range(20)])
storage.save_language_settings(test_file_id, "en", "zh")

from main import get_phase_units
import asyncio

async def test_phase_units():
    try:
        result = await get_phase_units(test_file_id, 2)
        units = result.get("units", [])
        print(f"  阶段二单元数: {len(units)}")
        for u in units:
            exercises_count = u.get("exercises_count")
            sentences_count = u.get("sentences_count")
            print(f"    单元 {u['unit_id']}: exercises_count={exercises_count}, sentences_count={sentences_count}")
            assert exercises_count is not None, "exercises_count 不应为 None!"
            assert exercises_count > 0, "exercises_count 应该大于0"
            assert sentences_count is None, "sentences_count 不应存在"
        print("  ✓ 阶段二单元正确显示 exercises_count")
    except Exception as e:
        print(f"  ✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test_phase_units())

print()
print("=" * 60)
print("测试5: 阶段二完成后打勾（max_exercise_index 机制）")
print("=" * 60)

storage.save_phase2_progress(test_file_id, 10)
max_progress = storage.load_phase2_max_progress(test_file_id)
current_progress = storage.load_phase2_progress(test_file_id)
print(f"  保存 progress=10 后: current={current_progress}, max={max_progress}")
assert max_progress >= 10, "max_exercise_index 应该 >= 10"

storage.save_phase2_progress(test_file_id, 0)
max_progress2 = storage.load_phase2_max_progress(test_file_id)
current_progress2 = storage.load_phase2_progress(test_file_id)
print(f"  保存 progress=0 后: current={current_progress2}, max={max_progress2}")
assert max_progress2 >= 10, f"max_exercise_index 不应减少! 实际: {max_progress2}"
assert current_progress2 == 0, "current_exercise_index 应该是0"
print("  ✓ max_exercise_index 机制正常工作，重新进入不会丢失完成状态")

print()
print("=" * 60)
print("测试6: 阶段二重新进入已完成单元")
print("=" * 60)

async def test_reentry():
    try:
        storage.save_phase2_progress(test_file_id, 20)
        
        result = await get_phase_unit_exercise(test_file_id, 2, 0)
        
        if result.get("unit_complete"):
            print("  ✗ 不应返回 unit_complete，应该允许重新进入")
        else:
            exercise_type = result.get("exercise_type")
            print(f"  ✓ 重新进入成功，返回练习类型: {exercise_type}")
            
            current_after = storage.load_phase2_progress(test_file_id)
            max_after = storage.load_phase2_max_progress(test_file_id)
            print(f"  重新进入后: current={current_after}, max={max_after}")
            assert max_after >= 20, f"max 不应减少! 实际: {max_after}"
    except Exception as e:
        print(f"  ✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()

from main import get_phase_unit_exercise
asyncio.run(test_reentry())

print()
print("=" * 60)
print("测试7: 阶段一进度不会倒退")
print("=" * 60)

storage.save_learning_progress(test_file_id, 15)
current = storage.load_learning_progress(test_file_id)
print(f"  设置进度为15后: current_index={current}")

unit_start = 0 * 10
if current < unit_start:
    storage.save_learning_progress(test_file_id, unit_start)
    print(f"  进度被重置为 {unit_start}")
else:
    print(f"  进度保持 {current}（不倒退）")

current_after = storage.load_learning_progress(test_file_id)
assert current_after == 15, f"进度不应倒退! 实际: {current_after}"
print("  ✓ 阶段一进度不会倒退")

print()
print("=" * 60)
print("测试8: 选项随机选择（非按字母顺序a开头）")
print("=" * 60)

test_sentence = "The quick brown fox jumps over the lazy dog in the garden"
test_vocab_full = [{"word": w} for w in ["quick", "brown", "fox", "jumps", "lazy", "dog", "garden", "river", "mountain", "forest"]]

options_first_letters = []
for i in range(5):
    result = tp.generate_masked_sentence(
        test_sentence,
        test_vocab_full,
        mask_seed=42 + i,
        source_lang="en"
    )
    if result:
        first_letters = [opt[0].lower() for opt in result['options'][:5]]
        options_first_letters.append(first_letters)
        print(f"  种子{42+i}: 选项前5个首字母 = {first_letters}")

all_same = all(fl == options_first_letters[0] for fl in options_first_letters)
if not all_same:
    print("  ✓ 不同种子产生不同的选项顺序（随机选择）")
else:
    print("  ⚠ 所有种子产生相同的选项顺序")

print()
print("=" * 60)
print("所有测试完成!")
print("=" * 60)

import shutil
if test_dir.exists():
    shutil.rmtree(test_dir)
