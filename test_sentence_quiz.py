import sys
sys.path.insert(0, '/workspace/backend')

from storage import Storage
import json

file_id = "text_20260510_093047_005"
storage = Storage()

# 加载数据
vocab = storage.load_vocab(file_id)
sentences = storage.load_pipeline_data(file_id)
current_index = storage.load_learning_progress(file_id)
used_sentences = storage.load_used_sentences(file_id) or []

print(f"=== 测试 sentence-quiz API ===")
print(f"current_index: {current_index}")
print(f"used_sentences: {used_sentences}")
print()

learned_words = vocab[:current_index + 1]
learned_word_set = set(word["word"].lower() for word in learned_words)
print(f"已学单词: {[word['word'] for word in learned_words]}")
print()

# 检查每个句子
for sentence_data in sentences:
    if "sentence" in sentence_data:
        sentence = sentence_data["sentence"]
        print(f"检查句子: '{sentence}'")

        # 检查has_valid_token
        def has_valid_token(sd):
            if "translation_result" in sd and "translation" in sd["translation_result"]:
                tokens = sd["translation_result"]["translation"]
                return len(tokens) >= 1
            return False

        print(f"  has_valid_token: {has_valid_token(sentence_data)}")

        # 获取sentence_tokens
        sentence_tokens = []
        if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
            for token in sentence_data["translation_result"]["translation"]:
                if isinstance(token, dict) and "text" in token:
                    sentence_tokens.append(token["text"].lower())
        print(f"  sentence_tokens: {sentence_tokens}")

        # 检查匹配
        matched_count = 0
        for learned_word in learned_words:
            learned_word_tokens = []
            if 'tokens' in learned_word:
                learned_word_tokens = [t.lower() for t in learned_word['tokens']]
            else:
                learned_word_tokens = [learned_word["word"].lower()]

            print(f"    learned_word: {learned_word['word']}, tokens: {learned_word_tokens}")

            for lt in learned_word_tokens:
                for st in sentence_tokens:
                    match = lt in st or st in lt
                    print(f"      '{lt}' in '{st}' = {match}")
                    if match:
                        matched_count += 1
                        if matched_count >= 1:
                            break
                if matched_count >= 1:
                    break
            if matched_count >= 1:
                break

        print(f"  matched_count: {matched_count}")
        print(f"  句子是否被使用: {sentence in used_sentences}")
        print()

print("=== 测试实际API调用 ===")
from main import generate_sentence_quiz
import asyncio

async def test_api():
    try:
        result = await generate_sentence_quiz(file_id)
        print(f"API结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
    except Exception as e:
        print(f"API错误: {e}")

asyncio.run(test_api())
