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
        # 简单的句子分割，不使用正则表达式
        sentence_endings = '.!?.！？'
        sentences = []
        current_sentence = ""
        for char in text:
            current_sentence += char
            if char in sentence_endings:
                if current_sentence.strip():
                    sentences.append(current_sentence.strip())
                current_sentence = ""
        if current_sentence.strip():
            sentences.append(current_sentence.strip())
        
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
                        text = token['text'].strip()
                        if text and not all(char in '.,;:!?' for char in text):
                            filtered_translation.append(token)
                result['translation'] = filtered_translation
            
            # 生成正确的tokenized_translation（无多余空格，严格翻译）
            if 'tokenized_translation' in result:
                # 移除所有空格，确保是严格的一一对应翻译
                result['tokenized_translation'] = result['tokenized_translation'].replace(' ', '')
            elif 'translation' in result:
                # 如果没有tokenized_translation字段，则生成一个
                tokenized_translation = ''
                for token in result['translation']:
                    if isinstance(token, dict) and 'translation' in token:
                        tokenized_translation += token['translation']
                # 移除所有空格，确保是严格的一一对应翻译
                tokenized_translation = tokenized_translation.replace(' ', '')
                result['tokenized_translation'] = tokenized_translation
            
            # 生成tokenized_translation_quoted字段（无标点符号）
            if 'translation' in result:
                quoted_words = []
                # 定义所有标点符号
                all_punctuation = '''!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~，。！？；："（）【】「」『』、''' 
                for token in result['translation']:
                    if isinstance(token, dict) and 'translation' in token:
                        # 移除翻译中的所有标点符号
                        clean_translation = token['translation']
                        for char in all_punctuation:
                            clean_translation = clean_translation.replace(char, '')
                        # 处理连续空格
                        clean_translation = ' '.join(clean_translation.split())
                        if clean_translation.strip():
                            quoted_words.append(f'"{clean_translation.strip()}"')
                result['tokenized_translation_quoted'] = ' '.join(quoted_words)
        
        # 返回处理后的结果
        return result