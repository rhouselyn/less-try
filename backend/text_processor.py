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
        """句子分割，支持中英文标点"""
        sentence_endings = {'.', '!', '?', '。', '！', '？'}
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
            
            # 确保tokenized_translation是正常的严格翻译，完全没有任何空格
            if 'tokenized_translation' in result:
                # 严格去除所有空白字符：空格、制表符、换行等
                clean_translation = result['tokenized_translation']
                # 依次移除所有空白字符
                clean_translation = clean_translation.replace(' ', '')
                clean_translation = clean_translation.replace('\t', '')
                clean_translation = clean_translation.replace('\n', '')
                clean_translation = clean_translation.replace('\r', '')
                clean_translation = clean_translation.replace('\xa0', '')  # 不间断空格
                clean_translation = clean_translation.replace('\u2002', '')  # 半角空格
                clean_translation = clean_translation.replace('\u2003', '')  # 全角空格
                result['tokenized_translation'] = clean_translation
            elif 'translation' in result:
                # 如果没有tokenized_translation字段，则生成一个
                tokenized_translation = ''
                for token in result['translation']:
                    if isinstance(token, dict) and 'translation' in token:
                        tokenized_translation += token['translation']
                # 严格去除所有空白字符
                tokenized_translation = tokenized_translation.replace(' ', '')
                tokenized_translation = tokenized_translation.replace('\t', '')
                tokenized_translation = tokenized_translation.replace('\n', '')
                tokenized_translation = tokenized_translation.replace('\r', '')
                result['tokenized_translation'] = tokenized_translation
            
            # 生成tokenized_translation_quoted字段（无标点符号，只保留文字，无反斜杠，无引号）
            if 'translation' in result:
                quoted_words = []
                # 定义所有要移除的标点符号
                punctuation = '''!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~，。！？；："（）【】「」『』、\\''' 
                for token in result['translation']:
                    if isinstance(token, dict) and 'translation' in token:
                        translation = token['translation']
                        # 移除所有标点符号和反斜杠
                        clean_translation = translation
                        for char in punctuation:
                            clean_translation = clean_translation.replace(char, '')
                        # 如果清理后还有内容，就添加到quoted_words中
                        if clean_translation.strip():
                            quoted_words.append(clean_translation.strip())
                # 使用空格连接所有quoted_words（只保留纯文字）
                result['tokenized_translation_quoted'] = ' '.join(quoted_words)
        
        # 返回处理后的结果
        return result