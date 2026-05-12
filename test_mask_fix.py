import sys
sys.path.insert(0, '/workspace/backend')

from text_processor import TextProcessor

tp = TextProcessor()

test_sentence = "Deploy and scale models on your GPU infrastructure of choice with NVIDIA NIM inference microservices"

words = tp.tokenize_sentence(test_sentence)
print(f"句子单词数: {len(words)}")
print(f"单词列表: {words}")

vocab = [
    {"word": "deploy"}, {"word": "and"}, {"word": "scale"}, {"word": "models"},
    {"word": "on"}, {"word": "your"}, {"word": "gpu"}, {"word": "infrastructure"},
    {"word": "of"}, {"word": "choice"}, {"word": "with"}, {"word": "nvidia"},
    {"word": "nim"}, {"word": "inference"}, {"word": "microservices"}
]

print("\n=== 测试1: 每6个单词一个空 ===")
result = tp.generate_masked_sentence(test_sentence, vocab, words)
print(f"蒙版数量: {len(result['answer_words'])}")
print(f"蒙版位置: {result['mask_indices']}")
print(f"答案词: {result['answer_words']}")
print(f"蒙版句子: {result['masked_sentence']}")
expected_masks = max(1, len(words) // 6)
print(f"预期蒙版数: {expected_masks}")
assert len(result['answer_words']) == expected_masks, f"蒙版数量不对: {len(result['answer_words'])} != {expected_masks}"

print("\n=== 测试2: 3次不同蒙版 ===")
results = tp.generate_multiple_masked_sentences(test_sentence, vocab, words, num_versions=3)
print(f"生成了 {len(results)} 个蒙版版本")
for i, r in enumerate(results):
    print(f"  版本{i}: 位置={r['mask_indices']}, 答案={r['answer_words']}")

all_positions = [tuple(r['mask_indices']) for r in results]
unique_positions = set(all_positions)
print(f"不同蒙版位置数: {len(unique_positions)}")
assert len(results) == 3, f"应该生成3个版本，实际: {len(results)}"

print("\n=== 测试3: 短句子测试 ===")
short_sentence = "Hello world"
short_words = tp.tokenize_sentence(short_sentence)
short_result = tp.generate_masked_sentence(short_sentence, vocab, short_words)
print(f"短句单词数: {len(short_words)}")
print(f"短句蒙版数: {len(short_result['answer_words'])}")
assert len(short_result['answer_words']) >= 1, "短句至少应该有1个蒙版"

print("\n=== 测试4: 中等长度句子 ===")
medium_sentence = "The quick brown fox jumps over the lazy dog"
medium_words = tp.tokenize_sentence(medium_sentence)
medium_result = tp.generate_masked_sentence(medium_sentence, vocab, medium_words)
print(f"中等句单词数: {len(medium_words)}")
expected_medium = max(1, len(medium_words) // 6)
print(f"预期蒙版数: {expected_medium}")
print(f"实际蒙版数: {len(medium_result['answer_words'])}")

print("\n=== 所有测试通过! ===")
