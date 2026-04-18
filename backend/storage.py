import os
import json
from pathlib import Path
from typing import List, Dict, Any


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
