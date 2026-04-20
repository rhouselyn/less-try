import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime


class Storage:
    def __init__(self):
        self.base_dir = Path("/workspace/data")
        self.files_dir = self.base_dir / "files"
        self.languages_dir = self.base_dir / "languages"
        
        self.files_dir.mkdir(parents=True, exist_ok=True)
        self.languages_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize default languages
        self._initialize_default_languages()

    def get_file_dir(self, file_id: str) -> Path:
        file_dir = self.files_dir / file_id
        file_dir.mkdir(parents=True, exist_ok=True)
        return file_dir

    def save_pipeline_data(self, file_id: str, data: Any):
        file_dir = self.get_file_dir(file_id)
        pipeline_path = file_dir / "pipeline_data.json"
        with open(pipeline_path, 'w', encoding='utf-8') as f:
            json.dump({"data": data}, f, ensure_ascii=False, indent=2)

    def load_pipeline_data(self, file_id: str) -> Any:
        file_dir = self.get_file_dir(file_id)
        pipeline_path = file_dir / "pipeline_data.json"
        with open(pipeline_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get("data", {})

    def save_vocab(self, file_id: str, vocab: List[Dict]):
        file_dir = self.get_file_dir(file_id)
        vocab_path = file_dir / "vocab.json"
        with open(vocab_path, 'w', encoding='utf-8') as f:
            json.dump({"vocab": vocab}, f, ensure_ascii=False, indent=2)

    def load_vocab(self, file_id: str) -> List[Dict]:
        file_dir = self.get_file_dir(file_id)
        vocab_path = file_dir / "vocab.json"
        with open(vocab_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get("vocab", [])

    def save_text(self, file_id: str, text: str):
        file_dir = self.get_file_dir(file_id)
        text_path = file_dir / "cleaned_text.txt"
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(text)

    def save_word_cache(self, file_id: str, word: str, word_info: Dict):
        file_dir = self.get_file_dir(file_id)
        cache_dir = file_dir / "word_cache"
        cache_dir.mkdir(parents=True, exist_ok=True)
        word_file = cache_dir / f"{word.lower()}.json"
        with open(word_file, 'w', encoding='utf-8') as f:
            json.dump(word_info, f, ensure_ascii=False, indent=2)

    def load_word_cache(self, file_id: str, word: str) -> Optional[Dict]:
        file_dir = self.get_file_dir(file_id)
        cache_dir = file_dir / "word_cache"
        word_file = cache_dir / f"{word.lower()}.json"
        if word_file.exists():
            with open(word_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    def clear_word_cache(self, file_id: str):
        file_dir = self.get_file_dir(file_id)
        cache_dir = file_dir / "word_cache"
        if cache_dir.exists():
            import shutil
            shutil.rmtree(cache_dir)
    
    def save_language_settings(self, file_id: str, source_lang: str, target_lang: str):
        """保存语言设置"""
        file_dir = self.get_file_dir(file_id)
        settings_path = file_dir / "language_settings.json"
        with open(settings_path, 'w', encoding='utf-8') as f:
            json.dump({
                "source_lang": source_lang,
                "target_lang": target_lang
            }, f, ensure_ascii=False, indent=2)
    
    def load_language_settings(self, file_id: str) -> Dict[str, str]:
        """加载语言设置"""
        file_dir = self.get_file_dir(file_id)
        settings_path = file_dir / "language_settings.json"
        if settings_path.exists():
            with open(settings_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        # 默认返回中文和英文
        return {
            "source_lang": "en",
            "target_lang": "zh"
        }
    
    def save_learning_progress(self, file_id: str, current_index: int):
        """保存学习进度"""
        file_dir = self.get_file_dir(file_id)
        progress_path = file_dir / "learning_progress.json"
        with open(progress_path, 'w', encoding='utf-8') as f:
            json.dump({"current_index": current_index}, f, ensure_ascii=False, indent=2)
    
    def load_learning_progress(self, file_id: str) -> int:
        """加载学习进度"""
        file_dir = self.get_file_dir(file_id)
        progress_path = file_dir / "learning_progress.json"
        if progress_path.exists():
            with open(progress_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get("current_index", 0)
        return 0
    
    def save_shuffled_order(self, file_id: str, shuffled_indices: List[int]):
        """保存单词的打乱顺序"""
        file_dir = self.get_file_dir(file_id)
        order_path = file_dir / "shuffled_order.json"
        with open(order_path, 'w', encoding='utf-8') as f:
            json.dump({"shuffled_indices": shuffled_indices}, f, ensure_ascii=False, indent=2)
    
    def load_shuffled_order(self, file_id: str) -> Optional[List[int]]:
        """加载单词的打乱顺序"""
        file_dir = self.get_file_dir(file_id)
        order_path = file_dir / "shuffled_order.json"
        if order_path.exists():
            with open(order_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get("shuffled_indices")
        return None

    def _initialize_default_languages(self):
        """初始化默认语言"""
        default_languages = [
            {
                "code": "en",
                "name": "English",
                "description": "英语是世界上使用最广泛的语言之一，是国际交流、商务、科学和技术的主要语言。它起源于英国，现在在全球有超过15亿人使用。",
                "famous_quotes": [
                    {
                        "quote": "The only way to do great work is to love what you do.",
                        "author": "Steve Jobs"
                    },
                    {
                        "quote": "In the middle of difficulty lies opportunity.",
                        "author": "Albert Einstein"
                    }
                ],
                "history": "英语属于印欧语系日耳曼语族，起源于5世纪盎格鲁-撒克逊人入侵不列颠群岛。它经历了古英语、中古英语和现代英语三个主要发展阶段。",
                "relations": "英语与德语、荷兰语、弗里斯兰语有密切的亲属关系，同时在发展过程中吸收了大量法语、拉丁语和希腊语词汇。"
            },
            {
                "code": "zh",
                "name": "中文",
                "description": "中文是世界上使用人数最多的语言，拥有超过14亿母语使用者。它是联合国的工作语言之一，有着数千年的悠久历史和丰富的文化底蕴。",
                "famous_quotes": [
                    {
                        "quote": "学而不思则罔，思而不学则殆。",
                        "author": "孔子"
                    },
                    {
                        "quote": "千里之行，始于足下。",
                        "author": "老子"
                    }
                ],
                "history": "中文的历史可以追溯到3000多年前的甲骨文。它经历了金文、小篆、隶书、楷书等字体演变，是世界上唯一连续使用至今的古老文字。",
                "relations": "中文属于汉藏语系，对日语、韩语、越南语等东亚语言产生了深远影响，这些语言中都保留了大量汉字词汇。"
            },
            {
                "code": "ja",
                "name": "日本語",
                "description": "日语是日本的官方语言，拥有约1.3亿使用者。它混合使用汉字、平假名和片假名三种文字系统，有着独特的语言结构和表达习惯。",
                "famous_quotes": [
                    {
                        "quote": "一期一会。",
                        "author": "茶道精神"
                    },
                    {
                        "quote": "七転び八起き。",
                        "author": "日本谚语"
                    }
                ],
                "history": "日语的形成受到了古代汉语的深刻影响。平假名和片假名分别由汉字的草书和楷书演化而来，在平安时代逐渐成熟。",
                "relations": "日语与琉球语有亲属关系，同时在词汇和文字上受到了汉语的巨大影响，近现代又吸收了大量英语词汇。"
            },
            {
                "code": "fr",
                "name": "Français",
                "description": "法语是法国的官方语言，也是联合国、欧盟等国际组织的工作语言，被誉为\"世界上最美丽的语言\"之一，在全球约有3亿使用者。",
                "famous_quotes": [
                    {
                        "quote": "C'est le temps que tu as perdu pour ta rose qui fait ta rose si importante.",
                        "author": "Antoine de Saint-Exupéry"
                    }
                ],
                "history": "法语属于印欧语系罗曼语族，起源于拉丁语。中世纪时法语是欧洲外交和文化的通用语言，对英语产生了深远影响。",
                "relations": "法语与意大利语、西班牙语、葡萄牙语、罗马尼亚语等同属罗曼语族，共享拉丁语起源的词汇和语法特征。"
            },
            {
                "code": "de",
                "name": "Deutsch",
                "description": "德语是德国、奥地利、瑞士等国的官方语言，属于印欧语系日耳曼语族，以其严谨的语法和丰富的复合词著称。",
                "famous_quotes": [
                    {
                        "quote": "Der Weg ist das Ziel.",
                        "author": "Konfuzius (German proverb)"
                    }
                ],
                "history": "德语起源于古代日耳曼部落的语言，经历了古高地德语、中古高地德语和现代高地德语三个主要阶段。",
                "relations": "德语与英语、荷兰语、弗里斯兰语同属日耳曼语族西日耳曼语支，在词汇和语法上有很多相似之处。"
            },
            {
                "code": "es",
                "name": "Español",
                "description": "西班牙语是世界上第二大母语语言，拥有约5亿使用者。它是20多个国家的官方语言，以其热情奔放的发音和丰富的文学作品著称。",
                "famous_quotes": [
                    {
                        "quote": "La vida es sueño.",
                        "author": "Pedro Calderón de la Barca"
                    }
                ],
                "history": "西班牙语起源于拉丁语，是罗马帝国时期伊比利亚半岛上的通俗拉丁语发展而来。随着大航海时代传播到美洲大陆。",
                "relations": "西班牙语与法语、意大利语、葡萄牙语、罗马尼亚语等同属罗曼语族，共享拉丁语起源的词汇和语法结构。"
            }
        ]
        
        for lang in default_languages:
            lang_dir = self.languages_dir / lang["code"]
            lang_dir.mkdir(parents=True, exist_ok=True)
            intro_path = lang_dir / "intro.json"
            if not intro_path.exists():
                with open(intro_path, 'w', encoding='utf-8') as f:
                    json.dump(lang, f, ensure_ascii=False, indent=2)

    def get_languages(self) -> List[Dict[str, Any]]:
        """获取所有语言列表"""
        languages = []
        if not self.languages_dir.exists():
            return languages
        
        for lang_dir in self.languages_dir.iterdir():
            if lang_dir.is_dir():
                intro_path = lang_dir / "intro.json"
                if intro_path.exists():
                    with open(intro_path, 'r', encoding='utf-8') as f:
                        lang_data = json.load(f)
                        # Check if language has articles (to determine if it's "learned")
                        has_articles = len(list(lang_dir.glob("*/"))) > 1  # Skip intro.json
                        lang_data["is_learned"] = has_articles
                        languages.append(lang_data)
        return languages

    def get_language_intro(self, lang_code: str) -> Optional[Dict[str, Any]]:
        """获取特定语言的介绍信息"""
        lang_dir = self.languages_dir / lang_code
        intro_path = lang_dir / "intro.json"
        if intro_path.exists():
            with open(intro_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    def save_language_intro(self, lang_code: str, intro_data: Dict[str, Any]):
        """保存语言介绍"""
        lang_dir = self.languages_dir / lang_code
        lang_dir.mkdir(parents=True, exist_ok=True)
        intro_path = lang_dir / "intro.json"
        with open(intro_path, 'w', encoding='utf-8') as f:
            json.dump(intro_data, f, ensure_ascii=False, indent=2)

    def get_articles(self, lang_code: str) -> List[Dict[str, Any]]:
        """获取某语言的所有文章"""
        lang_dir = self.languages_dir / lang_code
        articles = []
        if not lang_dir.exists():
            return articles
        
        for article_dir in lang_dir.iterdir():
            if article_dir.is_dir() and article_dir.name != "intro.json":
                meta_path = article_dir / "meta.json"
                if meta_path.exists():
                    with open(meta_path, 'r', encoding='utf-8') as f:
                        meta = json.load(f)
                        meta["id"] = article_dir.name
                        articles.append(meta)
        
        # Sort articles by created_at descending
        articles.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return articles

    def save_article(self, lang_code: str, article_data: Dict[str, Any]) -> str:
        """保存文章，返回文章ID"""
        lang_dir = self.languages_dir / lang_code
        lang_dir.mkdir(parents=True, exist_ok=True)
        
        article_id = article_data.get("id", datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3])
        article_dir = lang_dir / article_id
        article_dir.mkdir(parents=True, exist_ok=True)
        
        # Save meta
        meta_path = article_dir / "meta.json"
        meta_data = {
            "title": article_data.get("title", "Untitled"),
            "created_at": article_data.get("created_at", datetime.now().isoformat()),
            "llm_temp": article_data.get("llm_temp", 0)
        }
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(meta_data, f, ensure_ascii=False, indent=2)
        
        # Save text
        text_path = article_dir / "text.txt"
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(article_data.get("text", ""))
        
        # Save file_id (link to existing processing system)
        if article_data.get("file_id"):
            file_id_path = article_dir / "file_id.txt"
            with open(file_id_path, 'w', encoding='utf-8') as f:
                f.write(article_data["file_id"])
        
        return article_id

    def get_article(self, lang_code: str, article_id: str) -> Optional[Dict[str, Any]]:
        """获取文章详情"""
        article_dir = self.languages_dir / lang_code / article_id
        if not article_dir.exists():
            return None
        
        # Load meta
        meta_path = article_dir / "meta.json"
        meta = {}
        if meta_path.exists():
            with open(meta_path, 'r', encoding='utf-8') as f:
                meta = json.load(f)
        
        # Load text
        text_path = article_dir / "text.txt"
        text = ""
        if text_path.exists():
            with open(text_path, 'r', encoding='utf-8') as f:
                text = f.read()
        
        # Load file_id
        file_id_path = article_dir / "file_id.txt"
        file_id = None
        if file_id_path.exists():
            with open(file_id_path, 'r', encoding='utf-8') as f:
                file_id = f.read().strip()
        
        return {
            "id": article_id,
            **meta,
            "text": text,
            "file_id": file_id
        }

    def delete_article(self, lang_code: str, article_id: str):
        """删除文章"""
        article_dir = self.languages_dir / lang_code / article_id
        if article_dir.exists():
            import shutil
            shutil.rmtree(article_dir)

    def link_article_to_file(self, lang_code: str, article_id: str, file_id: str):
        """关联文章到处理文件ID"""
        article_dir = self.languages_dir / lang_code / article_id
        article_dir.mkdir(parents=True, exist_ok=True)
        
        file_id_path = article_dir / "file_id.txt"
        with open(file_id_path, 'w', encoding='utf-8') as f:
            f.write(file_id)
