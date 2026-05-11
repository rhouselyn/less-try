#!/usr/bin/env python3
"""
测试 "hi man. what's up" 句子处理流程
排查：
1. what's up 句子在第二阶段没有选项的原因
2. Phase 1 完成后单元打勾标记问题
"""

import asyncio
import sys
import json
sys.path.insert(0, '/workspace/backend')

from storage import Storage
from nvidia_api import NvidiaAPI
from text_processor import TextProcessor

storage = Storage()
nvidia_api = NvidiaAPI()
text_processor = TextProcessor()

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

async def test_hi_man_whats_up():
    """测试 hi man. what's up 的处理流程"""
    print_section("测试 'hi man. what's up' 句子处理")

    # 1. 查找最新的 file_id
    data_dir = "/workspace/data/files"
    import os
    files = [f for f in os.listdir(data_dir) if f.startswith("text_")]
    if not files:
        print("没有找到处理过的文件")
        return

    # 按时间排序，取最新的
    files.sort(reverse=True)
    file_id = files[0]
    print(f"使用文件ID: {file_id}")

    # 2. 加载句子数据
    sentences = storage.load_pipeline_data(file_id)
    print(f"\n句子总数: {len(sentences)}")

    # 3. 检查每个句子的 translation_result
    for i, sentence_data in enumerate(sentences):
        sentence = sentence_data.get("sentence", "")
        translation_result = sentence_data.get("translation_result", {})
        print(f"\n--- 句子 {i+1}: '{sentence}' ---")

        # 检查 translation_result 的结构
        if not translation_result:
            print("  ❌ 没有 translation_result")
            continue

        print(f"  tokenized_translation: {translation_result.get('tokenized_translation', 'N/A')}")

        # 检查 translation 数组
        translation = translation_result.get("translation", [])
        print(f"  translation 数组长度: {len(translation)}")

        if translation:
            print(f"  translation 数组内容:")
            for j, token in enumerate(translation):
                if isinstance(token, dict):
                    text = token.get("text", token.get("translation", ""))
                    print(f"    [{j}] {json.dumps(token, ensure_ascii=False)}")
                else:
                    print(f"    [{j}] {token}")

        # 检查 has_valid_token 函数
        def has_valid_token(sd):
            if "translation_result" in sd and "translation" in sd["translation_result"]:
                tokens = sd["translation_result"]["translation"]
                return len(tokens) >= 1
            return False

        is_valid = has_valid_token(sentence_data)
        print(f"  has_valid_token: {is_valid}")

        # 检查冗余词
        redundant_tokens = translation_result.get("redundant_tokens", [])
        print(f"  redundant_tokens: {redundant_tokens}")

async def test_generate_sentence_quiz_flow():
    """测试 generateSentenceQuiz 的完整流程"""
    print_section("测试 generateSentenceQuiz 流程")

    data_dir = "/workspace/data/files"
    import os
    files = [f for f in os.listdir(data_dir) if f.startswith("text_")]
    if not files:
        print("没有找到处理过的文件")
        return

    files.sort(reverse=True)
    file_id = files[0]

    # 模拟学习进度（假设已学完第一个单元）
    storage.save_learning_progress(file_id, 10)  # 假设第一个单元有10个单词

    vocab = storage.load_vocab(file_id)
    print(f"\n词汇表总数: {len(vocab)}")

    current_index = storage.load_learning_progress(file_id)
    learned_words = vocab[:current_index + 1]
    learned_word_set = set(word["word"].lower() for word in learned_words)
    print(f"已学单词数: {len(learned_words)}")
    print(f"已学单词: {[w['word'] for w in learned_words]}")

    sentences = storage.load_pipeline_data(file_id)
    print(f"句子总数: {len(sentences)}")

    def has_valid_token(sentence_data):
        if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
            tokens = sentence_data["translation_result"]["translation"]
            return len(tokens) >= 1
        return False

    def clean_token(token):
        import re
        return re.sub(r'[^\w\s]', '', token)

    eligible_sentences = []

    for sentence_data in sentences:
        if "sentence" not in sentence_data:
            continue
        sentence = sentence_data["sentence"]

        if not has_valid_token(sentence_data):
            print(f"\n❌ 句子没有有效token，跳过: '{sentence}'")
            continue

        # 获取该句子的LLM tokens
        sentence_tokens = []
        if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
            for token in sentence_data["translation_result"]["translation"]:
                if isinstance(token, dict) and "text" in token:
                    sentence_tokens.append(token["text"].lower())

        print(f"\n--- 检查句子: '{sentence}' ---")
        print(f"  sentence_tokens: {sentence_tokens}")

        # 检查匹配
        matched_count = 0
        matched_pairs = []
        for learned_word in learned_words:
            learned_word_tokens = []
            if 'tokens' in learned_word:
                learned_word_tokens = [t.lower() for t in learned_word['tokens']]
            else:
                learned_word_tokens = [learned_word["word"].lower()]

            for lt in learned_word_tokens:
                for st in sentence_tokens:
                    if lt in st or st in lt:
                        matched_count += 1
                        matched_pairs.append((lt, st))
                        print(f"  ✅ 匹配: '{lt}' <-> '{st}'")

            if matched_count >= 1:
                eligible_sentences.append(sentence_data)
                print(f"  → 句子符合条件！")
                break

        if matched_count == 0:
            print(f"  ❌ 没有匹配的单词")

    print(f"\n符合条件的句子总数: {len(eligible_sentences)}")

    # 尝试为每个符合条件的句子生成选项
    for sentence_data in eligible_sentences[:3]:  # 只测试前3个
        sentence = sentence_data["sentence"]
        translation_result = sentence_data.get("translation_result", {})
        tokenized_translation = translation_result.get("tokenized_translation", "")
        redundant_tokens = translation_result.get("redundant_tokens", [])

        # 生成正确答案的token列表
        correct_tokens = []
        if "translation" in translation_result:
            for token in translation_result["translation"]:
                if isinstance(token, dict):
                    if "translation" in token:
                        text = token["translation"]
                    elif "text" in token:
                        text = token["text"]
                    else:
                        continue
                    cleaned_text = clean_token(text)
                    if cleaned_text:
                        correct_tokens.append(cleaned_text)

        # 清理冗余词
        cleaned_redundant_tokens = []
        for token in redundant_tokens:
            cleaned_text = clean_token(token)
            if cleaned_text and cleaned_text not in correct_tokens:
                cleaned_redundant_tokens.append(cleaned_text)

        # 过滤掉重复的冗余词，只保留不超过3个
        unique_redundant = list(set(cleaned_redundant_tokens))
        selected_distractors = unique_redundant[:3]

        # 合并正确tokens和干扰词
        all_tokens = correct_tokens + selected_distractors

        print(f"\n句子: '{sentence}'")
        print(f"  correct_tokens: {correct_tokens}")
        print(f"  selected_distractors: {selected_distractors}")
        print(f"  all_tokens (打乱前): {all_tokens}")

        if len(all_tokens) <= 1:
            print(f"  ⚠️ 警告: 选项数量太少 ({len(all_tokens)})，可能导致无法选择！")
        else:
            import random
            random.shuffle(all_tokens)
            print(f"  all_tokens (打乱后): {all_tokens}")

async def test_unit_completed_consistency():
    """测试 unit_completed 的一致性问题"""
    print_section("测试 unit_completed 一致性")

    data_dir = "/workspace/data/files"
    import os
    files = [f for f in os.listdir(data_dir) if f.startswith("text_")]
    if not files:
        return

    files.sort(reverse=True)
    file_id = files[0]

    # 模拟已学完第一个单元
    storage.save_learning_progress(file_id, 10)

    vocab = storage.load_vocab(file_id)
    current_index = storage.load_learning_progress(file_id)

    print(f"current_index: {current_index}")
    print(f"vocab 长度: {len(vocab)}")

    # 模拟 checkCoverage 的逻辑
    group_size = 10
    current_unit = current_index // group_size
    words_in_current_unit = min(group_size, len(vocab) - current_unit * group_size)
    end_of_current_unit = current_unit * group_size + words_in_current_unit

    print(f"current_unit: {current_unit}")
    print(f"words_in_current_unit: {words_in_current_unit}")
    print(f"end_of_current_unit: {end_of_current_unit}")

    unit_completed = current_index >= end_of_current_unit
    print(f"\ncheckCoverage 的 unit_completed: {unit_completed}")

    # 检查 generateSentenceQuiz 是否返回 unit_completed
    print(f"\ngenerateSentenceQuiz 的返回值:")
    print(f"  根据代码分析，该函数返回:")
    print(f"    - original_sentence")
    print(f"    - correct_translation")
    print(f"    - correct_tokens")
    print(f"    - tokens")
    print(f"  ⚠️ 问题: 该函数没有返回 unit_completed 字段!")

async def main():
    await test_hi_man_whats_up()
    await test_generate_sentence_quiz_flow()
    await test_unit_completed_consistency()

    print_section("测试总结")
    print("""
根据测试结果，发现以下问题：

1. what's up 没有选项的原因：
   - 需要检查 translation_result 中是否有 translation 数组
   - 需要检查是否生成了冗余词 (redundant_tokens)
   - 如果 all_tokens 数量 <= 1，则无法生成选择题

2. Phase 1 完成后单元不打勾的原因：
   - checkCoverage 返回 unit_completed: True (当 current_index >= end_of_current_unit)
   - generateSentenceQuiz 没有返回 unit_completed 字段
   - 前端 getNextWord 函数可能没有正确处理 unit_completed
""")

if __name__ == "__main__":
    asyncio.run(main())
