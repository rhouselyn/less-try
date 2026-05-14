import pytest
import json
import os
import shutil
from pathlib import Path
from storage import Storage


@pytest.fixture
def storage(tmp_path):
    s = Storage()
    s.base_dir = tmp_path
    s.files_dir = tmp_path / "files"
    s.languages_dir = tmp_path / "languages"
    s.files_dir.mkdir(parents=True, exist_ok=True)
    s.languages_dir.mkdir(parents=True, exist_ok=True)
    return s


class TestHistoryStorage:
    def test_add_and_load_history(self, storage):
        storage.add_history_record("file1", "Test Title", "en", "zh", "Hello world")
        records = storage.load_history()
        assert len(records) == 1
        assert records[0]["file_id"] == "file1"
        assert records[0]["title"] == "Test Title"
        assert records[0]["source_lang"] == "en"
        assert records[0]["target_lang"] == "zh"
        assert records[0]["text_preview"] == "Hello world"

    def test_add_multiple_records(self, storage):
        storage.add_history_record("file1", "Title 1", "en", "zh", "Preview 1")
        storage.add_history_record("file2", "Title 2", "ja", "zh", "Preview 2")
        records = storage.load_history()
        assert len(records) == 2

    def test_delete_history_record(self, storage):
        storage.add_history_record("file1", "Title 1", "en", "zh", "Preview 1")
        storage.add_history_record("file2", "Title 2", "ja", "zh", "Preview 2")
        result = storage.delete_history_record("file1")
        assert result is True
        records = storage.load_history()
        assert len(records) == 1
        assert records[0]["file_id"] == "file2"

    def test_delete_nonexistent_record(self, storage):
        storage.add_history_record("file1", "Title 1", "en", "zh", "Preview 1")
        result = storage.delete_history_record("nonexistent")
        assert result is False
        records = storage.load_history()
        assert len(records) == 1

    def test_rename_history_record(self, storage):
        storage.add_history_record("file1", "Old Title", "en", "zh", "Preview")
        result = storage.rename_history_record("file1", "New Title")
        assert result is True
        records = storage.load_history()
        assert records[0]["title"] == "New Title"

    def test_rename_nonexistent_record(self, storage):
        result = storage.rename_history_record("nonexistent", "New Title")
        assert result is False

    def test_load_empty_history(self, storage):
        records = storage.load_history()
        assert records == []

    def test_delete_removes_file_directory(self, storage):
        file_dir = storage.get_file_dir("file1")
        (file_dir / "test.txt").write_text("test")
        storage.add_history_record("file1", "Title", "en", "zh", "Preview")
        storage.delete_history_record("file1")
        assert not file_dir.exists()
