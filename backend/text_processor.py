import re
from typing import List, Set, Dict, Any


class TextProcessor:
    def __init__(self):
        pass

    def extract_words(self, text: str, language: str) -> List[str]:
        """从文本中提取单词并去重，排除标点符号"""
        words = re.findall(r'\b[a-zA-Z]{2,}\b', text)
        
        clean_words = []
        for word in words:
            word = word.lower().strip()
            if len(word) > 1 and word.isalpha():
                clean_words.append(word)
        
        seen = set()
        unique_words = []
        for word in clean_words:
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
        # 定义中英文标点符号
        sentence_endings = r'[.!?。！？]'
        
        # 使用正则表达式分割句子
        sentences = re.split(f'({sentence_endings})', text)
        
        # 重建句子，确保标点符号与句子内容在一起
        result = []
        for i in range(0, len(sentences), 2):
            sentence = sentences[i].strip()
            if i + 1 < len(sentences):
                sentence += sentences[i + 1]
            if sentence:
                result.append(sentence)
        
        return result

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

    async def split_and_translate(self, text: str, source_lang: str, target_lang: str, nvidia_api):
        # 对整个文本进行翻译
        result = await nvidia_api.split_and_translate(text, source_lang, target_lang)
        
        # 处理结果，确保格式正确
        if isinstance(result, dict):
            # 确保translation格式正确，不包含标点符号
            if 'translation' in result:
                # 过滤掉标点符号token
                filtered_translation = []
                for token in result['translation']:
                    if isinstance(token, dict) and 'text' in token:
                        # 检查token是否为标点符号
                        if token['text'].strip() and not re.match(r'^[\W_]+$', token['text']):
                            filtered_translation.append(token)
                result['translation'] = filtered_translation
            
            # 生成tokenized_translation_quoted字段
            if 'tokenized_translation' in result and 'tokenized_translation_quoted' not in result:
                # 移除标点符号，然后给每个词加上引号
                import re
                # 移除标点符号
                clean_translation = re.sub(r'[\W_]+', ' ', result['tokenized_translation'])
                # 分割成单词并加上引号
                words = clean_translation.strip().split()
                quoted_words = [f'"{word}"' for word in words]
                # 重新组合成字符串
                result['tokenized_translation_quoted'] = ' '.join(quoted_words)
        
        # 返回处理后的结果
        return result
