from typing import List, Set, Dict, Any
import string

BACKUP_VOCAB = [
    "access", "accidents", "across", "adopt", "adopting", "agencies", "agricultural", "allows",
    "amounts", "analyze", "and", "are", "areas", "around", "artificial", "automation",
    "autonomous", "blockchain", "borders", "broadband", "businesses", "cables", "changes", "cities",
    "city", "climate", "cloud", "collaborate", "communicate", "communication", "communities", "companies",
    "complex", "computing", "conditions", "conferences", "connect", "constellations", "consult", "consumption",
    "continue", "countries", "creative", "crop", "data", "deployed", "design", "develop",
    "diagnosis", "different", "digital", "discover", "distant", "distribution", "driving", "drones",
    "education", "efficiently", "electric", "embrace", "employees", "energy", "engineers", "ensure",
    "entertainment", "environmental", "every", "evolved", "expand", "experiences", "explore", "facilities",
    "farming", "fiber", "financial", "flow", "forests", "fuel",
    "globe", "has", "have", "healthcare", "helps", "humans", "imagery", "immersive",
    "implement", "improve", "industries", "infrastructure", "institutions", "integrate", "intelligence",
    "international", "learning", "maintaining", "manage", "manufacturing", "might", "missions", "modern",
    "monitor", "needing", "networks", "oceans", "office", "online",
    "operators", "optic", "optimize", "origins", "overlook", "patients", "patterns",
    "physical", "planets", "planners", "plans", "platforms", "precision", "problems", "production",
    "professional", "professionals", "programs", "providing", "quality", "reach", "reality", "recycling",
    "reduce", "regions", "rely", "remote", "remotely", "researchers", "robotic", "rural",
    "safe", "satellite", "scarce", "schools", "scientists", "secure", "securely", "sensor",
    "sensors", "servers", "smart", "space", "store", "students", "study", "systems",
    "techniques", "technology", "telemedicine", "through", "tools",
    "traditional", "traffic", "training", "transactions", "transformed", "transparent", "transportation", "treatment",
    "universe", "urban", "usage", "using", "vast", "vehicles", "video",
    "virtual", "waste", "water", "while",
    "without", "work", "working", "world", "yields",
]


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
                if current_word:
                    words.append(current_word.lower())
                current_word = ""
        if current_word:
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
        
        i = 0
        while i < len(text):
            char = text[i]
            current_sentence += char
            
            # 检查是否是句子结束符
            if char in sentence_endings:
                # 跳过连续的句子结束符
                j = i + 1
                while j < len(text) and text[j] in sentence_endings:
                    current_sentence += text[j]
                    j += 1
                i = j
                
                if current_sentence.strip():
                    sentences.append(current_sentence)
                current_sentence = ""
            else:
                i += 1
        
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
        """简单句子分词，按空格和标点分割，保留单词，正确处理缩写形式"""
        # 保留单词和缩写形式，如 what's, don't 等
        import re
        # 匹配单词和缩写形式
        words = re.findall(r"\b\w+(?:'\w+)?\b", sentence)
        return words
    
    def generate_masked_sentence(self, sentence: str, vocab: List[Dict], translation_tokens: List[str] = None) -> Dict[str, Any]:
        """
        生成蒙版填空练习
        - 大于8个词的句子才生成
        - 每8个词多蒙一个
        """
        # 使用翻译token或自动分词
        if translation_tokens:
            words = translation_tokens
        else:
            words = self.tokenize_sentence(sentence)
        word_count = len(words)
        
        if word_count < 8:
            return None
        
        # 计算要蒙版的数量
        num_masks = 1 + (word_count - 8) // 8
        if num_masks < 1:
            num_masks = 1
        if num_masks > word_count // 2:
            num_masks = word_count // 2  # 最多蒙一半
        
        import random
        # 固定种子，确保每个单元的掩码位置一致
        # 使用句子内容作为种子，确保相同句子有相同的掩码模式
        random.seed(hash(sentence))
        # 随机选择要蒙版的单词索引
        mask_indices = random.sample(range(word_count), num_masks)
        
        # 构建蒙版后的句子 - 使用LLM生成的tokens
        masked_tokens = []
        answer_words = []
        
        # 如果提供了translation_tokens，使用它们来构建蒙版句子
        if translation_tokens:
            for i, token in enumerate(translation_tokens):
                if i in mask_indices:
                    masked_tokens.append("___")
                    answer_words.append(token)
                else:
                    masked_tokens.append(token)
        else:
            # 回退到自动分词
            import re
            # 正确处理缩写形式，如 I'm, don't 等
            tokens_with_punc = re.findall(r"\b\w+(?:'\w+)?\b|[^\w\s]", sentence)
            # 映射单词位置到token位置
            current_word_idx = 0
            for token in tokens_with_punc:
                # 检查是否是单词（包括缩写形式）
                if re.match(r"\b\w+(?:'\w+)?\b", token) and current_word_idx < len(words):
                    if current_word_idx in mask_indices:
                        masked_tokens.append("___")
                        answer_words.append(token)
                    else:
                        masked_tokens.append(token)
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
        backup_distractors = BACKUP_VOCAB
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
        
        # 构建蒙版句子，保持原始句子的格式
        if translation_tokens:
            # 当使用LLM生成的tokens时，简单地用空格连接
            masked_sentence = " ".join(masked_tokens)
        else:
            # 当使用自动分词时，保持原始格式
            masked_sentence = "".join(
                [
                    " " + token if token not in [".", ",", "!", "?", ":", ";", ")"] and i > 0 else token 
                    for i, token in enumerate(masked_tokens)
                ]
            )
        
        return {
            "original_sentence": sentence,
            "masked_sentence": masked_sentence,
            "answer_words": answer_words,
            "mask_indices": mask_indices,
            "options": options,
            "word_count": word_count
        }
    
    def generate_multiple_masked_sentences(self, sentence: str, vocab: List[Dict], translation_tokens: List[str] = None, all_sentences: List[Dict] = None, num_versions: int = 3) -> List[Dict[str, Any]]:
        """生成多个不同蒙版版本的填空练习"""
        results = []
        base_seed = hash(sentence)
        for i in range(num_versions):
            seed = base_seed + i + 1
            masked = self.generate_masked_sentence(
                sentence, vocab, translation_tokens, all_sentences, mask_seed=seed
            )
            if masked:
                masked["mask_version"] = i
                results.append(masked)
        return results
    
    def generate_interleaved_exercise_order(self, num_sentences: int, masks_per_sentence: int = 3, seed: int = 42) -> List[List[int]]:
        """生成交叉出题顺序，不同句子的练习可以穿插
        
        每个句子有 (masks_per_sentence + 1) 个练习：3次选词填空 + 1次翻译
        句子内部顺序保持不变（选词1→选词2→选词3→翻译）
        不同句子之间随机穿插
        
        返回: [(sentence_idx, type_idx), ...] 的扁平列表
        """
        import random
        random.seed(seed)
        
        exercises_per_sentence = masks_per_sentence + 1
        next_type = [0] * num_sentences
        result = []
        remaining = num_sentences * exercises_per_sentence
        
        while remaining > 0:
            available = [i for i in range(num_sentences) if next_type[i] < exercises_per_sentence]
            sent_idx = random.choice(available)
            result.append([sent_idx, next_type[sent_idx]])
            next_type[sent_idx] += 1
            remaining -= 1
        
        return result
    
    def group_sentences_into_units(self, sentences: List[str], unit_size: int = 8) -> List[List[str]]:
        """将句子分组为单元"""
        units = []
        for i in range(0, len(sentences), unit_size):
            units.append(sentences[i:i+unit_size])
        return units
    
    def get_fallback_distractors(self, count: int, exclude_words: List[str] = None) -> List[str]:
        if exclude_words is None:
            exclude_words = []
        
        exclude_lower = [w.lower() for w in exclude_words]
        distractors = []
        
        import random
        shuffled = list(BACKUP_VOCAB)
        random.shuffle(shuffled)
        
        for word in shuffled:
            if word.lower() not in exclude_lower and len(distractors) < count:
                distractors.append(word)
        
        return distractors
    
    def generate_masked_sentence(self, sentence: str, vocab: List[Dict], translation_tokens: List[str] = None, all_sentences: List[Dict] = None, mask_seed: int = None) -> Dict[str, Any]:
        """
        生成蒙版填空练习
        - 每6个单词蒙版1个
        - 使用翻译token而非自动分词
        - 集成备选词库
        - 干扰词从其他句子或词库选择，不使用当前句子的单词
        - mask_seed: 可选的种子，用于生成不同的蒙版模式
        """
        if translation_tokens:
            words = translation_tokens
        else:
            words = self.tokenize_sentence(sentence)
        
        word_count = len(words)
        
        num_masks = max(1, word_count // 6)
        
        if num_masks > word_count // 2:
            num_masks = max(1, word_count // 2)
        
        import random
        if mask_seed is not None:
            random.seed(mask_seed)
        else:
            random.seed(hash(sentence))
        mask_indices = sorted(random.sample(range(word_count), num_masks))
        
        # 构建蒙版后的句子 - 使用LLM生成的tokens
        masked_tokens = []
        answer_words = []
        
        # 如果提供了translation_tokens，使用它们来构建蒙版句子
        if translation_tokens:
            for i, token in enumerate(translation_tokens):
                if i in mask_indices:
                    masked_tokens.append("___")
                    answer_words.append(token)
                else:
                    masked_tokens.append(token)
        else:
            # 回退到自动分词
            import re
            # 正确处理缩写形式，如 I'm, don't 等
            tokens_with_punc = re.findall(r"\b\w+(?:'\w+)?\b|[^\w\s]", sentence)
            # 映射单词位置到token位置
            current_word_idx = 0
            for token in tokens_with_punc:
                # 检查是否是单词（包括缩写形式）
                if re.match(r"\b\w+(?:'\w+)?\b", token) and current_word_idx < len(words):
                    if current_word_idx in mask_indices:
                        masked_tokens.append("___")
                        answer_words.append(token)
                    else:
                        masked_tokens.append(token)
                    current_word_idx += 1
                else:
                    masked_tokens.append(token)
        
        # 生成选项：正确答案 + 干扰项
        options = answer_words.copy()
        # 收集所有干扰词
        distractors = []
        answer_lower = [w.lower() for w in answer_words]
        
        # 首先从其他句子中获取干扰词
        if all_sentences:
            for sent_data in all_sentences:
                if "sentence" in sent_data and sent_data["sentence"] != sentence:
                    if "translation_result" in sent_data and "translation" in sent_data["translation_result"]:
                        for token in sent_data["translation_result"]["translation"]:
                            if isinstance(token, dict) and "text" in token:
                                token_text = token["text"]
                                if token_text.lower() not in answer_lower and token_text not in distractors and len(distractors) < 3 * num_masks:
                                    distractors.append(token_text)
        
        # 然后从词汇表中找干扰词
        if len(distractors) < 3 * num_masks:
            vocab_words = [v["word"] for v in vocab]
            random.shuffle(vocab_words)
            for vw in vocab_words:
                if vw.lower() not in answer_lower and vw not in distractors and len(distractors) < 3 * num_masks:
                    distractors.append(vw)
        
        # 如果词汇表不够，使用备选词库
        if len(distractors) < 3 * num_masks:
            fallback_needed = 3 * num_masks - len(distractors)
            fallback_distractors = self.get_fallback_distractors(fallback_needed, answer_words + distractors)
            distractors.extend(fallback_distractors)
        
        # 打乱干扰项
        random.shuffle(distractors)
        options += distractors[:3 * num_masks]
        
        # 打乱所有选项
        random.shuffle(options)
        
        # 构建蒙版句子，保持原始句子的格式
        if translation_tokens:
            # 当使用LLM生成的tokens时，简单地用空格连接
            masked_sentence = " ".join(masked_tokens)
        else:
            # 当使用自动分词时，保持原始格式
            masked_sentence = "".join(
                [
                    " " + token if token not in [".", ",", "!", "?", ":", ";", ")"] and i > 0 else token 
                    for i, token in enumerate(masked_tokens)
                ]
            )
        
        return {
            "original_sentence": sentence,
            "masked_sentence": masked_sentence,
            "answer_words": answer_words,
            "mask_indices": mask_indices,
            "options": options,
            "word_count": word_count
        }