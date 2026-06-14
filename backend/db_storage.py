"""基于 SQLite 的数据库存储，兼容文件存储过渡。

优先从数据库读写，读取时若数据库无数据则回退到文件存储。
所有写入操作同时写入数据库（可选双写文件以便回退）。
"""

import json
import sqlite3
import datetime
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional

from config import DATA_DIR, CONFIG_DIR, USER_PREFS_FILE


class DatabaseStorage:
    def __init__(self, db_path: str = None, fallback_to_file: bool = False, dual_write: bool = False):
        self.db_path = db_path or str(DATA_DIR / "gualingo.db")
        self.fallback_to_file = fallback_to_file
        self.dual_write = dual_write

        # 文件存储实例，用于回退读取和双写
        self._file_storage = None
        if fallback_to_file or dual_write:
            from storage import Storage
            self._file_storage = Storage()

        # SQLite 连接（每个线程独立连接）
        self._local = threading.local()
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, 'conn') or self._local.conn is None:
            self._local.conn = sqlite3.connect(self.db_path)
            self._local.conn.row_factory = sqlite3.Row
            self._local.conn.execute("PRAGMA journal_mode=WAL")
            self._local.conn.execute("PRAGMA foreign_keys=ON")
        return self._local.conn

    def _init_db(self):
        conn = self._get_conn()
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS pipeline_data (
                file_id TEXT NOT NULL,
                data TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id)
            );

            CREATE TABLE IF NOT EXISTS vocab (
                file_id TEXT NOT NULL,
                vocab TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id)
            );

            CREATE TABLE IF NOT EXISTS cleaned_text (
                file_id TEXT NOT NULL,
                text TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id)
            );

            CREATE TABLE IF NOT EXISTS word_cache (
                file_id TEXT NOT NULL,
                word TEXT NOT NULL,
                word_info TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id, word)
            );

            CREATE TABLE IF NOT EXISTS language_word_index (
                source_lang TEXT NOT NULL,
                word_lower TEXT NOT NULL,
                file_id TEXT NOT NULL,
                PRIMARY KEY (source_lang, word_lower)
            );

            CREATE TABLE IF NOT EXISTS language_settings (
                file_id TEXT NOT NULL,
                source_lang TEXT NOT NULL DEFAULT 'en',
                target_lang TEXT NOT NULL DEFAULT 'zh',
                original_text TEXT,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id)
            );

            CREATE TABLE IF NOT EXISTS learning_progress (
                file_id TEXT NOT NULL,
                current_index INTEGER NOT NULL DEFAULT 0,
                max_index INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id)
            );

            CREATE TABLE IF NOT EXISTS shuffled_order (
                file_id TEXT NOT NULL,
                shuffled_indices TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id)
            );

            CREATE TABLE IF NOT EXISTS learning_plan (
                file_id TEXT NOT NULL,
                plan TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id)
            );

            CREATE TABLE IF NOT EXISTS phase_progress (
                file_id TEXT NOT NULL,
                phase INTEGER NOT NULL,
                current_unit INTEGER NOT NULL DEFAULT 0,
                current_exercise INTEGER NOT NULL DEFAULT 0,
                current_exercise_type_index INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id, phase)
            );

            CREATE TABLE IF NOT EXISTS sentence_order (
                file_id TEXT NOT NULL,
                phase INTEGER NOT NULL,
                shuffled_indices TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id, phase)
            );

            CREATE TABLE IF NOT EXISTS phase2_exercise_cache (
                file_id TEXT NOT NULL,
                exercise_id TEXT NOT NULL,
                cache_data TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id, exercise_id)
            );

            CREATE TABLE IF NOT EXISTS exercise_order (
                file_id TEXT NOT NULL,
                phase INTEGER NOT NULL,
                exercise_order TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id, phase)
            );

            CREATE TABLE IF NOT EXISTS phase2_progress (
                file_id TEXT NOT NULL,
                current_exercise_index INTEGER NOT NULL DEFAULT 0,
                max_exercise_index INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id)
            );

            CREATE TABLE IF NOT EXISTS used_sentences (
                file_id TEXT NOT NULL,
                used_sentences TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id)
            );

            CREATE TABLE IF NOT EXISTS history (
                file_id TEXT NOT NULL PRIMARY KEY,
                title TEXT NOT NULL DEFAULT '',
                source_lang TEXT NOT NULL DEFAULT 'en',
                target_lang TEXT NOT NULL DEFAULT 'zh',
                text_preview TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS unit_stars (
                file_id TEXT NOT NULL,
                stars_data TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id)
            );

            CREATE TABLE IF NOT EXISTS learned_words (
                file_id TEXT NOT NULL,
                words TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (file_id)
            );

            CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                prefs TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        """)
        conn.commit()

    # ── pipeline_data ──────────────────────────────────────

    def save_pipeline_data(self, file_id: str, data: Any):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO pipeline_data (file_id, data, updated_at) VALUES (?, ?, datetime('now'))",
            (file_id, json.dumps(data, ensure_ascii=False))
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_pipeline_data(file_id, data)

    def load_pipeline_data(self, file_id: str) -> Any:
        conn = self._get_conn()
        row = conn.execute("SELECT data FROM pipeline_data WHERE file_id = ?", (file_id,)).fetchone()
        if row:
            return json.loads(row["data"])
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_pipeline_data(file_id)
            if data:
                # 自动迁移到数据库
                self.save_pipeline_data(file_id, data)
            return data
        return {}

    # ── vocab ──────────────────────────────────────────────

    def save_vocab(self, file_id: str, vocab: List[Dict]):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO vocab (file_id, vocab, updated_at) VALUES (?, ?, datetime('now'))",
            (file_id, json.dumps(vocab, ensure_ascii=False))
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_vocab(file_id, vocab)

    def load_vocab(self, file_id: str) -> List[Dict]:
        conn = self._get_conn()
        row = conn.execute("SELECT vocab FROM vocab WHERE file_id = ?", (file_id,)).fetchone()
        if row:
            return json.loads(row["vocab"])
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_vocab(file_id)
            if data:
                self.save_vocab(file_id, data)
            return data
        return []

    # ── cleaned_text ───────────────────────────────────────

    def save_text(self, file_id: str, text: str):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO cleaned_text (file_id, text, updated_at) VALUES (?, ?, datetime('now'))",
            (file_id, text)
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_text(file_id, text)

    # ── word_cache ─────────────────────────────────────────

    def save_word_cache(self, file_id: str, word: str, word_info: Dict, overwrite_index: bool = False):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO word_cache (file_id, word, word_info, updated_at) VALUES (?, ?, ?, datetime('now'))",
            (file_id, word.lower(), json.dumps(word_info, ensure_ascii=False))
        )
        conn.commit()
        # 更新语言级索引
        try:
            settings = self.load_language_settings(file_id)
            source_lang = settings.get("source_lang", "en")
            self.add_word_to_language_index(source_lang, word, file_id, overwrite=overwrite_index)
        except Exception:
            pass
        if self.dual_write and self._file_storage:
            self._file_storage.save_word_cache(file_id, word, word_info, overwrite_index=overwrite_index)

    def load_word_cache(self, file_id: str, word: str) -> Optional[Dict]:
        conn = self._get_conn()
        row = conn.execute("SELECT word_info FROM word_cache WHERE file_id = ? AND word = ?",
                           (file_id, word.lower())).fetchone()
        if row:
            return json.loads(row["word_info"])
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_word_cache(file_id, word)
            if data:
                self.save_word_cache(file_id, word, data)
            return data
        return None

    def delete_word_cache(self, file_id: str, word: str):
        conn = self._get_conn()
        conn.execute("DELETE FROM word_cache WHERE file_id = ? AND word = ?",
                     (file_id, word.lower()))
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.delete_word_cache(file_id, word)

    def clear_word_cache(self, file_id: str):
        conn = self._get_conn()
        conn.execute("DELETE FROM word_cache WHERE file_id = ?", (file_id,))
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.clear_word_cache(file_id)

    # ── language_word_index ────────────────────────────────

    def load_language_word_index(self, source_lang: str) -> Dict[str, str]:
        conn = self._get_conn()
        rows = conn.execute("SELECT word_lower, file_id FROM language_word_index WHERE source_lang = ?",
                            (source_lang,)).fetchall()
        if rows:
            return {row["word_lower"]: row["file_id"] for row in rows}
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_language_word_index(source_lang)
            if data:
                # 批量写入数据库
                self._save_language_word_index_batch(source_lang, data)
            return data
        return {}

    def _save_language_word_index_batch(self, source_lang: str, index: Dict[str, str]):
        conn = self._get_conn()
        conn.execute("DELETE FROM language_word_index WHERE source_lang = ?", (source_lang,))
        conn.executemany(
            "INSERT INTO language_word_index (source_lang, word_lower, file_id) VALUES (?, ?, ?)",
            [(source_lang, w, fid) for w, fid in index.items()]
        )
        conn.commit()

    def save_language_word_index(self, source_lang: str, index: Dict[str, str]):
        self._save_language_word_index_batch(source_lang, index)
        if self.dual_write and self._file_storage:
            self._file_storage.save_language_word_index(source_lang, index)

    def add_word_to_language_index(self, source_lang: str, word: str, file_id: str, overwrite: bool = False):
        if not word or not source_lang:
            return
        word_lower = word.lower()
        conn = self._get_conn()
        if overwrite:
            conn.execute(
                "INSERT OR REPLACE INTO language_word_index (source_lang, word_lower, file_id) VALUES (?, ?, ?)",
                (source_lang, word_lower, file_id)
            )
        else:
            conn.execute(
                "INSERT OR IGNORE INTO language_word_index (source_lang, word_lower, file_id) VALUES (?, ?, ?)",
                (source_lang, word_lower, file_id)
            )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.add_word_to_language_index(source_lang, word, file_id, overwrite=overwrite)

    def find_global_word_cache(self, word: str, source_lang: str) -> Optional[Dict]:
        word_lower = word.lower()
        conn = self._get_conn()
        # 先通过索引查找
        row = conn.execute(
            "SELECT wc.word_info FROM word_cache wc "
            "JOIN language_word_index lwi ON wc.file_id = lwi.file_id AND wc.word = lwi.word_lower "
            "WHERE lwi.source_lang = ? AND lwi.word_lower = ?",
            (source_lang, word_lower)
        ).fetchone()
        if row:
            data = json.loads(row["word_info"])
            cached_word = data.get("word", "").lower()
            if cached_word == word_lower:
                return data
            # 索引过期，清理
            conn.execute("DELETE FROM language_word_index WHERE source_lang = ? AND word_lower = ?",
                         (source_lang, word_lower))
            conn.commit()
            return None
        if self.fallback_to_file and self._file_storage:
            return self._file_storage.find_global_word_cache(word, source_lang)
        return None

    # ── language_settings ──────────────────────────────────

    def save_language_settings(self, file_id: str, source_lang: str, target_lang: str, original_text: str = None):
        conn = self._get_conn()
        # 获取已有记录的 original_text
        existing = conn.execute("SELECT original_text FROM language_settings WHERE file_id = ?",
                                (file_id,)).fetchone()
        if original_text is None and existing and existing["original_text"]:
            original_text = existing["original_text"]
        conn.execute(
            "INSERT OR REPLACE INTO language_settings (file_id, source_lang, target_lang, original_text, updated_at) "
            "VALUES (?, ?, ?, ?, datetime('now'))",
            (file_id, source_lang, target_lang, original_text)
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_language_settings(file_id, source_lang, target_lang, original_text)

    def load_language_settings(self, file_id: str) -> Dict[str, str]:
        conn = self._get_conn()
        row = conn.execute("SELECT source_lang, target_lang, original_text FROM language_settings WHERE file_id = ?",
                           (file_id,)).fetchone()
        if row:
            result = {"source_lang": row["source_lang"], "target_lang": row["target_lang"]}
            if row["original_text"]:
                result["original_text"] = row["original_text"]
            return result
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_language_settings(file_id)
            if data and data.get("source_lang", "en") != "en" or data.get("target_lang", "zh") != "zh":
                self.save_language_settings(file_id, data.get("source_lang", "en"),
                                            data.get("target_lang", "zh"),
                                            data.get("original_text"))
            return data
        return {"source_lang": "en", "target_lang": "zh"}

    # ── learning_progress ──────────────────────────────────

    def save_learning_progress(self, file_id: str, current_index: int):
        conn = self._get_conn()
        existing = conn.execute("SELECT max_index FROM learning_progress WHERE file_id = ?",
                                (file_id,)).fetchone()
        max_index = max(existing["max_index"] if existing else 0, current_index)
        conn.execute(
            "INSERT OR REPLACE INTO learning_progress (file_id, current_index, max_index, updated_at) "
            "VALUES (?, ?, ?, datetime('now'))",
            (file_id, current_index, max_index)
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_learning_progress(file_id, current_index)

    def load_learning_progress(self, file_id: str) -> int:
        conn = self._get_conn()
        row = conn.execute("SELECT current_index FROM learning_progress WHERE file_id = ?",
                           (file_id,)).fetchone()
        if row is not None:
            return row["current_index"]
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_learning_progress(file_id)
            if data:
                self.save_learning_progress(file_id, data)
            return data
        return 0

    def load_learning_max_progress(self, file_id: str) -> int:
        conn = self._get_conn()
        row = conn.execute("SELECT max_index, current_index FROM learning_progress WHERE file_id = ?",
                           (file_id,)).fetchone()
        if row is not None:
            return row["max_index"] if row["max_index"] is not None else row["current_index"]
        if self.fallback_to_file and self._file_storage:
            return self._file_storage.load_learning_max_progress(file_id)
        return 0

    # ── shuffled_order ─────────────────────────────────────

    def save_shuffled_order(self, file_id: str, shuffled_indices: List[int]):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO shuffled_order (file_id, shuffled_indices, updated_at) VALUES (?, ?, datetime('now'))",
            (file_id, json.dumps(shuffled_indices))
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_shuffled_order(file_id, shuffled_indices)

    def load_shuffled_order(self, file_id: str) -> Optional[List[int]]:
        conn = self._get_conn()
        row = conn.execute("SELECT shuffled_indices FROM shuffled_order WHERE file_id = ?",
                           (file_id,)).fetchone()
        if row:
            return json.loads(row["shuffled_indices"])
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_shuffled_order(file_id)
            if data:
                self.save_shuffled_order(file_id, data)
            return data
        return None

    # ── learning_plan ──────────────────────────────────────

    def save_learning_plan(self, file_id: str, plan: List[Dict]):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO learning_plan (file_id, plan, updated_at) VALUES (?, ?, datetime('now'))",
            (file_id, json.dumps(plan, ensure_ascii=False))
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_learning_plan(file_id, plan)

    def load_learning_plan(self, file_id: str) -> Optional[List[Dict]]:
        conn = self._get_conn()
        row = conn.execute("SELECT plan FROM learning_plan WHERE file_id = ?",
                           (file_id,)).fetchone()
        if row:
            return json.loads(row["plan"])
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_learning_plan(file_id)
            if data:
                self.save_learning_plan(file_id, data)
            return data
        return None

    # ── phase_progress ─────────────────────────────────────

    def save_phase_progress(self, file_id: str, phase: int, unit_id: int, exercise_index: int,
                            exercise_type_index: int = 0):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO phase_progress "
            "(file_id, phase, current_unit, current_exercise, current_exercise_type_index, updated_at) "
            "VALUES (?, ?, ?, ?, ?, datetime('now'))",
            (file_id, phase, unit_id, exercise_index, exercise_type_index)
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_phase_progress(file_id, phase, unit_id, exercise_index, exercise_type_index)

    def load_phase_progress(self, file_id: str, phase: int):
        conn = self._get_conn()
        row = conn.execute(
            "SELECT current_unit, current_exercise, current_exercise_type_index FROM phase_progress "
            "WHERE file_id = ? AND phase = ?",
            (file_id, phase)
        ).fetchone()
        if row:
            return {
                "current_unit": row["current_unit"],
                "current_exercise": row["current_exercise"],
                "current_exercise_type_index": row["current_exercise_type_index"]
            }
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_phase_progress(file_id, phase)
            if data and (data.get("current_unit", 0) > 0 or data.get("current_exercise", 0) > 0):
                self.save_phase_progress(file_id, phase, data["current_unit"],
                                         data["current_exercise"],
                                         data.get("current_exercise_type_index", 0))
            return data
        return {"current_unit": 0, "current_exercise": 0, "current_exercise_type_index": 0}

    # ── sentence_order ─────────────────────────────────────

    def save_sentence_order(self, file_id: str, phase: int, shuffled_indices: List[int]):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO sentence_order (file_id, phase, shuffled_indices, updated_at) "
            "VALUES (?, ?, ?, datetime('now'))",
            (file_id, phase, json.dumps(shuffled_indices))
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_sentence_order(file_id, phase, shuffled_indices)

    def load_sentence_order(self, file_id: str, phase: int):
        conn = self._get_conn()
        row = conn.execute("SELECT shuffled_indices FROM sentence_order WHERE file_id = ? AND phase = ?",
                           (file_id, phase)).fetchone()
        if row:
            return json.loads(row["shuffled_indices"])
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_sentence_order(file_id, phase)
            if data:
                self.save_sentence_order(file_id, phase, data)
            return data
        return None

    # ── phase2_exercise_cache ──────────────────────────────

    def save_phase2_exercise_cache(self, file_id: str, exercise_id: str, cache_data: Dict):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO phase2_exercise_cache (file_id, exercise_id, cache_data, updated_at) "
            "VALUES (?, ?, ?, datetime('now'))",
            (file_id, exercise_id, json.dumps(cache_data, ensure_ascii=False))
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_phase2_exercise_cache(file_id, exercise_id, cache_data)

    def load_phase2_exercise_cache(self, file_id: str, exercise_id: str):
        conn = self._get_conn()
        row = conn.execute("SELECT cache_data FROM phase2_exercise_cache WHERE file_id = ? AND exercise_id = ?",
                           (file_id, exercise_id)).fetchone()
        if row:
            return json.loads(row["cache_data"])
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_phase2_exercise_cache(file_id, exercise_id)
            if data:
                self.save_phase2_exercise_cache(file_id, exercise_id, data)
            return data
        return None

    # ── exercise_order ─────────────────────────────────────

    def save_exercise_order(self, file_id: str, phase: int, exercise_order: List):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO exercise_order (file_id, phase, exercise_order, updated_at) "
            "VALUES (?, ?, ?, datetime('now'))",
            (file_id, phase, json.dumps(exercise_order, ensure_ascii=False))
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_exercise_order(file_id, phase, exercise_order)

    def load_exercise_order(self, file_id: str, phase: int):
        conn = self._get_conn()
        row = conn.execute("SELECT exercise_order FROM exercise_order WHERE file_id = ? AND phase = ?",
                           (file_id, phase)).fetchone()
        if row:
            return json.loads(row["exercise_order"])
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_exercise_order(file_id, phase)
            if data:
                self.save_exercise_order(file_id, phase, data)
            return data
        return None

    # ── phase2_progress ────────────────────────────────────

    def save_phase2_progress(self, file_id: str, current_exercise_index: int):
        conn = self._get_conn()
        existing = conn.execute("SELECT max_exercise_index FROM phase2_progress WHERE file_id = ?",
                                (file_id,)).fetchone()
        max_index = max(existing["max_exercise_index"] if existing else 0, current_exercise_index)
        conn.execute(
            "INSERT OR REPLACE INTO phase2_progress (file_id, current_exercise_index, max_exercise_index, updated_at) "
            "VALUES (?, ?, ?, datetime('now'))",
            (file_id, current_exercise_index, max_index)
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_phase2_progress(file_id, current_exercise_index)

    def load_phase2_progress(self, file_id: str) -> int:
        conn = self._get_conn()
        row = conn.execute("SELECT current_exercise_index FROM phase2_progress WHERE file_id = ?",
                           (file_id,)).fetchone()
        if row is not None:
            return row["current_exercise_index"]
        if self.fallback_to_file and self._file_storage:
            return self._file_storage.load_phase2_progress(file_id)
        return 0

    def load_phase2_max_progress(self, file_id: str) -> int:
        conn = self._get_conn()
        row = conn.execute("SELECT max_exercise_index, current_exercise_index FROM phase2_progress WHERE file_id = ?",
                           (file_id,)).fetchone()
        if row is not None:
            return row["max_exercise_index"] if row["max_exercise_index"] is not None else row["current_exercise_index"]
        if self.fallback_to_file and self._file_storage:
            return self._file_storage.load_phase2_max_progress(file_id)
        return 0

    # ── used_sentences ─────────────────────────────────────

    def save_used_sentences(self, file_id: str, used_sentences: List[str]):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO used_sentences (file_id, used_sentences, updated_at) VALUES (?, ?, datetime('now'))",
            (file_id, json.dumps(used_sentences, ensure_ascii=False))
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_used_sentences(file_id, used_sentences)

    def load_used_sentences(self, file_id: str) -> Optional[List[str]]:
        conn = self._get_conn()
        row = conn.execute("SELECT used_sentences FROM used_sentences WHERE file_id = ?",
                           (file_id,)).fetchone()
        if row:
            return json.loads(row["used_sentences"])
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_used_sentences(file_id)
            if data:
                self.save_used_sentences(file_id, data)
            return data
        return None

    # ── history ────────────────────────────────────────────

    def load_history(self) -> List[Dict]:
        conn = self._get_conn()
        rows = conn.execute("SELECT * FROM history ORDER BY created_at DESC").fetchall()
        if rows:
            return [dict(row) for row in rows]
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_history()
            if data:
                for record in data:
                    conn.execute(
                        "INSERT OR IGNORE INTO history (file_id, title, source_lang, target_lang, text_preview, created_at) "
                        "VALUES (?, ?, ?, ?, ?, ?)",
                        (record.get("file_id"), record.get("title", ""), record.get("source_lang", "en"),
                         record.get("target_lang", "zh"), record.get("text_preview", ""),
                         record.get("created_at", datetime.datetime.now().isoformat()))
                    )
                conn.commit()
            return data
        return []

    def save_history(self, records: List[Dict]):
        conn = self._get_conn()
        conn.execute("DELETE FROM history")
        for record in records:
            conn.execute(
                "INSERT INTO history (file_id, title, source_lang, target_lang, text_preview, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (record.get("file_id"), record.get("title", ""), record.get("source_lang", "en"),
                 record.get("target_lang", "zh"), record.get("text_preview", ""),
                 record.get("created_at", ""), record.get("updated_at"))
            )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_history(records)

    def add_history_record(self, file_id: str, title: str, source_lang: str, target_lang: str, text_preview: str):
        now = datetime.datetime.now().isoformat()
        conn = self._get_conn()
        conn.execute(
            "INSERT OR IGNORE INTO history (file_id, title, source_lang, target_lang, text_preview, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (file_id, title, source_lang, target_lang, text_preview, now)
        )
        conn.commit()
        record = {
            "file_id": file_id, "title": title, "source_lang": source_lang,
            "target_lang": target_lang, "text_preview": text_preview, "created_at": now
        }
        if self.dual_write and self._file_storage:
            self._file_storage.add_history_record(file_id, title, source_lang, target_lang, text_preview)
        return record

    def delete_history_record(self, file_id: str) -> bool:
        conn = self._get_conn()
        cursor = conn.execute("DELETE FROM history WHERE file_id = ?", (file_id,))
        deleted = cursor.rowcount > 0
        # 同时清理该 file_id 的所有关联数据
        if deleted:
            self._delete_file_data(conn, file_id)
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.delete_history_record(file_id)
        return deleted

    def _delete_file_data(self, conn: sqlite3.Connection, file_id: str):
        """删除某个 file_id 的所有关联数据"""
        tables = [
            "pipeline_data", "vocab", "cleaned_text", "word_cache",
            "language_settings", "learning_progress", "shuffled_order",
            "learning_plan", "phase_progress", "sentence_order",
            "phase2_exercise_cache", "exercise_order", "phase2_progress",
            "used_sentences", "unit_stars", "learned_words"
        ]
        for table in tables:
            conn.execute(f"DELETE FROM {table} WHERE file_id = ?", (file_id,))

    def rename_history_record(self, file_id: str, new_title: str) -> bool:
        conn = self._get_conn()
        cursor = conn.execute("UPDATE history SET title = ? WHERE file_id = ?", (new_title, file_id))
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.rename_history_record(file_id, new_title)
        return cursor.rowcount > 0

    def touch_history_record(self, file_id: str):
        now = datetime.datetime.now().isoformat()
        conn = self._get_conn()
        conn.execute("UPDATE history SET updated_at = ? WHERE file_id = ?", (now, file_id))
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.touch_history_record(file_id)

    # ── unit_stars ─────────────────────────────────────────

    def save_unit_stars(self, file_id: str, stars_data: Dict):
        conn = self._get_conn()
        existing = {}
        row = conn.execute("SELECT stars_data FROM unit_stars WHERE file_id = ?", (file_id,)).fetchone()
        if row:
            existing = json.loads(row["stars_data"])
        for key, count in stars_data.items():
            existing[key] = count
        conn.execute(
            "INSERT OR REPLACE INTO unit_stars (file_id, stars_data, updated_at) VALUES (?, ?, datetime('now'))",
            (file_id, json.dumps(existing, ensure_ascii=False))
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_unit_stars(file_id, stars_data)

    def load_unit_stars(self, file_id: str) -> Dict:
        conn = self._get_conn()
        row = conn.execute("SELECT stars_data FROM unit_stars WHERE file_id = ?", (file_id,)).fetchone()
        if row:
            return json.loads(row["stars_data"])
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_unit_stars(file_id)
            if data:
                self.save_unit_stars(file_id, data)
            return data
        return {}

    # ── learned_words ──────────────────────────────────────

    def save_learned_words(self, file_id: str, words: List[str]):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO learned_words (file_id, words, updated_at) VALUES (?, ?, datetime('now'))",
            (file_id, json.dumps(words, ensure_ascii=False))
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_learned_words(file_id, words)

    def load_learned_words(self, file_id: str) -> set:
        conn = self._get_conn()
        row = conn.execute("SELECT words FROM learned_words WHERE file_id = ?", (file_id,)).fetchone()
        if row:
            return set(w.lower() for w in json.loads(row["words"]) if w)
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_learned_words(file_id)
            if data:
                self.save_learned_words(file_id, list(data))
            return data
        return set()

    # ── user_preferences ───────────────────────────────────

    def save_user_preferences(self, prefs: Dict):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO user_preferences (id, prefs, updated_at) VALUES (1, ?, datetime('now'))",
            (json.dumps(prefs, ensure_ascii=False),)
        )
        conn.commit()
        if self.dual_write and self._file_storage:
            self._file_storage.save_user_preferences(prefs)

    def load_user_preferences(self) -> Dict:
        conn = self._get_conn()
        row = conn.execute("SELECT prefs FROM user_preferences WHERE id = 1").fetchone()
        if row:
            data = json.loads(row["prefs"])
            return data
        if self.fallback_to_file and self._file_storage:
            data = self._file_storage.load_user_preferences()
            if data:
                self.save_user_preferences(data)
            return data
        return {"source_lang": "auto", "target_lang": "zh", "rpm": 60, "skip_listening": False}

    # ── 数据迁移 ───────────────────────────────────────────

    def migrate_from_files(self):
        """将所有文件存储数据迁移到数据库"""
        if not self._file_storage:
            print("[迁移] 文件存储未启用，跳过迁移")
            return

        import shutil
        base_dir = self._file_storage.base_dir
        files_dir = self._file_storage.files_dir
        languages_dir = self._file_storage.languages_dir
        conn = self._get_conn()

        migrated_count = 0

        # 1. 迁移历史记录
        history_path = base_dir / "history.json"
        if history_path.exists():
            try:
                with open(history_path, 'r', encoding='utf-8') as f:
                    records = json.load(f).get("records", [])
                for record in records:
                    conn.execute(
                        "INSERT OR IGNORE INTO history (file_id, title, source_lang, target_lang, text_preview, created_at, updated_at) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (record.get("file_id"), record.get("title", ""),
                         record.get("source_lang", "en"), record.get("target_lang", "zh"),
                         record.get("text_preview", ""), record.get("created_at", ""),
                         record.get("updated_at"))
                    )
                migrated_count += len(records)
                print(f"[迁移] 历史记录: {len(records)} 条")
            except Exception as e:
                print(f"[迁移] 历史记录失败: {e}")

        # 2. 迁移用户偏好
        if USER_PREFS_FILE.exists():
            try:
                with open(USER_PREFS_FILE, 'r', encoding='utf-8') as f:
                    prefs = json.load(f)
                self.save_user_preferences(prefs)
                migrated_count += 1
                print("[迁移] 用户偏好: 完成")
            except Exception as e:
                print(f"[迁移] 用户偏好失败: {e}")

        # 3. 遍历每个文件目录迁移数据
        if files_dir.exists():
            for file_dir in files_dir.iterdir():
                if not file_dir.is_dir():
                    continue
                file_id = file_dir.name
                try:
                    self._migrate_file_dir(conn, file_dir, file_id)
                    migrated_count += 1
                except Exception as e:
                    print(f"[迁移] 文件 {file_id} 失败: {e}")

        # 4. 迁移语言级索引
        if languages_dir.exists():
            for lang_dir in languages_dir.iterdir():
                if not lang_dir.is_dir():
                    continue
                index_path = lang_dir / "word_index.json"
                source_lang = lang_dir.name
                if index_path.exists():
                    try:
                        with open(index_path, 'r', encoding='utf-8') as f:
                            index = json.load(f)
                        self._save_language_word_index_batch(source_lang, index)
                        migrated_count += 1
                        print(f"[迁移] 语言索引 {source_lang}: {len(index)} 条")
                    except Exception as e:
                        print(f"[迁移] 语言索引 {source_lang} 失败: {e}")

        conn.commit()
        print(f"[迁移] 完成，共处理 {migrated_count} 项")

    def _migrate_file_dir(self, conn: sqlite3.Connection, file_dir: Path, file_id: str):
        """迁移单个文件目录的所有数据"""
        # pipeline_data
        path = file_dir / "pipeline_data.json"
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f).get("data", {})
            conn.execute("INSERT OR IGNORE INTO pipeline_data (file_id, data) VALUES (?, ?)",
                         (file_id, json.dumps(data, ensure_ascii=False)))

        # vocab
        path = file_dir / "vocab.json"
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                vocab = json.load(f).get("vocab", [])
            conn.execute("INSERT OR IGNORE INTO vocab (file_id, vocab) VALUES (?, ?)",
                         (file_id, json.dumps(vocab, ensure_ascii=False)))

        # cleaned_text
        path = file_dir / "cleaned_text.txt"
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                text = f.read()
            conn.execute("INSERT OR IGNORE INTO cleaned_text (file_id, text) VALUES (?, ?)",
                         (file_id, text))

        # language_settings
        path = file_dir / "language_settings.json"
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            conn.execute(
                "INSERT OR IGNORE INTO language_settings (file_id, source_lang, target_lang, original_text) VALUES (?, ?, ?, ?)",
                (file_id, data.get("source_lang", "en"), data.get("target_lang", "zh"),
                 data.get("original_text"))
            )

        # learning_progress
        path = file_dir / "learning_progress.json"
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            conn.execute(
                "INSERT OR IGNORE INTO learning_progress (file_id, current_index, max_index) VALUES (?, ?, ?)",
                (file_id, data.get("current_index", 0), data.get("max_index", 0))
            )

        # shuffled_order
        path = file_dir / "shuffled_order.json"
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            conn.execute("INSERT OR IGNORE INTO shuffled_order (file_id, shuffled_indices) VALUES (?, ?)",
                         (file_id, json.dumps(data.get("shuffled_indices", []))))

        # learning_plan
        path = file_dir / "learning_plan.json"
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            conn.execute("INSERT OR IGNORE INTO learning_plan (file_id, plan) VALUES (?, ?)",
                         (file_id, json.dumps(data.get("plan", []), ensure_ascii=False)))

        # phase progress (1-3)
        for phase in range(1, 4):
            path = file_dir / f"phase{phase}_progress.json"
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                conn.execute(
                    "INSERT OR IGNORE INTO phase_progress (file_id, phase, current_unit, current_exercise, current_exercise_type_index) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (file_id, phase, data.get("current_unit", 0), data.get("current_exercise", 0),
                     data.get("current_exercise_type_index", 0))
                )

            # sentence_order
            path = file_dir / f"phase{phase}_sentence_order.json"
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                conn.execute(
                    "INSERT OR IGNORE INTO sentence_order (file_id, phase, shuffled_indices) VALUES (?, ?, ?)",
                    (file_id, phase, json.dumps(data.get("shuffled_indices", [])))
                )

            # exercise_order
            path = file_dir / f"phase{phase}_exercise_order.json"
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                conn.execute(
                    "INSERT OR IGNORE INTO exercise_order (file_id, phase, exercise_order) VALUES (?, ?, ?)",
                    (file_id, phase, json.dumps(data.get("exercise_order", []), ensure_ascii=False))
                )

        # phase2_exercise_cache
        cache_dir = file_dir / "phase2_cache"
        if cache_dir.exists():
            for cache_file in cache_dir.glob("*.json"):
                exercise_id = cache_file.stem
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                conn.execute(
                    "INSERT OR IGNORE INTO phase2_exercise_cache (file_id, exercise_id, cache_data) VALUES (?, ?, ?)",
                    (file_id, exercise_id, json.dumps(cache_data, ensure_ascii=False))
                )

        # phase2_progress
        path = file_dir / "phase2_progress.json"
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            conn.execute(
                "INSERT OR IGNORE INTO phase2_progress (file_id, current_exercise_index, max_exercise_index) VALUES (?, ?, ?)",
                (file_id, data.get("current_exercise_index", 0), data.get("max_exercise_index", 0))
            )

        # used_sentences
        path = file_dir / "used_sentences.json"
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            conn.execute("INSERT OR IGNORE INTO used_sentences (file_id, used_sentences) VALUES (?, ?)",
                         (file_id, json.dumps(data.get("used_sentences", []), ensure_ascii=False)))

        # unit_stars
        path = file_dir / "unit_stars.json"
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            conn.execute("INSERT OR IGNORE INTO unit_stars (file_id, stars_data) VALUES (?, ?)",
                         (file_id, json.dumps(data, ensure_ascii=False)))

        # learned_words
        path = file_dir / "learned_words.json"
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            conn.execute("INSERT OR IGNORE INTO learned_words (file_id, words) VALUES (?, ?)",
                         (file_id, json.dumps(data.get("words", []), ensure_ascii=False)))

        # word_cache
        word_cache_dir = file_dir / "word_cache"
        if word_cache_dir.exists():
            for word_file in word_cache_dir.glob("*.json"):
                word = word_file.stem
                with open(word_file, 'r', encoding='utf-8') as f:
                    word_info = json.load(f)
                conn.execute(
                    "INSERT OR IGNORE INTO word_cache (file_id, word, word_info) VALUES (?, ?, ?)",
                    (file_id, word, json.dumps(word_info, ensure_ascii=False))
                )

        print(f"[迁移] 文件 {file_id}: 完成")
