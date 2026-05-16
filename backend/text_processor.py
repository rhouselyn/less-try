from typing import List, Set, Dict, Any
import string

BACKUP_VOCAB_BY_LANG = {
    "en": [
        "morning", "evening", "family", "friend", "school", "teacher", "student", "classroom",
        "garden", "flower", "animal", "water", "river", "mountain", "forest", "weather",
        "summer", "winter", "spring", "autumn", "holiday", "birthday", "breakfast", "dinner",
        "kitchen", "window", "door", "table", "chair", "picture", "color", "music",
        "story", "letter", "number", "question", "answer", "example", "practice", "lesson",
        "country", "village", "market", "bridge", "station", "library", "hospital", "museum",
        "travel", "visit", "arrive", "return", "carry", "follow", "listen", "remember",
        "beautiful", "important", "different", "difficult", "wonderful", "careful", "together", "between",
        "always", "usually", "sometimes", "quickly", "slowly", "carefully", "certainly", "already",
        "enough", "another", "several", "perhaps", "almost", "during", "without", "against",
        "believe", "prepare", "discover", "explain", "imagine", "include", "provide", "suppose",
        "produce", "collect", "protect", "connect", "develop", "improve", "increase", "consider",
        "nature", "science", "culture", "future", "history", "language", "knowledge", "attention",
        "special", "possible", "popular", "similar", "simple", "strange", "useful", "serious",
        "decide", "depend", "divide", "enter", "happen", "invite", "notice", "promise",
        "suggest", "support", "achieve", "continue", "organize", "introduce", "celebrate", "communicate",
        "opinion", "decision", "direction", "information", "experience", "education", "condition", "position",
        "ancient", "modern", "correct", "exact", "proper", "necessary", "original", "traditional",
        "accept", "agree", "allow", "appear", "cause", "create", "expect", "force",
        "influence", "observe", "prefer", "receive", "require", "serve", "share", "spread",
    ],
    "zh": [
        "早上", "晚上", "家人", "朋友", "学校", "老师", "学生", "教室",
        "花园", "花朵", "动物", "喝水", "河流", "高山", "森林", "天气",
        "夏天", "冬天", "春天", "秋天", "假期", "生日", "早餐", "晚餐",
        "厨房", "窗户", "门", "桌子", "椅子", "图画", "颜色", "音乐",
        "故事", "信件", "数字", "问题", "回答", "例子", "练习", "课程",
        "国家", "村庄", "市场", "桥梁", "车站", "图书馆", "医院", "博物馆",
        "旅行", "参观", "到达", "回来", "携带", "跟随", "听", "记得",
        "美丽", "重要", "不同", "困难", "精彩", "小心", "一起", "之间",
        "总是", "通常", "有时", "快速", "慢慢", "仔细", "当然", "已经",
        "足够", "另一个", "几个", "也许", "几乎", "期间", "没有", "反对",
        "相信", "准备", "发现", "解释", "想象", "包括", "提供", "假设",
        "生产", "收集", "保护", "连接", "发展", "改善", "增加", "考虑",
        "自然", "科学", "文化", "未来", "历史", "语言", "知识", "注意",
        "特别", "可能", "流行", "相似", "简单", "奇怪", "有用", "认真",
        "决定", "依靠", "分开", "进入", "发生", "邀请", "注意", "承诺",
        "建议", "支持", "实现", "继续", "组织", "介绍", "庆祝", "交流",
        "意见", "决定", "方向", "信息", "经验", "教育", "条件", "位置",
        "古老", "现代", "正确", "精确", "适当", "必要", "原始", "传统",
        "接受", "同意", "允许", "出现", "原因", "创造", "期望", "力量",
        "影响", "观察", "偏好", "收到", "需要", "服务", "分享", "传播",
    ],
    "es": [
        "mañana", "tarde", "familia", "amigo", "escuela", "profesor", "estudiante", "aula",
        "jardín", "flor", "animal", "agua", "río", "montaña", "bosque", "clima",
        "verano", "invierno", "primavera", "otoño", "vacaciones", "cumpleaños", "desayuno", "cena",
        "cocina", "ventana", "puerta", "mesa", "silla", "imagen", "color", "música",
        "historia", "carta", "número", "pregunta", "respuesta", "ejemplo", "práctica", "lección",
        "país", "pueblo", "mercado", "puente", "estación", "biblioteca", "hospital", "museo",
        "viaje", "visita", "llegada", "regreso", "llevar", "seguir", "escuchar", "recordar",
        "hermoso", "importante", "diferente", "difícil", "maravilloso", "cuidadoso", "juntos", "entre",
        "siempre", "generalmente", "a veces", "rápido", "lento", "cuidadosamente", "ciertamente", "ya",
        "suficiente", "otro", "varios", "quizás", "casi", "durante", "sin", "contra",
        "creer", "preparar", "descubrir", "explicar", "imaginar", "incluir", "proporcionar", "suponer",
        "producir", "recolectar", "proteger", "conectar", "desarrollar", "mejorar", "aumentar", "considerar",
        "naturaleza", "ciencia", "cultura", "futuro", "historia", "idioma", "conocimiento", "atención",
        "especial", "posible", "popular", "similar", "simple", "extraño", "útil", "serio",
        "decidir", "depender", "dividir", "entrar", "pasar", "invitar", "notar", "prometer",
        "sugerir", "apoyar", "lograr", "continuar", "organizar", "presentar", "celebrar", "comunicar",
        "opinión", "decisión", "dirección", "información", "experiencia", "educación", "condición", "posición",
        "antiguo", "moderno", "correcto", "exacto", "apropiado", "necesario", "original", "tradicional",
        "aceptar", "acordar", "permitir", "aparecer", "causar", "crear", "esperar", "fuerza",
        "influencia", "observar", "preferir", "recibir", "requerir", "servir", "compartir", "extender",
    ],
    "de": [
        "Morgen", "Abend", "Familie", "Freund", "Schule", "Lehrer", "Schüler", "Klassenzimmer",
        "Garten", "Blume", "Tier", "Wasser", "Fluss", "Berg", "Wald", "Wetter",
        "Sommer", "Winter", "Frühling", "Herbst", "Urlaub", "Geburtstag", "Frühstück", "Abendessen",
        "Küche", "Fenster", "Tür", "Tisch", "Stuhl", "Bild", "Farbe", "Musik",
        "Geschichte", "Brief", "Zahl", "Frage", "Antwort", "Beispiel", "Übung", "Lektion",
        "Land", "Dorf", "Markt", "Brücke", "Bahnhof", "Bibliothek", "Krankenhaus", "Museum",
        "Reise", "Besuch", "Ankunft", "Rückkehr", "tragen", "folgen", "zuhören", "erinnern",
        "schön", "wichtig", "verschieden", "schwierig", "wunderbar", "vorsichtig", "zusammen", "zwischen",
        "immer", "gewöhnlich", "manchmal", "schnell", "langsam", "sorgfältig", "bestimmt", "schon",
        "genug", "anderer", "mehrere", "vielleicht", "fast", "während", "ohne", "gegen",
        "glauben", "vorbereiten", "entdecken", "erklären", "vorstellen", "einschließen", "bieten", "annehmen",
        "produzieren", "sammeln", "schützen", "verbinden", "entwickeln", "verbessern", "erhöhen", "bedenken",
        "Natur", "Wissenschaft", "Kultur", "Zukunft", "Geschichte", "Sprache", "Wissen", "Aufmerksamkeit",
        "besonders", "möglich", "beliebt", "ähnlich", "einfach", "seltsam", "nützlich", "ernst",
        "entscheiden", "abhängen", "teilen", "eintreten", "passieren", "einladen", "bemerken", "versprechen",
        "vorschlagen", "unterstützen", "erreichen", "fortsetzen", "organisieren", "vorstellen", "feiern", "kommunizieren",
        "Meinung", "Entscheidung", "Richtung", "Information", "Erfahrung", "Bildung", "Bedingung", "Position",
        "alt", "modern", "richtig", "genau", "passend", "notwendig", "ursprünglich", "traditionell",
        "akzeptieren", "zustimmen", "erlauben", "erscheinen", "verursachen", "erschaffen", "erwarten", "Kraft",
        "Einfluss", "beobachten", "bevorzugen", "empfangen", "benötigen", "dienen", "teilen", "verbreiten",
    ],
    "fr": [
        "matin", "soir", "famille", "ami", "école", "professeur", "étudiant", "salle",
        "jardin", "fleur", "animal", "eau", "rivière", "montagne", "forêt", "temps",
        "été", "hiver", "printemps", "automne", "vacances", "anniversaire", "petit-déjeuner", "dîner",
        "cuisine", "fenêtre", "porte", "table", "chaise", "image", "couleur", "musique",
        "histoire", "lettre", "nombre", "question", "réponse", "exemple", "exercice", "leçon",
        "pays", "village", "marché", "pont", "gare", "bibliothèque", "hôpital", "musée",
        "voyage", "visite", "arrivée", "retour", "porter", "suivre", "écouter", "rappeler",
        "beau", "important", "différent", "difficile", "merveilleux", "prudent", "ensemble", "entre",
        "toujours", "généralement", "parfois", "vite", "lentement", "soigneusement", "certainement", "déjà",
        "assez", "autre", "plusieurs", "peut-être", "presque", "pendant", "sans", "contre",
        "croire", "préparer", "découvrir", "expliquer", "imaginer", "inclure", "fournir", "supposer",
        "produire", "collecter", "protéger", "connecter", "développer", "améliorer", "augmenter", "considérer",
        "nature", "science", "culture", "avenir", "histoire", "langue", "connaissance", "attention",
        "spécial", "possible", "populaire", "similaire", "simple", "étrange", "utile", "sérieux",
        "décider", "dépendre", "diviser", "entrer", "arriver", "inviter", "remarquer", "promettre",
        "suggérer", "soutenir", "réaliser", "continuer", "organiser", "présenter", "célébrer", "communiquer",
        "opinion", "décision", "direction", "information", "expérience", "éducation", "condition", "position",
        "ancien", "moderne", "correct", "exact", "propre", "nécessaire", "original", "traditionnel",
        "accepter", "accepter", "permettre", "apparaître", "causer", "créer", "espérer", "force",
        "influence", "observer", "préférer", "recevoir", "exiger", "servir", "partager", "répandre",
    ],
    "ja": [
        "朝", "夕方", "家族", "友達", "学校", "先生", "学生", "教室",
        "庭", "花", "動物", "水", "川", "山", "森", "天気",
        "夏", "冬", "春", "秋", "休み", "誕生日", "朝食", "夕食",
        "台所", "窓", "扉", "机", "椅子", "絵", "色", "音楽",
        "物語", "手紙", "数字", "質問", "答え", "例", "練習", "授業",
        "国", "村", "市場", "橋", "駅", "図書館", "病院", "美術館",
        "旅行", "訪問", "到着", "帰り", "持つ", "従う", "聞く", "覚える",
        "美しい", "大切", "違う", "難しい", "素晴らしい", "慎重", "一緒", "間",
        "いつも", "普通", "時々", "速い", "遅い", "丁寧", "確実", "もう",
        "十分", "別の", "いくつか", "たぶん", "ほとんど", "間", "なし", "反対",
        "信じる", "準備", "発見", "説明", "想像", "含む", "提供", "仮定",
        "作る", "集める", "守る", "繋ぐ", "発展", "改善", "増やす", "考える",
        "自然", "科学", "文化", "未来", "歴史", "言葉", "知識", "注意",
        "特別", "可能", "人気", "似ている", "簡単", "変", "役立つ", "真剣",
        "決める", "頼る", "分ける", "入る", "起こる", "招待", "気づく", "約束",
        "提案", "応援", "達成", "続ける", "整理", "紹介", "祝う", "伝える",
        "意見", "決定", "方向", "情報", "経験", "教育", "条件", "位置",
        "古い", "現代", "正しい", "正確", "適切", "必要", "元の", "伝統的",
        "受け入れる", "同意", "許す", "現れる", "原因", "創造", "期待", "力",
        "影響", "観察", "好む", "受け取る", "必要", "仕える", "共有", "広がる",
    ],
}

BACKUP_VOCAB = BACKUP_VOCAB_BY_LANG["en"]


class TextProcessor:
    def __init__(self):
        pass

    def extract_words(self, text: str, language: str) -> List[str]:
        import re
        words = re.findall(r"\b\w+(?:'\w+)?\b", text)
        words = [w.lower() for w in words]
        
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
    
    def validate_and_complete_translation(self, sentence: str, translation_result: dict, source_lang: str) -> dict:
        if not isinstance(translation_result, dict) or 'translation' not in translation_result:
            return translation_result
        
        original_words = self.tokenize_sentence(sentence)
        
        existing_tokens = []
        if 'translation' in translation_result:
            for token in translation_result['translation']:
                if isinstance(token, dict) and 'text' in token:
                    existing_tokens.append(token)
        
        existing_text_lower = [t['text'].lower() for t in existing_tokens]
        
        dict_lookup = {}
        dict_entries = translation_result.get('dictionary_entries', [])
        if isinstance(dict_entries, str):
            try:
                import json
                dict_entries = json.loads(dict_entries)
            except (json.JSONDecodeError, TypeError):
                dict_entries = []
        if isinstance(dict_entries, list):
            for entry in dict_entries:
                if isinstance(entry, dict) and 'word' in entry:
                    dict_lookup[entry['word'].lower()] = entry
        
        completed_translation = []
        used_existing = set()
        
        for orig_word in original_words:
            found = False
            for i, token in enumerate(existing_tokens):
                if i not in used_existing and token['text'].lower() == orig_word.lower():
                    t = dict(token)
                    if not t.get('translation', '').strip():
                        dict_entry = dict_lookup.get(orig_word.lower())
                        if dict_entry:
                            t['translation'] = dict_entry.get('translation', '') or dict_entry.get('context_meaning', '')
                            if not t.get('phonetic', '').strip():
                                t['phonetic'] = dict_entry.get('ipa', '')
                    completed_translation.append(t)
                    used_existing.add(i)
                    found = True
                    break
            if not found:
                dict_entry = dict_lookup.get(orig_word.lower())
                translation_val = ''
                phonetic_val = ''
                morphology_val = ''
                if dict_entry:
                    translation_val = dict_entry.get('translation', '') or dict_entry.get('context_meaning', '')
                    phonetic_val = dict_entry.get('ipa', '')
                    morphology_val = dict_entry.get('morphology', '')
                completed_translation.append({
                    'text': orig_word,
                    'translation': translation_val,
                    'phonetic': phonetic_val,
                    'morphology': morphology_val
                })
        
        translation_result['translation'] = completed_translation
        return translation_result

    def tokenize_sentence(self, sentence: str) -> List[str]:
        import re
        words = re.findall(r"\b\w+(?:'\w+)?\b", sentence)
        return words
    
    def generate_masked_sentence(self, sentence: str, vocab: List[Dict], translation_tokens: List[str] = None, all_sentences: List[Dict] = None, mask_seed: int = None, source_lang: str = "en") -> Dict[str, Any]:
        """
        生成蒙版填空练习
        - 每8个单词蒙版1个
        - 蒙版之间至少间隔3个词，不相邻
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
        
        num_masks = max(1, word_count // 8)
        
        if num_masks > word_count // 2:
            num_masks = max(1, word_count // 2)
        
        min_gap = 3
        
        import random
        if mask_seed is not None:
            random.seed(mask_seed)
        else:
            random.seed(hash(sentence))
        
        mask_indices = []
        candidates = list(range(word_count))
        random.shuffle(candidates)
        
        for idx in candidates:
            if len(mask_indices) >= num_masks:
                break
            too_close = False
            for existing in mask_indices:
                if abs(idx - existing) <= min_gap:
                    too_close = True
                    break
            if not too_close:
                mask_indices.append(idx)
        
        mask_indices.sort()
        
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
        distractors = []
        answer_lower = [w.lower() for w in answer_words]
        
        current_sentence_words_lower = set()
        if translation_tokens:
            current_sentence_words_lower = {w.lower() for w in translation_tokens}
        else:
            current_sentence_words_lower = {w.lower() for w in self.tokenize_sentence(sentence)}
        
        exclude_lower = set(answer_lower) | current_sentence_words_lower
        
        if all_sentences:
            for sent_data in all_sentences:
                if "sentence" in sent_data and sent_data["sentence"] != sentence:
                    if "translation_result" in sent_data and "translation" in sent_data["translation_result"]:
                        for token in sent_data["translation_result"]["translation"]:
                            if isinstance(token, dict) and "text" in token:
                                token_text = token["text"]
                                if token_text.lower() not in exclude_lower and token_text not in distractors and len(distractors) < 3 * num_masks:
                                    distractors.append(token_text)
        
        if len(distractors) < 3 * num_masks:
            vocab_words = [v["word"] for v in vocab]
            random.shuffle(vocab_words)
            for vw in vocab_words:
                if vw.lower() not in exclude_lower and vw not in distractors and len(distractors) < 3 * num_masks:
                    distractors.append(vw)
        
        if len(distractors) < 3 * num_masks:
            fallback_needed = 3 * num_masks - len(distractors)
            fallback_distractors = self.get_fallback_distractors(fallback_needed, list(exclude_lower) + distractors, source_lang)
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

    def generate_multiple_masked_sentences(self, sentence: str, vocab: List[Dict], translation_tokens: List[str] = None, all_sentences: List[Dict] = None, num_versions: int = 3) -> List[Dict[str, Any]]:
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
        units = []
        for i in range(0, len(sentences), unit_size):
            units.append(sentences[i:i+unit_size])
        return units

    def get_fallback_distractors(self, count: int, exclude_words: List[str] = None, source_lang: str = "en") -> List[str]:
        if exclude_words is None:
            exclude_words = []
        
        exclude_lower = [w.lower() for w in exclude_words]
        distractors = []
        
        import random
        vocab_list = BACKUP_VOCAB_BY_LANG.get(source_lang, BACKUP_VOCAB_BY_LANG["en"])
        shuffled = list(vocab_list)
        random.shuffle(shuffled)
        
        for word in shuffled:
            if word.lower() not in exclude_lower and len(distractors) < count:
                distractors.append(word)
        
        return distractors