#!/usr/bin/env python3
"""
测试 hello world 的完整学习流程
"""

import asyncio
import sys
import os
import json
sys.path.insert(0, '/workspace/backend')

from nvidia_api import NvidiaAPI
from text_processor import TextProcessor
from storage import Storage

async def test_hello_world_flow():
    """测试 hello world 的完整学习流程"""
    print("=" * 60)
    print("测试 hello world 完整学习流程")
    print("=" * 60)
    
    api = NvidiaAPI()
    processor = TextProcessor()
    storage = Storage()
    
    # 创建测试文件
    file_id = "test_hello_world"
    text = "Hello world"
    
    print(f"\n1. 处理文本: '{text}'")
    
    # 处理文本
    sentences = processor.split_sentences(text)
    print(f"   分割句子: {sentences}")
    
    # 模拟处理过程
    sentence_translations = []
    for sentence in sentences:
        if sentence.strip():
            result = await api.process_text_with_dictionary(sentence, "en", "zh")
            sentence_data = {
                "sentence": sentence,
                "translation_result": result
            }
            sentence_translations.append(sentence_data)
            
            # 打印关键信息
            print(f"\n   句子: '{sentence}'")
            if result:
                print(f"   - tokenized_translation: {result.get('tokenized_translation', 'N/A')}")
                print(f"   - redundant_tokens: {result.get('redundant_tokens', [])}")
                if 'translation' in result:
                    tokens = result['translation']
                    print(f"   - translation tokens数量: {len(tokens)}")
                    for t in tokens:
                        if isinstance(t, dict):
                            print(f"     * {t.get('text', 'N/A')} -> {t.get('translation', 'N/A')}")
    
    # 保存数据
    storage.save_pipeline_data(file_id, sentence_translations)
    
    # 提取词典条目
    all_vocab = []
    for i, sentence_data in enumerate(sentence_translations):
        translation_result = sentence_data.get("translation_result", {})
        if isinstance(translation_result, dict) and "dictionary_entries" in translation_result:
            dictionary_entries = translation_result["dictionary_entries"]
            if isinstance(dictionary_entries, list):
                for dict_entry in dictionary_entries:
                    if isinstance(dict_entry, dict):
                        dict_entry["sentence_index"] = i
                        all_vocab.append(dict_entry)
    
    storage.save_vocab(file_id, all_vocab)
    print(f"\n2. 提取词汇: {len(all_vocab)} 个单词")
    for v in all_vocab:
        print(f"   - {v.get('word', 'N/A')}")
    
    # 模拟学习进度
    print(f"\n3. 模拟学习进度")
    
    # 初始状态
    storage.save_learning_progress(file_id, 0)
    
    # 模拟学完单词
    for i in range(len(all_vocab)):
        storage.save_learning_progress(file_id, i + 1)
        current_index = storage.load_learning_progress(file_id)
        print(f"   学完 {i + 1} 个单词，current_index = {current_index}")
    
    print(f"\n4. 检查单元完成状态")
    
    # 模拟前端逻辑
    current_index = storage.load_learning_progress(file_id)
    vocab = storage.load_vocab(file_id)
    vocab_length = len(vocab)
    group_size = 10
    
    current_unit = current_index // group_size
    words_in_unit = min(group_size, vocab_length - current_unit * group_size)
    unit_completed = current_index >= (current_unit * group_size + words_in_unit)
    
    print(f"   current_index = {current_index}")
    print(f"   vocab_length = {vocab_length}")
    print(f"   current_unit = {current_unit}")
    print(f"   words_in_unit = {words_in_unit}")
    print(f"   unit_completed = {unit_completed}")
    
    # 检查句子的translation tokens
    print(f"\n5. 检查句子的 translation tokens")
    sentences_data = storage.load_pipeline_data(file_id)
    for sd in sentences_data:
        sentence = sd.get("sentence", "N/A")
        tr = sd.get("translation_result", {})
        if 'translation' in tr:
            tokens = tr['translation']
            print(f"   '{sentence}' -> {len(tokens)} tokens:")
            for t in tokens:
                if isinstance(t, dict):
                    print(f"     - {t.get('text', 'N/A')} -> {t.get('translation', 'N/A')}")
    
    # 测试 generate_sentence_quiz
    print(f"\n6. 测试 generate_sentence_quiz")
    storage.save_used_sentences(file_id, [])
    
    # 获取eligible_sentences
    current_index = storage.load_learning_progress(file_id)
    learned_words = vocab[:current_index + 1]
    print(f"   learned_words ({len(learned_words)}): {[w.get('word', 'N/A') for w in learned_words]}")
    
    def has_valid_token(sentence_data):
        if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
            tokens = sentence_data["translation_result"]["translation"]
            return len(tokens) >= 1
        return False
    
    eligible_sentences = []
    for sd in sentences_data:
        if not has_valid_token(sd):
            print(f"   跳过: {sd.get('sentence')} (没有有效token)")
            continue
        
        # 获取句子tokens
        sentence_tokens = []
        tr = sd.get("translation_result", {})
        if "translation" in tr:
            for token in tr["translation"]:
                if isinstance(token, dict) and "text" in token:
                    sentence_tokens.append(token["text"].lower())
        
        # 匹配检查
        matched_count = 0
        for lw in learned_words:
            lw_tokens = [lw.get("word", "").lower()]
            if 'tokens' in lw:
                lw_tokens = [t.lower() for t in lw['tokens']]
            
            for lt in lw_tokens:
                for st in sentence_tokens:
                    if lt in st or st in lt:
                        matched_count += 1
                        if matched_count >= 1:
                            eligible_sentences.append(sd)
                            print(f"   ✓ 匹配: {sd.get('sentence')} (matched_count={matched_count})")
                            break
                if matched_count >= 1:
                    break
            if matched_count >= 1:
                break
    
    print(f"\n   eligible_sentences 数量: {len(eligible_sentences)}")
    
    if not eligible_sentences:
        print("   ✗ 没有符合条件的句子!")
    else:
        print(f"   ✓ 有 {len(eligible_sentences)} 个符合条件的句子")

if __name__ == "__main__":
    asyncio.run(test_hello_world_flow())
