#!/usr/bin/env python3
"""
测试第一阶段句子翻译题目功能
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from text_processor import TextProcessor

# 创建TextProcessor实例
text_processor = TextProcessor()

# 模拟词汇数据
def test_check_coverage():
    print("=== 测试第一阶段句子翻译题目功能 ===")
    
    # 模拟词汇数据
    vocab = [
        {"word": "Hello", "sentence_index": 0},
        {"word": "world", "sentence_index": 0},
        {"word": "What's", "sentence_index": 1},
        {"word": "up", "sentence_index": 1},
        {"word": "How", "sentence_index": 2},
        {"word": "are", "sentence_index": 2},
        {"word": "you", "sentence_index": 2}
    ]
    
    # 模拟句子数据
    sentences = [
        {"sentence": "Hello world!"},
        {"sentence": "What's up?"},
        {"sentence": "How are you?"}
    ]
    
    # 测试用例 1: 学习进度为0，还没有学习任何单词
    print("\n测试用例 1: 学习进度为0")
    current_index = 0
    all_words_learned = current_index >= len(vocab)
    
    if all_words_learned:
        learned_word_set = set(word["word"].lower() for word in vocab)
    else:
        learned_words = vocab[:current_index]
        learned_word_set = set(word["word"].lower() for word in learned_words)
    
    can_form = False
    for sentence_data in sentences:
        if "sentence" in sentence_data:
            sentence = sentence_data["sentence"]
            words_in_sentence = set(word.lower() for word in text_processor.tokenize_sentence(sentence))
            if words_in_sentence.issubset(learned_word_set) and len(words_in_sentence) >= 2:
                can_form = True
                break
    
    print(f"学习进度: {current_index}/{len(vocab)}")
    print(f"已学单词: {learned_word_set}")
    print(f"是否可以生成句子翻译题目: {can_form}")
    
    # 测试用例 2: 学习进度为4，学习了4个单词
    print("\n测试用例 2: 学习进度为4")
    current_index = 4
    all_words_learned = current_index >= len(vocab)
    
    if all_words_learned:
        learned_word_set = set(word["word"].lower() for word in vocab)
    else:
        learned_words = vocab[:current_index]
        learned_word_set = set(word["word"].lower() for word in learned_words)
    
    can_form = False
    eligible_sentences = []
    for sentence_data in sentences:
        if "sentence" in sentence_data:
            sentence = sentence_data["sentence"]
            words_in_sentence = set(word.lower() for word in text_processor.tokenize_sentence(sentence))
            if words_in_sentence.issubset(learned_word_set) and len(words_in_sentence) >= 2:
                can_form = True
                eligible_sentences.append(sentence)
    
    print(f"学习进度: {current_index}/{len(vocab)}")
    print(f"已学单词: {learned_word_set}")
    print(f"是否可以生成句子翻译题目: {can_form}")
    print(f"符合条件的句子: {eligible_sentences}")
    
    # 测试用例 3: 学习完所有单词
    print("\n测试用例 3: 学习完所有单词")
    current_index = len(vocab)
    all_words_learned = current_index >= len(vocab)
    
    if all_words_learned:
        learned_word_set = set(word["word"].lower() for word in vocab)
    else:
        learned_words = vocab[:current_index]
        learned_word_set = set(word["word"].lower() for word in learned_words)
    
    can_form = False
    eligible_sentences = []
    for sentence_data in sentences:
        if "sentence" in sentence_data:
            sentence = sentence_data["sentence"]
            words_in_sentence = set(word.lower() for word in text_processor.tokenize_sentence(sentence))
            if words_in_sentence.issubset(learned_word_set) and len(words_in_sentence) >= 2:
                can_form = True
                eligible_sentences.append(sentence)
    
    print(f"学习进度: {current_index}/{len(vocab)}")
    print(f"已学单词: {learned_word_set}")
    print(f"是否可以生成句子翻译题目: {can_form}")
    print(f"符合条件的句子: {eligible_sentences}")

if __name__ == "__main__":
    test_check_coverage()
    print("\n=== 测试完成 ===")
