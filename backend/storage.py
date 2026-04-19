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
    
    def generate_learning_units(self, vocab: List[Dict], unit_size: int = 10) -> List[List[Dict]]:
        """生成学习单元，默认10词一组"""
        import random
        # 使用固定种子确保生成的顺序一致
        random.seed(42)
        # 打乱单词顺序
        shuffled_vocab = vocab.copy()
        random.shuffle(shuffled_vocab)
        # 按unit_size分组
        units = []
        for i in range(0, len(shuffled_vocab), unit_size):
            unit = shuffled_vocab[i:i + unit_size]
            units.append(unit)
        return units
    
    def save_learning_units(self, file_id: str, units: List[List[Dict]]):
        """保存学习单元"""
        file_dir = self.get_file_dir(file_id)
        units_path = file_dir / "learning_units.json"
        # 只保存单词信息的必要字段
        units_data = []
        for unit in units:
            unit_data = []
            for word in unit:
                word_data = {
                    "word": word.get("word"),
                    "context_meaning": word.get("context_meaning"),
                    "morphology": word.get("morphology"),
                    "ipa": word.get("ipa")
                }
                unit_data.append(word_data)
            units_data.append(unit_data)
        with open(units_path, 'w', encoding='utf-8') as f:
            json.dump({"units": units_data}, f, ensure_ascii=False, indent=2)
    
    def load_learning_units(self, file_id: str) -> List[List[Dict]]:
        """加载学习单元"""
        file_dir = self.get_file_dir(file_id)
        units_path = file_dir / "learning_units.json"
        if units_path.exists():
            with open(units_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get("units", [])
        return []
    
    def save_unit_progress(self, file_id: str, unit_progress: Dict):
        """保存单元学习进度"""
        file_dir = self.get_file_dir(file_id)
        progress_path = file_dir / "unit_progress.json"
        with open(progress_path, 'w', encoding='utf-8') as f:
            json.dump(unit_progress, f, ensure_ascii=False, indent=2)
    
    def load_unit_progress(self, file_id: str) -> Dict:
        """加载单元学习进度"""
        file_dir = self.get_file_dir(file_id)
        progress_path = file_dir / "unit_progress.json"
        if progress_path.exists():
            with open(progress_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        # 默认返回空进度
        return {
            "completed_units": [],
            "current_unit": 0,
            "unit_status": {}
        }
    
    def save_sentence_coverage(self, file_id: str, covered_sentences: List[int]):
        """保存已覆盖的句子索引"""
        file_dir = self.get_file_dir(file_id)
        coverage_path = file_dir / "sentence_coverage.json"
        with open(coverage_path, 'w', encoding='utf-8') as f:
            json.dump({"covered_sentences": covered_sentences}, f, ensure_ascii=False, indent=2)
    
    def load_sentence_coverage(self, file_id: str) -> List[int]:
        """加载已覆盖的句子索引"""
        file_dir = self.get_file_dir(file_id)
        coverage_path = file_dir / "sentence_coverage.json"
        if coverage_path.exists():
            with open(coverage_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get("covered_sentences", [])
        return []
