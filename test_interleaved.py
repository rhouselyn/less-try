import sys
sys.path.insert(0, '/workspace/backend')

from text_processor import TextProcessor

tp = TextProcessor()

print("=== 测试1: 交叉出题顺序生成 ===")
order = tp.generate_interleaved_exercise_order(3, masks_per_sentence=3, seed=42)
print(f"3个句子的练习顺序 (共{len(order)}题):")
for i, (sent_idx, type_idx) in enumerate(order):
    type_name = f"选词填空{type_idx+1}" if type_idx < 3 else "翻译还原"
    print(f"  第{i+1}题: 句子{sent_idx+1} - {type_name}")

sentences_seen = set()
for sent_idx, type_idx in order:
    sentences_seen.add(sent_idx)
assert len(sentences_seen) == 3, "应该包含3个句子"
assert len(order) == 12, "3个句子×4题=12题"

for s in range(3):
    s_types = [type_idx for sent_idx, type_idx in order if sent_idx == s]
    assert s_types == [0, 1, 2, 3], f"句子{s}内部顺序应为[0,1,2,3]，实际为{s_types}"
print("  ✅ 句子内部顺序正确: 选词1→选词2→选词3→翻译")

cross_sentence = False
for i in range(len(order) - 1):
    if order[i][0] != order[i+1][0]:
        cross_sentence = True
        break
if cross_sentence:
    print("  ✅ 不同句子之间有穿插")
else:
    print("  ⚠️ 不同句子之间没有穿插（可能是随机结果）")

print("\n=== 测试2: 10题一个单元分组 ===")
unit_size = 10
num_units = max(1, (len(order) + unit_size - 1) // unit_size)
print(f"12题 → {num_units}个单元")
for i in range(num_units):
    start = i * unit_size
    end = min(start + unit_size, len(order))
    unit_exercises = order[start:end]
    print(f"  单元{i+1}: {end-start}题")
    for j, (sent_idx, type_idx) in enumerate(unit_exercises):
        type_name = f"选词{type_idx+1}" if type_idx < 3 else "翻译"
        print(f"    第{j+1}题: 句子{sent_idx+1}-{type_name}")

print("\n=== 测试3: 蒙版频率 (每6个单词一个空) ===")
test_sentence = "Deploy and scale models on your GPU infrastructure of choice with NVIDIA NIM inference microservices"
words = tp.tokenize_sentence(test_sentence)
result = tp.generate_masked_sentence(test_sentence, [], words)
expected = max(1, len(words) // 6)
print(f"句子: {test_sentence}")
print(f"单词数: {len(words)}, 蒙版数: {len(result['answer_words'])}, 预期: {expected}")
assert len(result['answer_words']) == expected, f"蒙版数不对"
print("  ✅ 蒙版频率正确")

print("\n=== 测试4: 3次不同蒙版 ===")
results = tp.generate_multiple_masked_sentences(test_sentence, [], words, num_versions=3)
print(f"生成了 {len(results)} 个蒙版版本")
for i, r in enumerate(results):
    print(f"  版本{i+1}: 位置={r['mask_indices']}, 答案={r['answer_words']}")
assert len(results) == 3
print("  ✅ 3次不同蒙版生成正确")

print("\n=== 测试5: 多句子交叉出题 ===")
order2 = tp.generate_interleaved_exercise_order(5, masks_per_sentence=3, seed=123)
print(f"5个句子的练习顺序 (共{len(order2)}题):")
for i, (sent_idx, type_idx) in enumerate(order2):
    type_name = f"选词{type_idx+1}" if type_idx < 3 else "翻译"
    print(f"  第{i+1:2d}题: 句子{sent_idx+1} - {type_name}")

num_units2 = max(1, (len(order2) + 9) // 10)
print(f"\n20题 → {num_units2}个单元 (10题/单元)")
for i in range(num_units2):
    start = i * 10
    end = min(start + 10, len(order2))
    print(f"  单元{i+1}: 第{start+1}-{end}题")

for s in range(5):
    s_types = [type_idx for sent_idx, type_idx in order2 if sent_idx == s]
    assert s_types == [0, 1, 2, 3], f"句子{s}内部顺序不对"
print("  ✅ 所有句子内部顺序正确")

print("\n=== 所有测试通过! ===")
