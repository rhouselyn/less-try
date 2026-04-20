import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import shutil


class Storage:
    def __init__(self):
        self.base_dir = Path("/workspace/data")
        self.files_dir = self.base_dir / "files"
        self.languages_dir = self.base_dir / "languages"
        
        self.files_dir.mkdir(parents=True, exist_ok=True)
        self.languages_dir.mkdir(parents=True, exist_ok=True)
        self._init_articles_index()

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
    
    def _init_articles_index(self):
        """初始化文章索引文件"""
        articles_path = self.base_dir / "articles.json"
        if not articles_path.exists():
            with open(articles_path, 'w', encoding='utf-8') as f:
                json.dump({"articles": []}, f, ensure_ascii=False, indent=2)
    
    def save_article(self, article_data: Dict[str, Any]):
        """保存文章元数据"""
        articles_path = self.base_dir / "articles.json"
        with open(articles_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # 检查是否已存在该文章
            existing_index = None
            for i, article in enumerate(data["articles"]):
                if article["id"] == article_data["id"]:
                    existing_index = i
                    break
            if existing_index is not None:
                data["articles"][existing_index] = article_data
            else:
                data["articles"].append(article_data)
        with open(articles_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load_articles(self) -> List[Dict[str, Any]]:
        """加载所有文章"""
        articles_path = self.base_dir / "articles.json"
        with open(articles_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data["articles"]
    
    def get_articles_by_language(self, target_lang: str) -> List[Dict[str, Any]]:
        """按语言获取文章"""
        articles = self.load_articles()
        return [a for a in articles if a["targetLang"] == target_lang]
    
    def delete_article(self, file_id: str) -> bool:
        """删除文章及其所有相关数据"""
        articles_path = self.base_dir / "articles.json"
        with open(articles_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        article_found = False
        new_articles = []
        for article in data["articles"]:
            if article["id"] != file_id:
                new_articles.append(article)
            else:
                article_found = True
        if article_found:
            data["articles"] = new_articles
            with open(articles_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            # 删除文件目录
            file_dir = self.files_dir / file_id
            if file_dir.exists():
                shutil.rmtree(file_dir)
            return True
        return False
    
    def get_language_intro(self, lang_code: str) -> Optional[Dict[str, Any]]:
        """获取语言介绍"""
        lang_dir = self.languages_dir / lang_code
        intro_path = lang_dir / "intro.json"
        if intro_path.exists():
            with open(intro_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None
    
    def get_studied_languages(self) -> List[str]:
        """获取已学习的语言列表"""
        articles = self.load_articles()
        languages = set()
        for article in articles:
            languages.add(article["targetLang"])
        return sorted(list(languages))
