import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional


class Storage:
    def __init__(self):
        self.base_dir = Path("/workspace/data")
        self.files_dir = self.base_dir / "files"
        self.languages_dir = self.base_dir / "languages"
        self.uploads_dir = self.base_dir / "uploads"
        self.progress_dir = self.base_dir / "progress"
        
        # Create all necessary directories
        self.files_dir.mkdir(parents=True, exist_ok=True)
        self.languages_dir.mkdir(parents=True, exist_ok=True)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.progress_dir.mkdir(parents=True, exist_ok=True)

    def get_file_dir(self, file_id: str) -> Path:
        file_dir = self.files_dir / file_id
        file_dir.mkdir(parents=True, exist_ok=True)
        return file_dir

    def get_uploads_dir(self) -> Path:
        return self.uploads_dir

    def get_progress_dir(self, file_id: str) -> Path:
        progress_dir = self.progress_dir / file_id
        progress_dir.mkdir(parents=True, exist_ok=True)
        return progress_dir

    def save_pipeline_data(self, file_id: str, data: Any):
        file_dir = self.get_file_dir(file_id)
        pipeline_path = file_dir / "pipeline_data.json"
        with open(pipeline_path, 'w', encoding='utf-8') as f:
            json.dump({"data": data}, f, ensure_ascii=False, indent=2)

    def load_pipeline_data(self, file_id: str) -> Any:
        file_dir = self.get_file_dir(file_id)
        pipeline_path = file_dir / "pipeline_data.json"
        if not pipeline_path.exists():
            return []
        with open(pipeline_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get("data", [])

    def save_vocab(self, file_id: str, vocab: List[Dict]):
        file_dir = self.get_file_dir(file_id)
        vocab_path = file_dir / "vocab.json"
        with open(vocab_path, 'w', encoding='utf-8') as f:
            json.dump({"vocab": vocab}, f, ensure_ascii=False, indent=2)

    def load_vocab(self, file_id: str) -> List[Dict]:
        file_dir = self.get_file_dir(file_id)
        vocab_path = file_dir / "vocab.json"
        if not vocab_path.exists():
            return []
        with open(vocab_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get("vocab", [])

    def save_text(self, file_id: str, text: str):
        file_dir = self.get_file_dir(file_id)
        text_path = file_dir / "cleaned_text.txt"
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(text)

    def save_file_metadata(self, file_id: str, metadata: Dict[str, Any]):
        file_dir = self.get_file_dir(file_id)
        metadata_path = file_dir / "metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

    def load_file_metadata(self, file_id: str) -> Dict[str, Any]:
        file_dir = self.get_file_dir(file_id)
        metadata_path = file_dir / "metadata.json"
        if not metadata_path.exists():
            return {}
        with open(metadata_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def save_progress(self, file_id: str, progress: Dict[str, Any]):
        progress_dir = self.get_progress_dir(file_id)
        progress_path = progress_dir / "progress.json"
        with open(progress_path, 'w', encoding='utf-8') as f:
            json.dump(progress, f, ensure_ascii=False, indent=2)

    def load_progress(self, file_id: str) -> Dict[str, Any]:
        progress_dir = self.get_progress_dir(file_id)
        progress_path = progress_dir / "progress.json"
        if not progress_path.exists():
            return {}
        with open(progress_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def list_files(self) -> List[str]:
        files = []
        if self.files_dir.exists():
            for item in self.files_dir.iterdir():
                if item.is_dir():
                    files.append(item.name)
        return files

    def save_snapshot(self, file_id: str, snapshot: Dict[str, Any]):
        file_dir = self.get_file_dir(file_id)
        snapshot_path = file_dir / "snapshot.json"
        with open(snapshot_path, 'w', encoding='utf-8') as f:
            json.dump(snapshot, f, ensure_ascii=False, indent=2)

    def load_snapshot(self, file_id: str) -> Dict[str, Any]:
        file_dir = self.get_file_dir(file_id)
        snapshot_path = file_dir / "snapshot.json"
        if not snapshot_path.exists():
            return {}
        with open(snapshot_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def delete_file(self, file_id: str):
        import shutil
        file_dir = self.get_file_dir(file_id)
        progress_dir = self.get_progress_dir(file_id)
        
        if file_dir.exists():
            shutil.rmtree(file_dir)
        if progress_dir.exists():
            shutil.rmtree(progress_dir)
