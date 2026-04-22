import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional


class Storage:
    def __init__(self):
        self.base_dir = Path("/workspace/data")
        self.files_dir = self.base_dir / "files"
        self.languages_dir = self.base_dir / "languages"
        
        self.files_dir.mkdir(parents=True, exist_ok=True)
        self.languages_dir.mkdir(parents=True, exist_ok=True)

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
    
    def save_phase_progress(self, file_id: str, phase: int, unit_id: int, exercise_index: int):
        """保存阶段学习进度"""
        file_dir = self.get_file_dir(file_id)
        progress_path = file_dir / f"phase{phase}_progress.json"
        with open(progress_path, 'w', encoding='utf-8') as f:
            json.dump({
                "current_unit": unit_id,
                "current_exercise": exercise_index
            }, f, ensure_ascii=False, indent=2)
    
    def load_phase_progress(self, file_id: str, phase: int):
        """加载阶段学习进度"""
        file_dir = self.get_file_dir(file_id)
        progress_path = file_dir / f"phase{phase}_progress.json"
        if progress_path.exists():
            with open(progress_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data
        return {"current_unit": 0, "current_exercise": 0}
    
    def save_sentence_order(self, file_id: str, phase: int, shuffled_indices: List[int]):
        """保存句子的随机顺序"""
        file_dir = self.get_file_dir(file_id)
        order_path = file_dir / f"phase{phase}_sentence_order.json"
        with open(order_path, 'w', encoding='utf-8') as f:
            json.dump({"shuffled_indices": shuffled_indices}, f, ensure_ascii=False, indent=2)
    
    def load_sentence_order(self, file_id: str, phase: int):
        """加载句子的随机顺序"""
        file_dir = self.get_file_dir(file_id)
        order_path = file_dir / f"phase{phase}_sentence_order.json"
        if order_path.exists():
            with open(order_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get("shuffled_indices")
        return None
    
    def save_phase2_exercise_cache(self, file_id: str, exercise_id: str, cache_data: Dict):
        """缓存阶段2练习数据"""
        file_dir = self.get_file_dir(file_id)
        cache_dir = file_dir / "phase2_cache"
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file = cache_dir / f"{exercise_id}.json"
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
    
    def load_phase2_exercise_cache(self, file_id: str, exercise_id: str):
        """加载阶段2练习缓存"""
        file_dir = self.get_file_dir(file_id)
        cache_dir = file_dir / "phase2_cache"
        cache_file = cache_dir / f"{exercise_id}.json"
        if cache_file.exists():
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None
    
    def save_used_sentences(self, file_id: str, used_sentences: List[str]):
        """保存已使用的句子"""
        file_dir = self.get_file_dir(file_id)
        used_path = file_dir / "used_sentences.json"
        with open(used_path, 'w', encoding='utf-8') as f:
            json.dump({"used_sentences": used_sentences}, f, ensure_ascii=False, indent=2)
    
    def load_used_sentences(self, file_id: str) -> Optional[List[str]]:
        """加载已使用的句子"""
        file_dir = self.get_file_dir(file_id)
        used_path = file_dir / "used_sentences.json"
        if used_path.exists():
            with open(used_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get("used_sentences", [])
        return None
