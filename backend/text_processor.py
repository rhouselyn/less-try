import re
from typing import List, Set


class TextProcessor:
    def __init__(self):
        pass

    def extract_words(self, text: str, language: str) -> List[str]:
        """从文本中提取单词并去重"""
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

    async def split_and_translate(self, text: str, source_lang: str, target_lang: str, nvidia_api):
        # 先使用新的分句功能切分文本
        sentences = self.split_sentences(text)
        
        # 对每个句子进行翻译
        all_translated_sentences = []
        for sentence in sentences:
            if sentence.strip():
                translated = await nvidia_api.split_and_translate(sentence, source_lang, target_lang)
                if isinstance(translated, list):
                    all_translated_sentences.extend(translated)
        
        # 返回翻译后的句子列表
        return all_translated_sentences
