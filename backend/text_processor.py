import re
from typing import List, Set


class TextProcessor:
    def __init__(self):
        pass

    def extract_words(self, text: str, language: str) -> List[str]:
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

    def chunk_words(self, words: List[str], chunk_size: int = 10) -> List[List[str]]:
        chunks = []
        for i in range(0, len(words), chunk_size):
            chunks.append(words[i:i + chunk_size])
        return chunks

    async def split_and_translate(self, text: str, source_lang: str, target_lang: str, nvidia_api):
        return await nvidia_api.split_and_translate(text, source_lang, target_lang)
