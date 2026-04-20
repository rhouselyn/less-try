from typing import List, Set, Dict, Any
import string


class TextProcessor:
    def __init__(self):
        pass

    def extract_words(self, text: str, language: str) -> List[str]:
        """从文本中提取单词并去重，排除标点符号"""
        # 简单的单词提取，不使用正则表达式
        words = []
        current_word = ""
        for char in text:
            if char.isalpha():
                current_word += char
            else:
                if current_word and len(current_word) > 1:
                    words.append(current_word.lower())
                current_word = ""
        if current_word and len(current_word) > 1:
            words.append(current_word.lower())
        
        # 去重
        seen = set()
        unique_words = []
        for word in words:
            if word not in seen:
                seen.add(word)
                unique_words.append(word)
        
        return unique_words

    def extract_words_from_sentences(self, sentences: List[str], language: str) -> List[str]:
        """从句子列表中提取单词并全局去重"""
        all_words = []
        
        # 从每个句子中提取单词
        for sentence in sentences:
            sentence_words = self.extract_words(sentence, language)
            all_words.extend(sentence_words)
        
        # 全局去重
        seen = set()
        unique_words = []
        for word in all_words:
            if word not in seen:
                seen.add(word)
                unique_words.append(word)
        
        return unique_words

    def chunk_words(self, words: List[str], chunk_size: int = 10) -> List[List[str]]:
        chunks = []
        for i in range(0, len(words), chunk_size):
            chunks.append(words[i:i + chunk_size])
        return chunks

    def split_sentences(self, text: str) -> List[str]:
        """句子分割，支持中英文标点，保留原始空格"""
        sentence_endings = {'.', '!', '?', '。', '！', '？'}
        sentences = []
        current_sentence = ""
        
        for char in text:
            current_sentence += char
            if char in sentence_endings:
                if current_sentence.strip():
                    # 保留原始句子，只去掉首尾可能的多余空白，但保留句子内部的空格
                    sentences.append(current_sentence)
                current_sentence = ""
        
        if current_sentence.strip():
            sentences.append(current_sentence)
        
        # 最终过滤：确保没有空句子
        sentences = [s for s in sentences if s.strip()]
        return sentences

    def process_word_variants(self, word_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """处理单词变体，确保变体前面有类型标注"""
        processed_variants = []
        for variant in word_data:
            if 'type' not in variant and 'word' in variant:
                # 简单的类型推断（实际应用中可能需要更复杂的逻辑）
                variant['type'] = '未知'
            processed_variants.append(variant)
        return processed_variants

    def resolve_phonetic_conflicts(self, phonetics: List[str]) -> str:
        """解决音标冲突，选择出现最多的音标"""
        if not phonetics:
            return ""
        
        # 统计每个音标的出现次数
        phonetic_counts = {}
        for phonetic in phonetics:
            if phonetic:
                phonetic_counts[phonetic] = phonetic_counts.get(phonetic, 0) + 1
        
        # 按出现次数排序
        sorted_phonetics = sorted(phonetic_counts.items(), key=lambda x: x[1], reverse=True)
        
        # 返回出现次数最多的音标，如果次数相同则返回第一个
        return sorted_phonetics[0][0]

    async def process_translation(self, text: str, source_lang: str, target_lang: str, nvidia_api):
        # 使用新的合并方法处理文本和词典
        result = await nvidia_api.process_text_with_dictionary(text, source_lang, target_lang)
        
        # 简单处理，保留LLM生成的自然结果
        if isinstance(result, dict):
            # 保留original字段，因为它可能包含翻译后的文本
            
            # 简单过滤：只过滤掉纯标点符号的token
            if 'translation' in result:
                filtered_translation = []
                for token in result['translation']:
                    if isinstance(token, dict) and 'text' in token:
                        text = token['text'].strip()
                        # 只过滤完全是标点符号的token
                        if text and not all(char in '.,;:!?' for char in text):
                            filtered_translation.append(token)
                result['translation'] = filtered_translation
        
        # 返回处理后的结果，保留LLM生成的自然翻译
        return result
    
    def tokenize_sentence(self, sentence: str) -> List[str]:
        """简单句子分词，按空格和标点分割，保留单词"""
        # 先去除标点，再按空格分割
        import re
        # 保留单词，去除纯标点
        words = re.findall(r"\b\w+\b", sentence)
        return words
    
    def generate_masked_sentence(self, sentence: str, vocab: List[Dict], translation_tokens=None) -> Dict[str, Any]:
        """
        生成蒙版填空练习
        - 任何长度的句子都可以生成
        - 8个token以下的蒙版一个
        - 使用翻译token作为蒙版单词来源
        """
        # 使用翻译tokens或自动分词
        if translation_tokens:
            words = [token['text'] for token in translation_tokens if token['text'].isalpha()]
        else:
            words = self.tokenize_sentence(sentence)
        
        word_count = len(words)
        
        if word_count < 1:
            return None
        
        # 计算要蒙版的数量
        if word_count < 8:
            num_masks = 1
        else:
            num_masks = 1 + (word_count - 8) // 8
        
        if num_masks > word_count // 2:
            num_masks = word_count // 2  # 最多蒙一半
        
        import random
        # 随机选择要蒙版的单词索引
        mask_indices = random.sample(range(word_count), num_masks)
        
        # 构建蒙版后的句子 - we need to preserve original structure
        # First, let's split into tokens with punctuation
        import re
        tokens_with_punc = re.findall(r'\w+|[^\w\s]', sentence)
        # Now, let's map word positions to token positions
        current_word_idx = 0
        masked_tokens = []
        answer_words = []
        for token in tokens_with_punc:
            if token.isalpha() and current_word_idx < len(words):
                if current_word_idx in mask_indices:
                    masked_tokens.append("___")
                    answer_words.append(words[current_word_idx])
                else:
                    masked_tokens.append(words[current_word_idx])
                current_word_idx += 1
            else:
                masked_tokens.append(token)
        
        # 生成选项：正确答案 + 干扰项（来自vocab的其他单词）
        options = answer_words.copy()
        # 从词汇表中找干扰项
        distractors = []
        vocab_words = [v["word"] for v in vocab]
        answer_lower = [w.lower() for w in answer_words]
        random.shuffle(vocab_words)
        for vw in vocab_words:
            if vw.lower() not in answer_lower and len(distractors) < 3 * num_masks:
                distractors.append(vw)
        
        # 如果词汇表不够，添加一些常见的英语干扰词
        backup_distractors = ["apple", "banana", "cat", "dog", "elephant", "fish", "grape", "house", "car", "tree", "book", "table"]
        idx = 0
        while len(distractors) < 3 * num_masks:
            bd = backup_distractors[idx % len(backup_distractors)]
            if bd.lower() not in answer_lower and bd not in distractors:
                distractors.append(bd)
            idx += 1
        
        # 打乱干扰项
        random.shuffle(distractors)
        options += distractors[:3 * num_masks]
        
        # 打乱所有选项
        random.shuffle(options)
        
        return {
            "original_sentence": sentence,
            "masked_sentence": "".join(
                [
                    " " + token if token not in [".", ",", "!", "?", ":", ";"] and i > 0 else token 
                    for i, token in enumerate(masked_tokens)
                ]
            ),
            "answer_words": answer_words,
            "mask_indices": mask_indices,
            "options": options,
            "word_count": word_count
        }
    
    def group_sentences_into_units(self, sentences: List[str], unit_size: int = 8) -> List[List[str]]:
        """将句子分组为单元"""
        units = []
        for i in range(0, len(sentences), unit_size):
            units.append(sentences[i:i+unit_size])
        return units