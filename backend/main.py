from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
import json
import random
import asyncio
import time
import re

from nvidia_api import NvidiaAPI, get_settings, update_settings, detect_language, get_lang_name
from text_processor import TextProcessor, BACKUP_VOCAB, BACKUP_VOCAB_BY_LANG, is_punctuation_only, PUNCTUATION_CHARS, is_source_lang_text, strip_edge_punctuation, NO_SPACE_LANGUAGES
from storage import Storage

app = FastAPI(title="少邻国 - Lesslingo", version="1.0.0")

import re

class RateLimiter:
    def __init__(self, rpm):
        self.rpm = rpm
        self.interval = 60.0 / rpm if rpm > 0 else 0
        self.last_call = 0
        self.lock = asyncio.Lock()
    
    async def acquire(self):
        async with self.lock:
            now = time.time()
            elapsed = now - self.last_call
            if elapsed < self.interval:
                wait_time = self.interval - elapsed
                await asyncio.sleep(wait_time)
            self.last_call = time.time()

ZH_FUNCTION_WORDS = {'的', '了', '地', '得', '着', '过', '吗', '呢', '吧', '啊', '呀', '哦', '嗯', '是', '在', '有', '和', '与', '或', '但', '而', '却', '又', '也', '都', '就', '才', '还', '已', '所', '该', '其', '这', '那', '个', '一', '种', '些', '等', '被', '把', '让', '给', '从', '向', '到', '对', '为', '以', '于', '及', '之', '将', '会', '能', '可', '要', '应', '需', '没', '不', '很', '最', '更', '太', '极', '比'}

def is_speaker_label(text):
    if not text or not isinstance(text, str):
        return False
    stripped = text.strip()
    return bool(re.match(r'^[A-Za-z\u0410-\u042F\u0430-\u044F]\s*[:：]$', stripped))

def vocab_sort_key(entry):
    import unicodedata
    word = entry.get("word", "")
    ipa = entry.get("ipa", "")
    if word and len(word) > 0:
        first_char = word[0]
        if ipa and len(ipa.strip('/')) > 0:
            return ipa.lstrip('/').strip()[0].lower()
        normalized = unicodedata.normalize('NFD', first_char)
        if len(normalized) > 0:
            base = normalized[0]
            if base.isalpha():
                return base.lower()
        return first_char.lower()
    if ipa and len(ipa.strip('/')) > 0:
        return ipa.lstrip('/').strip()[0].lower()
    return ""

MAX_SENTENCE_WORDS_FOR_QUIZ = 8

def get_translation_phrases(translation_result, max_phrases=6):
    if not translation_result or not isinstance(translation_result, dict):
        return []
    
    llm_phrases = translation_result.get("translation_phrases", [])
    if isinstance(llm_phrases, list) and len(llm_phrases) >= 2:
        valid = [p.strip() for p in llm_phrases if isinstance(p, str) and p.strip() and not is_punctuation_only(p)]
        if len(valid) >= 2:
            return valid[:max_phrases]
    
    raw_translation = translation_result.get("tokenized_translation", "")
    if raw_translation and isinstance(raw_translation, str):
        return split_translation_to_phrases(raw_translation, max_phrases)
    
    return []

def split_translation_to_phrases(translation, max_phrases=8):
    if not translation or not isinstance(translation, str):
        return [translation] if translation else []
    
    import re
    parts = re.split(r'[，。、；：！？,;:!?]', translation)
    parts = [p.strip() for p in parts if p.strip() and not is_punctuation_only(p)]
    
    if not parts:
        chars = list(translation)
        chunk_size = max(1, len(chars) // max_phrases)
        parts = [''.join(chars[i:i+chunk_size]) for i in range(0, len(chars), chunk_size)]
    
    if len(parts) <= max_phrases:
        return parts
    
    result = []
    current = ""
    for p in parts:
        if current:
            candidate = current + "，" + p
            if len(result) + 1 + (1 if candidate else 0) <= max_phrases:
                current = candidate
            else:
                result.append(current)
                current = p
        else:
            current = p
    
    if current:
        result.append(current)
    
    while len(result) > max_phrases:
        last = result.pop()
        result[-1] = result[-1] + "，" + last
    
    return result

def select_key_tokens(seg_words, max_tokens=10):
    content_words = []
    function_words = []
    for w in seg_words:
        if len(w) <= 1 or w in ZH_FUNCTION_WORDS:
            function_words.append(w)
        else:
            content_words.append(w)
    
    if len(content_words) <= max_tokens:
        result = content_words + function_words[:max(0, max_tokens - len(content_words))]
    else:
        step = len(content_words) / max_tokens
        result = [content_words[int(i * step)] for i in range(max_tokens)]
    
    return result[:max_tokens]

def fix_llm_options_result(result: dict, source_lang="en", file_id=None) -> dict:
    if not isinstance(result, dict):
        return result
    mc = result.get("multiple_choice")
    if isinstance(mc, dict) and "options" in mc and isinstance(mc["options"], list):
        raw_options = mc["options"]
        correct_text = result.get("enriched_meaning", result.get("meaning", ""))
        
        normalized_options = []
        for opt in raw_options:
            if isinstance(opt, dict) and "text" in opt:
                text = opt["text"]
                is_correct = opt.get("is_correct", None)
                if is_correct is not None:
                    if isinstance(is_correct, str):
                        is_correct = is_correct.lower() in ("true", "yes", "1")
                    elif isinstance(is_correct, (int, float)):
                        is_correct = bool(is_correct)
                    else:
                        is_correct = bool(is_correct)
                    normalized_options.append({"text": text, "is_correct": is_correct})
                else:
                    normalized_options.append({"text": text, "is_correct": False})
            elif isinstance(opt, str):
                normalized_options.append({"text": opt, "is_correct": False})
        
        if not any(o["is_correct"] for o in normalized_options):
            if normalized_options:
                normalized_options[0]["is_correct"] = True
            elif correct_text:
                normalized_options.insert(0, {"text": correct_text, "is_correct": True})
        
        filtered_options = []
        placeholder_pattern = re.compile(r'^(释义|含义|meaning|sense|definition)\s*\d+$', re.IGNORECASE)
        correct_opt = None
        for opt in normalized_options:
            if opt["is_correct"]:
                correct_opt = opt
            elif placeholder_pattern.match(opt["text"].strip()):
                continue
            else:
                filtered_options.append(opt)
        
        if correct_opt:
            filtered_options.insert(0, correct_opt)
        
        if len(filtered_options) < 4:
            existing_texts = {o["text"] for o in filtered_options}
            correct_text_val = correct_opt["text"] if correct_opt else correct_text
            fallback_distractors = get_fallback_options(correct_text_val, file_id, count=4 - len(filtered_options))
            for fd in fallback_distractors:
                if len(filtered_options) >= 4:
                    break
                if fd not in existing_texts:
                    filtered_options.append({"text": fd, "is_correct": False})
                    existing_texts.add(fd)
        
        if len(filtered_options) < 4:
            existing_texts = {o["text"] for o in filtered_options}
            generic_fallbacks = ["other meaning", "different sense", "unrelated", "alternative", "different concept"]
            for fb in generic_fallbacks:
                if len(filtered_options) >= 4:
                    break
                if fb not in existing_texts:
                    filtered_options.append({"text": fb, "is_correct": False})
                    existing_texts.add(fb)
        
        final_options = filtered_options[:4]
        correct_idx = next((i for i, o in enumerate(final_options) if o["is_correct"]), 0)
        correct_text_val = final_options[correct_idx]["text"]
        for o in final_options:
            o["is_correct"] = o["text"] == correct_text_val
        
        import random as _random
        _random.seed(hash(correct_text_val) + hash(file_id or ""))
        _random.shuffle(final_options)
        
        mc["options"] = final_options
        mc.pop("correct_answer", None)
        result["multiple_choice"] = mc
        return result
    if isinstance(mc, str) and not mc.strip():
        result.pop("multiple_choice", None)
    if "options" in result:
        raw_opts = result["options"]
        if isinstance(raw_opts, str):
            try:
                raw_opts = json.loads(raw_opts)
            except (json.JSONDecodeError, TypeError):
                raw_opts = []
        if isinstance(raw_opts, list):
            mc_options = []
            for opt in raw_opts:
                if isinstance(opt, dict) and "text" in opt:
                    mc_options.append(opt)
                elif isinstance(opt, str):
                    mc_options.append({"text": opt, "is_correct": False})
            if mc_options:
                result["multiple_choice"] = {
                    "options": mc_options
                }
    if "multiple_choice" not in result or not isinstance(result.get("multiple_choice"), dict) or "options" not in result.get("multiple_choice", {}):
        correct_meaning = result.get("enriched_meaning", result.get("meaning", ""))
        fallback_distractors = get_fallback_options(correct_meaning, file_id, count=3)
        fb_opts = [{"text": correct_meaning, "is_correct": True}]
        for fd in fallback_distractors:
            fb_opts.append({"text": fd, "is_correct": False})
        result["multiple_choice"] = {
            "options": fb_opts[:4]
        }
    return result

def get_fallback_options(correct_meaning, file_id, count=3):
    import random as rnd
    distractors = []
    try:
        vocab_data = storage.load_vocab(file_id)
        all_vocab = vocab_data.get("vocab", vocab_data) if isinstance(vocab_data, dict) else vocab_data
        candidates = []
        for v in all_vocab:
            meaning = v.get("meaning") or v.get("enriched_meaning") or ""
            if meaning and meaning != correct_meaning:
                candidates.append(meaning)
        rnd.shuffle(candidates)
        distractors = candidates[:count]
    except:
        pass
    while len(distractors) < count:
        distractors.append(f"释义{len(distractors)+1}")
    return distractors

def get_listening_correct_words(sentence, sentence_data):
    import re
    clean_sentence = re.sub(r'^[A-Za-z\u0410-\u042F\u0430-\u044F]\s*[:：]\s*', '', sentence)
    
    def normalize_for_compare(text):
        return re.sub(r'[\s\u3000]+', '', re.sub(r'[^\w\u00C0-\u024F\u0400-\u052F\u0370-\u03FF\u0600-\u06FF\u0900-\u0D7F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF]', '', text)).lower()

    sentence_normalized = normalize_for_compare(clean_sentence)
    
    tr = sentence_data.get("translation_result", {})
    translation_tokens = tr.get("translation", [])
    
    if translation_tokens and isinstance(translation_tokens, list):
        raw_words = []
        for token in translation_tokens:
            if isinstance(token, dict) and "text" in token:
                t = token["text"].strip()
                if t and not is_punctuation_only(t) and not is_speaker_label(t):
                    cleaned = strip_edge_punctuation(t)
                    if cleaned and not is_speaker_label(cleaned):
                        raw_words.append(cleaned)
        
        if raw_words:
            tokens_normalized = normalize_for_compare(''.join(raw_words))
            
            if tokens_normalized == sentence_normalized:
                return raw_words
            
            deduped_words = []
            seen = set()
            for w in raw_words:
                key = w.lower()
                if key not in seen:
                    seen.add(key)
                    deduped_words.append(w)
            deduped_normalized = normalize_for_compare(''.join(deduped_words))
            if deduped_normalized == sentence_normalized:
                return deduped_words
            
            words_from_sentence = [w for w in clean_sentence.split() if w.strip()]
            words_cleaned = []
            for w in words_from_sentence:
                w_clean = strip_edge_punctuation(w)
                if w_clean and not is_punctuation_only(w_clean):
                    words_cleaned.append(w_clean)
            if words_cleaned and normalize_for_compare(''.join(words_cleaned)) == sentence_normalized:
                return words_cleaned
            
            return raw_words if tokens_normalized else deduped_words

    source_lang = sentence_data.get("source_lang", "en")
    if source_lang in NO_SPACE_LANGUAGES:
        return [c for c in clean_sentence if c.strip() and not is_punctuation_only(c)]
    
    words = [w for w in clean_sentence.split() if w.strip()]
    filtered = []
    for w in words:
        w_clean = strip_edge_punctuation(w)
        if w_clean and not is_punctuation_only(w_clean):
            filtered.append(w_clean)
    return filtered


def get_listening_distractors_from_sentences(sentence, all_sentences, correct_lower_set):
    import re
    distractor_words = []
    distractor_set = set()
    for sd in all_sentences:
        other_s = sd.get("sentence", "")
        if not other_s or other_s == sentence:
            continue
        other_tr = sd.get("translation_result", {})
        other_translation = other_tr.get("translation", [])
        if other_translation and isinstance(other_translation, list):
            for token in other_translation:
                if isinstance(token, dict) and "text" in token:
                    vt = token["text"].strip()
                    if vt and not is_punctuation_only(vt) and vt.lower() not in correct_lower_set and vt.lower() not in distractor_set:
                        distractor_words.append(vt)
                        distractor_set.add(vt.lower())
        if not (other_translation and isinstance(other_translation, list)):
            clean_other = re.sub(r'^[A-Za-z]\s*[:：]\s*', '', other_s)
            for w in clean_other.split():
                w_clean = strip_edge_punctuation(w)
                if w_clean and not is_punctuation_only(w_clean) and w_clean.lower() not in correct_lower_set and w_clean.lower() not in distractor_set:
                    distractor_words.append(w_clean)
                    distractor_set.add(w_clean.lower())
    return distractor_words, distractor_set


def filter_eligible_sentences(sentences):
    eligible = []
    for s in sentences:
        if "sentence" not in s:
            continue
        word_count = s.get("word_count", 0)
        if word_count < 2:
            if "translation_result" in s and "translation" in s["translation_result"]:
                word_count = len(s["translation_result"]["translation"])
            if word_count < 2:
                continue
        eligible.append(s)
    return eligible

def find_item_in_plan(plan, flat_index):
    accumulated = 0
    for unit_id, unit_plan in enumerate(plan):
        items = unit_plan.get("items", [])
        if flat_index < accumulated + len(items):
            return unit_id, flat_index - accumulated
        accumulated += len(items)
    return None, None

def get_unit_flat_range(plan, target_unit_id):
    accumulated = 0
    for i, unit_plan in enumerate(plan):
        items = unit_plan.get("items", [])
        if i == target_unit_id:
            return accumulated, accumulated + len(items)
        accumulated += len(items)
    return None, None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

nvidia_api = NvidiaAPI()
text_processor = TextProcessor()
storage = Storage()

# 存储处理状态
processing_status = {}
word_gen_state = {}
word_gen_rate_limiter = None


@app.get("/")
async def root():
    return {"message": "少邻国 - Lesslingo API"}


async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str, rpm: int = 20):
    try:
        t_total_start = time.time()
        print(f"[DEBUG] 开始处理文件 {file_id}, RPM={rpm}")
        processing_status[file_id] = {"status": "processing", "progress": 0, "current_sentence": 0, "total_sentences": 0}
        
        storage.save_language_settings(file_id, source_lang, target_lang, rpm)
        
        t_split_start = time.time()
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        t_split_end = time.time()
        print(f"[TIMING] 句子分割: {t_split_end - t_split_start:.3f}s, 共 {total_sentences} 个句子")
        
        processing_status[file_id] = {"status": "processing", "progress": 0, "current_sentence": 0, "total_sentences": total_sentences}
        
        rate_limiter = RateLimiter(rpm)
        results_dict = {}
        completed_indices = set()
        
        async def process_single_sentence(idx, sentence):
            if not sentence.strip():
                return idx, None
            
            before_indices = [i for i in range(max(0, idx - 2), idx)]
            after_indices = [i for i in range(idx + 1, min(len(sentences), idx + 3))]
            before_sentences = [sentences[i] for i in before_indices if sentences[i].strip()]
            after_sentences = [sentences[i] for i in after_indices if sentences[i].strip()]
            context_sentences = {"before": before_sentences, "after": after_sentences} if (before_sentences or after_sentences) else None
            
            t_sentence_start = time.time()
            
            t_rate_start = time.time()
            await rate_limiter.acquire()
            t_rate_end = time.time()
            print(f"[TIMING] 句子 {idx+1} 等待限速: {t_rate_end - t_rate_start:.3f}s")
            
            t_llm_start = time.time()
            print(f"[DEBUG] 正在翻译句子 {idx+1}/{total_sentences}: {repr(sentence)}")
            sentence_translation_result = await text_processor.process_translation(
                sentence,
                source_lang,
                target_lang,
                nvidia_api,
                context_sentences
            )
            t_llm_end = time.time()
            print(f"[TIMING] 句子 {idx+1} LLM翻译调用: {t_llm_end - t_llm_start:.3f}s")
            
            t_validate_start = time.time()
            sentence_translation_result = text_processor.validate_and_complete_translation(
                sentence, sentence_translation_result, source_lang
            )
            t_validate_end = time.time()
            print(f"[TIMING] 句子 {idx+1} 验证补全: {t_validate_end - t_validate_start:.3f}s")
            
            t_extract_start = time.time()
            sentence_words = text_processor.extract_words(sentence, source_lang)
            t_extract_end = time.time()
            print(f"[TIMING] 句子 {idx+1} 单词提取: {t_extract_end - t_extract_start:.3f}s")
            
            translation_words = set()
            if isinstance(sentence_translation_result, dict) and "translation" in sentence_translation_result:
                for token in sentence_translation_result["translation"]:
                    if isinstance(token, dict) and "text" in token:
                        translation_words.add(token["text"].lower())
            
            if source_lang in NO_SPACE_LANGUAGES:
                import re as _re
                def _norm(text):
                    return _re.sub(r'[\s\u3000]+', '', _re.sub(r'[^\w\u00C0-\u024F\u0400-\u052F\u0370-\u03FF\u0600-\u06FF\u0900-\u0D7F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF]', '', text)).lower()
                sentence_norm = _norm(sentence)
                tokens_norm = _norm(''.join(translation_words))
                missing_words = [] if tokens_norm == sentence_norm else []
            else:
                missing_words = []
                for w in sentence_words:
                    w_clean = strip_edge_punctuation(w).lower()
                    if w_clean and w_clean not in translation_words and not is_punctuation_only(w):
                        missing_words.append(strip_edge_punctuation(w))
            
            if missing_words:
                print(f"[DEBUG] 发现遗漏单词: {missing_words}, 正在补充处理...")
                t_missing_start = time.time()
                await rate_limiter.acquire()
                remaining_entries = await nvidia_api.process_remaining_words(
                    missing_words, source_lang, target_lang, sentence
                )
                t_missing_end = time.time()
                print(f"[TIMING] 句子 {idx+1} 遗漏单词补充LLM调用: {t_missing_end - t_missing_start:.3f}s")
                if remaining_entries:
                    if isinstance(sentence_translation_result, dict) and "translation" in sentence_translation_result:
                        translation_text_lower = []
                        for token in sentence_translation_result["translation"]:
                            if isinstance(token, dict) and "text" in token:
                                translation_text_lower.append(token["text"].lower())
                        
                        for entry in remaining_entries:
                            if isinstance(entry, dict) and "text" in entry:
                                word = entry["text"]
                                if word.lower() not in translation_text_lower:
                                    sentence_translation_result["translation"].append(entry)
                                    translation_text_lower.append(word.lower())
                    
                    print(f"[DEBUG] 补充了 {len(remaining_entries)} 个遗漏单词")
            
            sentence_data = {
                "sentence": sentence,
                "source_lang": source_lang,
                "translation_result": sentence_translation_result
            }
            t_sentence_end = time.time()
            print(f"[TIMING] 句子 {idx+1} 总耗时: {t_sentence_end - t_sentence_start:.3f}s")
            return idx, sentence_data
        
        tasks = [asyncio.create_task(process_single_sentence(i, s)) for i, s in enumerate(sentences)]
        
        for coro in asyncio.as_completed(tasks):
            idx, sentence_data = await coro
            if sentence_data is not None:
                results_dict[idx] = sentence_data
            completed_indices.add(idx)
            
            max_sequential = -1
            for ci in sorted(completed_indices):
                if ci == max_sequential + 1:
                    max_sequential = ci
                else:
                    break
            
            all_completed_translations = []
            for si in sorted(results_dict.keys()):
                all_completed_translations.append(results_dict[si])
            
            partial_vocab = []
            for si, sd in enumerate(all_completed_translations):
                tr = sd.get("translation_result", {})
                if isinstance(tr, dict) and "translation" in tr:
                    for token in tr["translation"]:
                        if isinstance(token, dict) and "text" in token:
                            entry = {
                                "word": token["text"],
                                "ipa": token.get("phonetic", ""),
                                "meaning": token.get("meaning", "") or token.get("context_meaning", ""),
                                "tokens": [token["text"]],
                                "morphology": token.get("morphology", ""),
                                "sentence_index": si
                            }
                            partial_vocab.append(entry)
            
            seen = set()
            unique_partial = []
            for entry in partial_vocab:
                word = entry.get("word", "").lower()
                if word not in seen and word:
                    seen.add(word)
                    unique_partial.append(entry)
            unique_partial.sort(key=vocab_sort_key)
            
            progress = int(len(completed_indices) / total_sentences * 100)
            processing_status[file_id] = {
                "status": "processing",
                "progress": progress,
                "current_sentence": len(completed_indices),
                "total_sentences": total_sentences,
                "vocab": unique_partial,
                "sentence_translations": all_completed_translations
            }
            print(f"[DEBUG] 更新状态: 进度 {progress}%, 已处理 {len(completed_indices)} 个句子, 词汇 {len(unique_partial)} 个")
        
        sentence_translations = [results_dict.get(i, {"sentence": sentences[i], "translation_result": {}}) for i in range(total_sentences)]
        
        all_vocab = []
        for i, sentence_data in enumerate(sentence_translations):
            translation_result = sentence_data.get("translation_result", {})
            if isinstance(translation_result, dict) and "translation" in translation_result:
                for token in translation_result["translation"]:
                    if isinstance(token, dict) and "text" in token:
                        word = token["text"]
                        if not word or is_punctuation_only(word):
                            continue
                        entry = {
                            "word": word,
                            "ipa": token.get("phonetic", ""),
                            "meaning": token.get("meaning", "") or token.get("context_meaning", ""),
                            "tokens": [word],
                            "morphology": token.get("morphology", ""),
                            "sentence_index": i
                        }
                        all_vocab.append(entry)
        
        seen = set()
        unique_vocab = []
        for entry in all_vocab:
            word = entry.get("word", "")
            cleaned = strip_edge_punctuation(word)
            if cleaned != word:
                entry["word"] = cleaned
                tokens = entry.get("tokens", [])
                if tokens:
                    entry["tokens"] = [cleaned if t == word else t for t in tokens]
            word = cleaned.lower()
            if word not in seen and word:
                seen.add(word)
                unique_vocab.append(entry)
        all_vocab = unique_vocab
        
        all_words_lower = set(entry.get("word", "").lower() for entry in all_vocab)
        deduplicated = []
        for entry in all_vocab:
            tokens = entry.get("tokens", [])
            if tokens and len(tokens) >= 2:
                all_tokens_covered = all(
                    any(t.lower() == w.lower() for w in all_words_lower if w != entry.get("word", "").lower())
                    for t in tokens
                )
                if all_tokens_covered:
                    continue
            deduplicated.append(entry)
        all_vocab = deduplicated
        
        all_vocab.sort(key=vocab_sort_key)
        print(f"[DEBUG] 从所有句子中提取词典条目，共 {len(all_vocab)} 个单词: {[word['word'] for word in all_vocab]}")
        
        storage.save_pipeline_data(file_id, sentence_translations)
        storage.save_vocab(file_id, all_vocab)
        
        if all_vocab:
            generate_and_save_learning_plan(file_id, all_vocab, sentence_translations)
        
        processing_status[file_id] = {
            "status": "completed",
            "progress": 100,
            "vocab": all_vocab,
            "sentence_translations": sentence_translations
        }
        t_total_end = time.time()
        print(f"[TIMING] ========== 全部处理完成 ==========")
        print(f"[TIMING] 总耗时: {t_total_end - t_total_start:.3f}s")
        print(f"[TIMING] 句子数: {total_sentences}, 单词数: {len(all_vocab)}")

        if file_id not in word_gen_state:
            word_gen_state[file_id] = {
                "running": False,
                "vocab": all_vocab,
                "priority_queue": [],
                "task": None,
                "processing_words": set()
            }
        state = word_gen_state[file_id]
        state["vocab"] = all_vocab
        if "processing_words" not in state:
            state["processing_words"] = set()
        if "plan_position" not in state:
            state["plan_position"] = 0
        if not state["running"]:
            state["running"] = True
            state["task"] = asyncio.create_task(background_word_gen(file_id))
            print(f"[DEBUG] 自动启动单词详情生成")
    except Exception as e:
        print(f"[ERROR] 处理出错: {str(e)}")
        import traceback
        traceback.print_exc()
        processing_status[file_id] = {
            "status": "error",
            "error": str(e)
        }


async def process_single_word_gen(file_id, word_to_gen, vocab, source_lang, target_lang):
    state = word_gen_state.get(file_id)
    if not state:
        return
    processing = state.get("processing_words", set())
    if word_to_gen.lower() in {w.lower() for w in processing}:
        return
    processing.add(word_to_gen)
    try:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                if storage.load_word_cache(file_id, word_to_gen):
                    return
                word_entry = None
                for v in vocab:
                    if v.get("word", "").lower() == word_to_gen.lower():
                        word_entry = v
                        break
                if not word_entry:
                    return
                sentences = storage.load_pipeline_data(file_id)
                context = ""
                context_sentences = []
                if sentences:
                    has_cjk = any('\u4e00' <= c <= '\u9fff' or '\u3040' <= c <= '\u309f' or '\u30a0' <= c <= '\u30ff' or '\uac00' <= c <= '\ud7af' for c in word_to_gen[:10])
                    if has_cjk:
                        word_pattern = re.compile(re.escape(word_to_gen), re.IGNORECASE)
                    else:
                        word_pattern = re.compile(r'\b' + re.escape(word_to_gen) + r'\b', re.IGNORECASE)
                    for sent_idx, sentence_data in enumerate(sentences):
                        if "sentence" in sentence_data:
                            if word_pattern.search(sentence_data["sentence"]):
                                context = sentence_data["sentence"]
                                translation = ""
                                if "translation_result" in sentence_data:
                                    translation = sentence_data["translation_result"].get("tokenized_translation", "")
                                context_sentences.append({
                                    "sentence": sentence_data["sentence"],
                                    "translation": translation,
                                    "sentence_index": sent_idx
                                })
                    if not context and sentences:
                        context = sentences[0].get("sentence", "")
                correct_meaning = word_entry.get("meaning", "")
                if not correct_meaning:
                    if "translation" in word_entry:
                        correct_meaning = word_entry["translation"]
                    elif "context_meaning" in word_entry:
                        correct_meaning = word_entry["context_meaning"]
                
                global word_gen_rate_limiter
                if word_gen_rate_limiter:
                    await word_gen_rate_limiter.acquire()
                
                print(f"[DEBUG] Background word gen: {word_to_gen} (attempt {attempt + 1})")
                options_result = await nvidia_api.generate_multiple_choice(
                    word_to_gen,
                    correct_meaning,
                    context,
                    target_lang
                )
                
                placeholder_pattern = re.compile(r'(释义|含义|意思|meaning|definition)\s*\d', re.IGNORECASE)
                enriched = options_result.get("enriched_meaning", "")
                if placeholder_pattern.search(enriched):
                    print(f"[WARN] Detected placeholder text in word gen for '{word_to_gen}', retrying...")
                    if word_gen_rate_limiter:
                        await word_gen_rate_limiter.acquire()
                    options_result = await nvidia_api.generate_multiple_choice(
                        word_to_gen,
                        correct_meaning,
                        context,
                        target_lang
                    )
                    enriched = options_result.get("enriched_meaning", "")
                    if placeholder_pattern.search(enriched):
                        print(f"[WARN] Still placeholder text after retry for '{word_to_gen}', using fallback")
                        if placeholder_pattern.search(enriched):
                            options_result["enriched_meaning"] = correct_meaning
                
                options_result = fix_llm_options_result(options_result, source_lang, file_id)
                cache_data = dict(options_result)
                cache_data["word"] = options_result.get("word", word_to_gen)
                cache_data["ipa"] = word_entry.get("ipa", "")
                cache_data["meaning"] = correct_meaning
                cache_data["examples"] = options_result.get("examples", [])
                cache_data["context"] = context
                cache_data["context_sentences"] = context_sentences
                cache_data["morphology"] = word_entry.get("morphology", "")
                cache_data["variants_detail"] = options_result.get("variants_detail", [])
                cache_data["memory_hint"] = options_result.get("memory_hint", "")
                cache_data["enriched_meaning"] = options_result.get("enriched_meaning", correct_meaning)
                cache_data["multiple_choice"] = options_result.get("multiple_choice", {})
                if "context_translations" in cache_data:
                    del cache_data["context_translations"]
                storage.save_word_cache(file_id, word_to_gen, cache_data)
                print(f"[DEBUG] Cached word gen: {word_to_gen}")
                return
            except Exception as e:
                print(f"[ERROR] Word gen failed for {word_to_gen} (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    app_prefs = storage.load_user_preferences()
                    retry_delay = app_prefs.get("retry_interval", 1.0)
                    print(f"[DEBUG] Retrying {word_to_gen} in {retry_delay}s...")
                    await asyncio.sleep(retry_delay)
                else:
                    print(f"[ERROR] Word gen permanently failed for {word_to_gen} after {max_retries} attempts")
    finally:
        processing.discard(word_to_gen)


async def background_word_gen(file_id: str):
    state = word_gen_state.get(file_id)
    if not state:
        return
    language_settings = storage.load_language_settings(file_id)
    target_lang = language_settings["target_lang"]
    source_lang = language_settings.get("source_lang", "en")
    vocab = state["vocab"]

    plan = storage.load_learning_plan(file_id)
    plan_word_order = []
    if plan:
        seen_vocab_indices = set()
        for unit in plan:
            items = unit.get("items", [])
            for item in items:
                vi = item.get("vocab_index")
                if vi is not None and vi not in seen_vocab_indices:
                    seen_vocab_indices.add(vi)
                    plan_word_order.append(vi)
        for i in range(len(vocab)):
            if i not in seen_vocab_indices:
                plan_word_order.append(i)

    if not plan_word_order:
        plan_word_order = list(range(len(vocab)))

    if "plan_position" not in state:
        state["plan_position"] = 0
        for pi, vi in enumerate(plan_word_order):
            if vi < len(vocab):
                w = vocab[vi].get("word", "")
                if w and not storage.load_word_cache(file_id, w):
                    state["plan_position"] = pi
                    break
        else:
            state["plan_position"] = len(plan_word_order)

    global word_gen_rate_limiter
    if not word_gen_rate_limiter:
        app_settings = storage.load_user_preferences()
        rpm = app_settings.get("rpm", 60)
        word_gen_rate_limiter = RateLimiter(rpm)

    while state["running"]:
        word_to_gen = None
        if state["priority_queue"]:
            word_to_gen = state["priority_queue"].pop(0)
        elif state["plan_position"] < len(plan_word_order):
            vocab_idx = plan_word_order[state["plan_position"]]
            state["plan_position"] += 1
            if vocab_idx < len(vocab):
                word_to_gen = vocab[vocab_idx].get("word", "")

        if not word_to_gen:
            await asyncio.sleep(1)
            continue

        if storage.load_word_cache(file_id, word_to_gen):
            continue

        existing_cache = storage.find_global_word_cache(word_to_gen, source_lang)
        if existing_cache:
            import copy
            cached = copy.deepcopy(existing_cache)
            context_sents = []
            all_sentences = storage.load_pipeline_data(file_id)
            if all_sentences:
                import re as re_mod
                word_pattern = re_mod.compile(r'\b' + re_mod.escape(word_to_gen) + r'\b', re_mod.IGNORECASE)
                for sent_idx, sentence_data in enumerate(all_sentences):
                    if "sentence" in sentence_data:
                        if word_pattern.search(sentence_data["sentence"]):
                            translation = ""
                            if "translation_result" in sentence_data:
                                translation = sentence_data["translation_result"].get("tokenized_translation", "")
                            context_sents.append({
                                "sentence": sentence_data["sentence"],
                                "translation": translation,
                                "sentence_index": sent_idx
                            })
            if context_sents:
                cached["context_sentences"] = context_sents
                cached["context"] = context_sents[0]["sentence"]
            storage.save_word_cache(file_id, word_to_gen, cached)
            continue

        processing = state.get("processing_words", set())
        if word_to_gen.lower() in {w.lower() for w in processing}:
            continue

        asyncio.create_task(process_single_word_gen(file_id, word_to_gen, vocab, source_lang, target_lang))
        await asyncio.sleep(0.1)

    state["task"] = None


def generate_and_save_learning_plan(file_id: str, vocab: List[Dict], sentences: List[Dict]):
    import random
    import re
    
    language_settings = storage.load_language_settings(file_id)
    source_lang = language_settings.get("source_lang", "en")
    
    random.seed(42)
    shuffled_indices = list(range(len(vocab)))
    random.shuffle(shuffled_indices)
    storage.save_shuffled_order(file_id, shuffled_indices)
    
    max_items_per_unit = 10
    
    word_to_shuffled_pos = {}
    for pos, idx in enumerate(shuffled_indices):
        word_to_shuffled_pos[idx] = pos
    
    sentence_quiz_info = []
    for sent_idx, sentence_data in enumerate(sentences):
        if "sentence" not in sentence_data:
            continue
        
        sentence = sentence_data["sentence"]
        if source_lang in NO_SPACE_LANGUAGES:
            word_count = len(sentence.replace(' ', ''))
        else:
            word_count = len(sentence.split())
        if word_count > MAX_SENTENCE_WORDS_FOR_QUIZ:
            continue
        
        tr = sentence_data.get("translation_result", {})
        if "translation" not in tr:
            continue
        
        translation_tokens = tr.get("translation", [])
        if not translation_tokens:
            continue
        
        covering_vocab_indices = []
        for vi, v in enumerate(vocab):
            v_tokens = v.get("tokens", [v["word"]])
            word_covers = False
            for wt in v_tokens:
                for token in translation_tokens:
                    if isinstance(token, dict) and "text" in token:
                        if wt.lower() == token["text"].lower() or wt.lower() in token["text"].lower() or token["text"].lower() in wt.lower():
                            word_covers = True
                            break
                if word_covers:
                    break
            if word_covers:
                covering_vocab_indices.append(vi)
        
        if not covering_vocab_indices:
            continue
        
        all_covered = True
        for token in translation_tokens:
            if isinstance(token, dict) and "text" in token:
                token_text = token["text"]
                token_translation = token.get("meaning", "")
                token_morphology = token.get("morphology", "")
                if len(token_text) <= 2 and not token_translation and not token_morphology:
                    continue
                token_text_lower = token_text.lower()
                token_covered = False
                for vi in covering_vocab_indices:
                    w = vocab[vi]
                    w_tokens = w.get("tokens", [w["word"]])
                    for wt in w_tokens:
                        if wt.lower() == token_text_lower or wt.lower() in token_text_lower or token_text_lower in wt.lower():
                            token_covered = True
                            break
                    if token_covered:
                        break
                if not token_covered:
                    all_covered = False
                    break
        
        if not all_covered:
            continue
        
        last_covering_shuffled_pos = max(word_to_shuffled_pos.get(vi, len(shuffled_indices)) for vi in covering_vocab_indices)
        
        sentence_quiz_info.append({
            "sentence": sentence,
            "sentence_data": sentence_data,
            "covering_vocab_indices": covering_vocab_indices,
            "last_covering_shuffled_pos": last_covering_shuffled_pos
        })
    
    sentence_quiz_info.sort(key=lambda x: x["last_covering_shuffled_pos"])
    
    plan = []
    unit_start_shuffled_pos = 0
    quiz_insertion_pointer = 0
    
    while unit_start_shuffled_pos < len(shuffled_indices):
        unit_end_shuffled_pos = min(unit_start_shuffled_pos + max_items_per_unit, len(shuffled_indices))
        
        unit_word_items = []
        for sp in range(unit_start_shuffled_pos, unit_end_shuffled_pos):
            vocab_idx = shuffled_indices[sp]
            unit_word_items.append({
                "type": "word",
                "vocab_index": vocab_idx,
                "_shuffled_pos": sp
            })
        
        unit_quiz_items = []
        while quiz_insertion_pointer < len(sentence_quiz_info):
            sqi = sentence_quiz_info[quiz_insertion_pointer]
            last_pos = sqi["last_covering_shuffled_pos"]
            
            if last_pos < unit_end_shuffled_pos:
                quiz_insertion_pointer += 1
                
                sentence = sqi["sentence"]
                sentence_data = sqi["sentence_data"]
                covering_vocab_indices = sqi["covering_vocab_indices"]
                tr = sentence_data.get("translation_result", {})
                translation_tokens = tr.get("translation", [])
                
                raw_translation = tr.get("tokenized_translation", "")
                correct_translation = raw_translation.strip() if raw_translation else ""
                
                correct_tokens = get_translation_phrases(tr, max_phrases=6)
                correct_tokens = [ct for ct in correct_tokens if not is_punctuation_only(ct)]
                
                if len(correct_tokens) >= 2 and len(correct_tokens) <= 8:
                    redundant_tokens = tr.get("redundant_tokens", [])
                    cleaned_redundant = []
                    correct_has_source_lang = any(is_source_lang_text(ct, source_lang) for ct in correct_tokens)
                    for rt in redundant_tokens:
                        rt_stripped = rt.strip()
                        if rt_stripped and rt_stripped not in correct_tokens and not is_punctuation_only(rt_stripped):
                            if correct_has_source_lang or not is_source_lang_text(rt_stripped, source_lang):
                                cleaned_redundant.append(rt_stripped)
                    
                    selected_distractors = list(dict.fromkeys(cleaned_redundant))[:4]
                    
                    if len(selected_distractors) < 4:
                        existing_set = set(correct_tokens) | set(selected_distractors)
                        for other_sent in sentences:
                            if other_sent.get("sentence") == sentence:
                                continue
                            other_tr = other_sent.get("translation_result", {})
                            other_phrases = get_translation_phrases(other_tr, max_phrases=10)
                            for op in other_phrases:
                                if op not in existing_set:
                                    if correct_has_source_lang or not is_source_lang_text(op, source_lang):
                                        selected_distractors.append(op)
                                        existing_set.add(op)
                                        if len(selected_distractors) >= 4:
                                            break
                            if len(selected_distractors) >= 4:
                                break
                    
                    all_tokens = correct_tokens + selected_distractors
                    
                    if not correct_translation.strip():
                        correct_translation = "".join(correct_tokens)
                    
                    unit_quiz_items.append({
                        "type": "sentence_quiz",
                        "sentence": sentence,
                        "correct_translation": correct_translation,
                        "correct_tokens": correct_tokens,
                        "tokens": all_tokens,
                        "_last_covering_shuffled_pos": last_pos
                    })
                
                sentence_words_display = get_listening_correct_words(sentence, sentence_data)
                
                correct_lower_set = set(w.lower() for w in sentence_words_display)
                distractor_words, distractor_set = get_listening_distractors_from_sentences(sentence, sentences, correct_lower_set)
                
                for v in vocab:
                    v_tokens = v.get("tokens", [v["word"]])
                    for vt in v_tokens:
                        if vt.lower() not in correct_lower_set and vt.lower() not in distractor_set:
                            distractor_words.append(vt)
                            distractor_set.add(vt.lower())
                    if len(v_tokens) == 1 and v["word"].lower() not in correct_lower_set and v["word"].lower() not in distractor_set:
                        distractor_words.append(v["word"])
                        distractor_set.add(v["word"].lower())
                
                random.shuffle(distractor_words)
                num_distractors = max(2, len(sentence_words_display) // 2)
                distractor_words = distractor_words[:num_distractors]
                
                if len(distractor_words) < 2:
                    backup_vocab_list = BACKUP_VOCAB_BY_LANG.get(source_lang, BACKUP_VOCAB_BY_LANG["en"])
                    backup_distractors = list(backup_vocab_list)
                    random.shuffle(backup_distractors)
                    idx = 0
                    while len(distractor_words) < 2:
                        bd = backup_distractors[idx % len(backup_distractors)]
                        if bd.lower() not in correct_lower_set and bd.lower() not in distractor_set:
                            distractor_words.append(bd)
                            distractor_set.add(bd.lower())
                        idx += 1
                
                if sentence_words_display and len(sentence_words_display) >= 2:
                    unit_quiz_items.append({
                        "type": "listening_quiz",
                        "sentence": sentence,
                        "clean_sentence": re.sub(r'^[A-Za-z\u0410-\u042F\u0430-\u044F]\s*[:：]\s*', '', sentence),
                        "correct_words": sentence_words_display,
                        "distractor_words": distractor_words,
                        "_last_covering_shuffled_pos": last_pos
                    })
            else:
                break
        
        final_items = list(unit_word_items)
        
        quizzes_with_anchor = []
        for quiz in unit_quiz_items:
            last_pos = quiz.pop("_last_covering_shuffled_pos", 0)
            anchor_pos = 0
            for i, item in enumerate(final_items):
                if item.get("type") == "word" and item.get("_shuffled_pos", -1) >= last_pos:
                    anchor_pos = i + 1
                    break
            else:
                anchor_pos = len(final_items)
            quizzes_with_anchor.append((quiz, anchor_pos))
        
        random.shuffle(quizzes_with_anchor)
        
        for _ in range(len(quizzes_with_anchor)):
            min_anchor = min(a for _, a in quizzes_with_anchor)
            candidates = [(q, a) for q, a in quizzes_with_anchor if a == min_anchor]
            chosen = random.choice(candidates)
            quizzes_with_anchor.remove(chosen)
            quiz, anchor_pos = chosen
            insert_pos = random.randint(anchor_pos, max(anchor_pos, len(final_items)))
            final_items.insert(insert_pos, quiz)
            for i in range(len(quizzes_with_anchor)):
                q, a = quizzes_with_anchor[i]
                if a >= insert_pos:
                    quizzes_with_anchor[i] = (q, a + 1)
        
        for item in final_items:
            item.pop("_shuffled_pos", None)
        
        if final_items:
            plan.append({
                "unit_id": len(plan),
                "items": final_items
            })
        
        unit_start_shuffled_pos = unit_end_shuffled_pos
    
    final_plan = []
    flat_items = []
    for unit in plan:
        flat_items.extend(unit["items"])
    
    for i in range(0, len(flat_items), max_items_per_unit):
        chunk = flat_items[i:i + max_items_per_unit]
        final_plan.append({
            "unit_id": len(final_plan),
            "items": chunk
        })
    
    storage.save_learning_plan(file_id, final_plan)



async def generate_title(text: str, source_lang: str) -> str:
    first_line = text.strip().split('\n')[0].strip()
    if len(first_line) <= 30 and not first_line.endswith(('。', '，', '！', '？', '.', ',', '!', '?', ';', '；')):
        return first_line
    try:
        messages = [
            {"role": "system", "content": "You are a title generator. Generate a very short title (max 20 characters) that summarizes the given text. If the text already has a clear title in the first line, use that as the title. Output ONLY the title, nothing else."},
            {"role": "user", "content": f"Generate a short title for this text (language: {get_lang_name(source_lang)}):\n\n{text[:500]}"}
        ]
        result = await nvidia_api.call_minimax(messages, temperature=0.3)
        title = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        if title and len(title) <= 50:
            return title
    except Exception as e:
        print(f"[WARN] Title generation failed: {e}")
    return first_line[:20] + "..." if len(first_line) > 20 else first_line


@app.post("/api/process-text")
async def process_text(request: dict, background_tasks: BackgroundTasks):
    try:
        t_api_start = time.time()
        text = request.get("text", "")
        source_lang = request.get("source_language", "en")
        target_lang = request.get("target_language", "zh")
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        if source_lang == "auto":
            source_lang = await detect_language(text)
        
        import datetime
        now = datetime.datetime.now()
        file_id = f"text_{now.strftime('%Y%m%d_%H%M%S_%f')[:-3]}"
        
        app_settings = storage.load_user_preferences()
        rpm = app_settings.get("rpm", 60)
        
        recent_langs = app_settings.get("recent_languages", [])
        if source_lang in recent_langs:
            recent_langs.remove(source_lang)
        recent_langs.insert(0, source_lang)
        recent_langs = recent_langs[:10]
        app_settings["recent_languages"] = recent_langs
        storage.save_user_preferences(app_settings)
        
        t_title_start = time.time()
        title = await generate_title(text, source_lang)
        t_title_end = time.time()
        print(f"[TIMING] 标题生成: {t_title_end - t_title_start:.3f}s")
        
        text_preview = text.strip()[:100]
        storage.add_history_record(file_id, title, source_lang, target_lang, text_preview)
        
        background_tasks.add_task(process_text_background, file_id, text, source_lang, target_lang, rpm)
        
        t_api_end = time.time()
        print(f"[TIMING] /api/process-text API响应耗时: {t_api_end - t_api_start:.3f}s")
        
        return {
            "file_id": file_id,
            "status": "processing",
            "title": title
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/status/{file_id}")
async def get_status(file_id: str):
    if file_id not in processing_status:
        raise HTTPException(status_code=404, detail="File not found")
    return processing_status[file_id]


@app.post("/api/learn/{file_id}/start-word-gen")
async def start_word_gen(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")

        if file_id not in word_gen_state:
            word_gen_state[file_id] = {
                "running": False,
                "vocab": vocab,
                "priority_queue": [],
                "task": None,
                "processing_words": set()
            }

        state = word_gen_state[file_id]
        state["vocab"] = vocab
        if "processing_words" not in state:
            state["processing_words"] = set()

        if "plan_position" not in state:
            state["plan_position"] = 0

        if state["running"]:
            return {"status": "already_running"}

        state["running"] = True
        state["task"] = asyncio.create_task(background_word_gen(file_id))
        return {"status": "started"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/learn/{file_id}/stop-word-gen")
async def stop_word_gen(file_id: str):
    try:
        state = word_gen_state.get(file_id)
        if not state or not state["running"]:
            return {"status": "stopped"}

        state["running"] = False
        if state["task"]:
            state["task"].cancel()
            state["task"] = None
        return {"status": "stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/learn/{file_id}/priority-word-gen")
async def priority_word_gen(file_id: str, request: dict):
    try:
        word = request.get("word", "")
        force = request.get("force", False)
        if not word:
            raise HTTPException(status_code=400, detail="Word is required")

        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")

        if file_id not in word_gen_state:
            word_gen_state[file_id] = {
                "running": False,
                "vocab": vocab,
                "priority_queue": [],
                "task": None,
                "processing_words": set()
            }

        state = word_gen_state[file_id]
        state["vocab"] = vocab
        if "processing_words" not in state:
            state["processing_words"] = set()
        if "plan_position" not in state:
            state["plan_position"] = 0

        if force:
            storage.delete_word_cache(file_id, word)
            state["processing_words"] = {w for w in state.get("processing_words", set()) if w.lower() != word.lower()}

        if not force and storage.load_word_cache(file_id, word):
            return {"status": "already_cached"}

        processing = state.get("processing_words", set())
        if not force and word.lower() in {w.lower() for w in processing}:
            return {"status": "already_processing"}

        state["priority_queue"] = [w for w in state["priority_queue"] if w.lower() != word.lower()]
        state["priority_queue"].insert(0, word)

        if not state["running"]:
            state["running"] = True
            state["task"] = asyncio.create_task(background_word_gen(file_id))

        return {"status": "queued"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vocab/{file_id}")
async def get_vocab(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        if isinstance(vocab, dict) and "vocab" in vocab:
            vocab_list = vocab["vocab"]
        elif isinstance(vocab, list):
            vocab_list = vocab
        else:
            vocab_list = []
        
        enriched_list = []
        for entry in vocab_list:
            enriched_entry = dict(entry)
            cached = storage.load_word_cache(file_id, entry.get("word", ""))
            if cached:
                if cached.get("enriched_meaning"):
                    enriched_entry["enriched_meaning"] = cached["enriched_meaning"]
                if cached.get("ipa"):
                    enriched_entry["ipa"] = cached["ipa"]
                if cached.get("morphology"):
                    enriched_entry["morphology"] = cached["morphology"]
                if cached.get("variants_detail"):
                    enriched_entry["variants_detail"] = cached["variants_detail"]
                if cached.get("examples"):
                    enriched_entry["examples"] = cached["examples"]
                if cached.get("memory_hint"):
                    enriched_entry["memory_hint"] = cached["memory_hint"]
            enriched_list.append(enriched_entry)
        
        return {"vocab": enriched_list}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Vocab not found: {str(e)}")


@app.get("/api/sentences/{file_id}")
async def get_sentences(file_id: str):
    try:
        sentences = storage.load_pipeline_data(file_id)
        return {"sentences": sentences}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Sentences not found: {str(e)}")


# 存储预生成的单词信息
pre_generated_words = {}

@app.get("/api/learn/{file_id}/random-word")
async def get_random_word(file_id: str):
    try:
        storage.touch_history_record(file_id)
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")
        
        language_settings = storage.load_language_settings(file_id)
        target_lang = language_settings["target_lang"]
        source_lang = language_settings.get("source_lang", "en")
        
        current_index = storage.load_learning_progress(file_id)
        
        plan = storage.load_learning_plan(file_id)
        if not plan:
            generate_and_save_learning_plan(file_id, vocab, storage.load_pipeline_data(file_id) or [])
            plan = storage.load_learning_plan(file_id)
        
        unit_id, step_in_unit = find_item_in_plan(plan, current_index)
        
        if unit_id is not None:
            unit_plan = plan[unit_id]
            items = unit_plan.get("items", [])
            unit_start_index, unit_end_index = get_unit_flat_range(plan, unit_id)
            total_items_in_unit = len(items)
            listening_count_in_unit = sum(1 for it in items if it.get("type") == "listening_quiz")
            
            if step_in_unit < len(items):
                current_item = items[step_in_unit]
                
                if current_item["type"] == "sentence_quiz":
                    import random as rnd
                    tokens = list(current_item.get("tokens", []))
                    rnd.shuffle(tokens)
                    return {
                        "type": "sentence_quiz",
                        "flat_index": current_index,
                        "original_sentence": current_item["sentence"],
                        "correct_translation": current_item.get("correct_translation", ""),
                        "correct_tokens": current_item.get("correct_tokens", []),
                        "tokens": tokens,
                        "unit_end_index": unit_end_index,
                        "current_index": current_index,
                        "unit_start_index": unit_start_index,
                        "total_items_in_unit": total_items_in_unit,
                        "listening_count_in_unit": listening_count_in_unit,
                        "step_in_unit": step_in_unit
                    }
                
                if current_item["type"] == "listening_quiz":
                    import random as rnd
                    correct_sentence = current_item["sentence"]
                    
                    pipeline_data = storage.load_pipeline_data(file_id)
                    all_sentences = pipeline_data if isinstance(pipeline_data, list) else pipeline_data.get("data", [])
                    
                    current_sentence_data = None
                    for sd in all_sentences:
                        if sd.get("sentence") == correct_sentence:
                            current_sentence_data = sd
                            break
                    
                    sentence_words_display = get_listening_correct_words(correct_sentence, current_sentence_data or {})
                    correct_lower_set = set(w.lower() for w in sentence_words_display)
                    distractor_words, distractor_set = get_listening_distractors_from_sentences(correct_sentence, all_sentences, correct_lower_set)
                    
                    vocab_data = storage.load_vocab(file_id)
                    all_vocab = vocab_data.get("vocab", vocab_data) if isinstance(vocab_data, dict) else vocab_data
                    for v in all_vocab:
                        v_tokens = v.get("tokens", [v["word"]])
                        for vt in v_tokens:
                            if vt.lower() not in correct_lower_set and vt.lower() not in distractor_set:
                                distractor_words.append(vt)
                                distractor_set.add(vt.lower())
                        if len(v_tokens) == 1 and v["word"].lower() not in correct_lower_set and v["word"].lower() not in distractor_set:
                            distractor_words.append(v["word"])
                            distractor_set.add(v["word"].lower())
                    
                    rnd.shuffle(distractor_words)
                    num_distractors = max(2, len(sentence_words_display) // 2)
                    distractor_words = distractor_words[:num_distractors]
                    
                    if len(distractor_words) < 2:
                        language_settings = storage.load_language_settings(file_id)
                        source_lang = language_settings.get("source_lang", "en")
                        backup_vocab_list = BACKUP_VOCAB_BY_LANG.get(source_lang, BACKUP_VOCAB_BY_LANG["en"])
                        backup_distractors = list(backup_vocab_list)
                        rnd.shuffle(backup_distractors)
                        idx = 0
                        while len(distractor_words) < 2:
                            bd = backup_distractors[idx % len(backup_distractors)]
                            if bd.lower() not in correct_lower_set and bd.lower() not in distractor_set:
                                distractor_words.append(bd)
                                distractor_set.add(bd.lower())
                            idx += 1
                    
                    options = sentence_words_display + distractor_words
                    rnd.shuffle(options)
                    return {
                        "type": "listening_quiz",
                        "flat_index": current_index,
                        "original_sentence": correct_sentence,
                        "clean_sentence": re.sub(r'^[A-Za-z\u0410-\u042F\u0430-\u044F]\s*[:：]\s*', '', correct_sentence),
                        "correct_words": sentence_words_display,
                        "options": options,
                        "unit_end_index": unit_end_index,
                        "current_index": current_index,
                        "unit_start_index": unit_start_index,
                        "total_items_in_unit": total_items_in_unit,
                        "listening_count_in_unit": listening_count_in_unit,
                        "step_in_unit": step_in_unit
                    }
                
                vocab_idx = current_item["vocab_index"]
                random_word = vocab[vocab_idx]
                word = random_word["word"]
            else:
                return {"type": "unit_complete", "unit_end_index": unit_end_index, "current_index": current_index, "unit_start_index": unit_start_index, "total_items_in_unit": total_items_in_unit,
                        "listening_count_in_unit": listening_count_in_unit, "step_in_unit": step_in_unit}
        else:
            return {"type": "all_complete"}
        
        # 先检查缓存
        cached_word = storage.load_word_cache(file_id, word)
        if cached_word:
            print(f"[DEBUG] 从缓存中获取随机单词信息: {word}")
            mc = cached_word.get("multiple_choice", {})
            mc_options = []
            if isinstance(mc, dict) and "options" in mc and isinstance(mc["options"], list):
                mc_options = [o for o in mc["options"] if isinstance(o, dict) and "text" in o]
            if not mc_options:
                print(f"[DEBUG] 缓存中 MC 选项为空或无效，清除缓存重新生成: {word}")
                storage.delete_word_cache(file_id, word)
            else:
                options = []
                correct_index = 0
                for i, opt in enumerate(mc_options):
                    options.append(opt["text"])
                    if opt.get("is_correct"):
                        correct_index = i
                
                asyncio.create_task(pre_generate_next_word(file_id, vocab, current_index + 1))
                
                context_sents = cached_word.get("context_sentences", [])
                needs_rebuild = False
                for cs in context_sents:
                    if isinstance(cs, dict) and "sentence_index" not in cs:
                        needs_rebuild = True
                        break
                    if isinstance(cs, str):
                        needs_rebuild = True
                        break
                
                if needs_rebuild or not context_sents:
                    all_sentences = storage.load_pipeline_data(file_id)
                    if all_sentences:
                        import re as re_mod
                        word_pattern = re_mod.compile(r'\b' + re_mod.escape(word) + r'\b', re_mod.IGNORECASE)
                        rebuilt = []
                        for sent_idx, sentence_data in enumerate(all_sentences):
                            if "sentence" in sentence_data:
                                if word_pattern.search(sentence_data["sentence"]):
                                    translation = ""
                                    if "translation_result" in sentence_data:
                                        translation = sentence_data["translation_result"].get("tokenized_translation", "")
                                    rebuilt.append({
                                        "sentence": sentence_data["sentence"],
                                        "translation": translation,
                                        "sentence_index": sent_idx
                                    })
                        context_sents = rebuilt
                        cached_word["context_sentences"] = rebuilt
                        storage.save_word_cache(file_id, word, cached_word)
                
                return {
                    "word": cached_word.get("word", word),
                    "ipa": cached_word.get("ipa", ""),
                    "correct_meaning": cached_word.get("meaning", ""),
                    "options": options,
                    "correct_index": correct_index,
                    "context": cached_word.get("context", ""),
                    "context_sentences": context_sents,
                    "variants_detail": cached_word.get("variants_detail", []),
                    "examples": cached_word.get("examples", []),
                    "memory_hint": cached_word.get("memory_hint", ""),
                    "enriched_meaning": cached_word.get("enriched_meaning", cached_word.get("meaning", "")),
                    "context_meaning": cached_word.get("meaning", cached_word.get("context_meaning", "")),
                    "unit_end_index": unit_end_index,
                    "current_index": current_index,
                    "unit_start_index": unit_start_index,
                    "total_items_in_unit": total_items_in_unit,
                        "listening_count_in_unit": listening_count_in_unit,
                    "step_in_unit": step_in_unit
                }
        
        # 无缓存：触发优先生成并等待缓存
        print(f"[DEBUG] 单词无缓存，触发优先生成: {word}")
        state = word_gen_state.get(file_id)
        if state:
            state["priority_queue"] = [w for w in state.get("priority_queue", []) if w.lower() != word.lower()]
            state["priority_queue"].insert(0, word)
            if not state.get("running"):
                state["running"] = True
                state["task"] = asyncio.create_task(background_word_gen(file_id))
        else:
            word_gen_state[file_id] = {
                "running": True,
                "vocab": vocab,
                "priority_queue": [word],
                "task": asyncio.create_task(background_word_gen(file_id)),
                "processing_words": set()
            }
        
        for _ in range(60):
            await asyncio.sleep(1)
            cached_word = storage.load_word_cache(file_id, word)
            if cached_word:
                mc = cached_word.get("multiple_choice", {})
                mc_options = []
                if isinstance(mc, dict) and "options" in mc and isinstance(mc["options"], list):
                    mc_options = [o for o in mc["options"] if isinstance(o, dict) and "text" in o]
                if mc_options:
                    break
        
        if cached_word and isinstance(cached_word.get("multiple_choice"), dict):
            mc = cached_word["multiple_choice"]
            mc_options = [o for o in mc.get("options", []) if isinstance(o, dict) and "text" in o]
            options = []
            correct_index = 0
            for i, opt in enumerate(mc_options):
                options.append(opt["text"])
                if opt.get("is_correct"):
                    correct_index = i
            
            context_sents = cached_word.get("context_sentences", [])
            
            asyncio.create_task(pre_generate_next_word(file_id, vocab, current_index + 1))
            
            return {
                "word": cached_word.get("word", word),
                "ipa": cached_word.get("ipa", ""),
                "correct_meaning": cached_word.get("meaning", ""),
                "options": options,
                "correct_index": correct_index,
                "context": cached_word.get("context", ""),
                "context_sentences": context_sents,
                "variants_detail": cached_word.get("variants_detail", []),
                "examples": cached_word.get("examples", []),
                "memory_hint": cached_word.get("memory_hint", ""),
                "enriched_meaning": cached_word.get("enriched_meaning", cached_word.get("meaning", "")),
                "context_meaning": cached_word.get("meaning", cached_word.get("context_meaning", "")),
                "unit_end_index": unit_end_index,
                "current_index": current_index,
                "unit_start_index": unit_start_index,
                "total_items_in_unit": total_items_in_unit,
                "listening_count_in_unit": listening_count_in_unit,
                "step_in_unit": step_in_unit
            }
        
        # 超时仍未获得缓存，返回基本数据
        print(f"[WARN] 等待单词缓存超时: {word}")
        correct_meaning = random_word.get("meaning", "")
        if not correct_meaning:
            if "context_meaning" in random_word:
                correct_meaning = random_word["context_meaning"]
            elif "translation" in random_word:
                correct_meaning = random_word["translation"]
        
        return {
            "word": word,
            "ipa": random_word.get("ipa", ""),
            "correct_meaning": correct_meaning,
            "options": [correct_meaning, "—", "—", "—"],
            "correct_index": 0,
            "context": "",
            "context_sentences": [],
            "variants_detail": [],
            "examples": [],
            "memory_hint": "",
            "enriched_meaning": correct_meaning,
            "meaning": correct_meaning,
            "unit_end_index": unit_end_index,
            "current_index": current_index,
            "unit_start_index": unit_start_index,
            "total_items_in_unit": total_items_in_unit,
            "listening_count_in_unit": listening_count_in_unit,
            "step_in_unit": step_in_unit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting random word: {str(e)}")


@app.post("/api/learn/{file_id}/next-word")
async def next_word(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")
        
        current_index = storage.load_learning_progress(file_id)
        
        plan = storage.load_learning_plan(file_id)
        if not plan:
            new_index = current_index + 1
            storage.save_learning_progress(file_id, new_index)
            return {"success": True, "new_index": new_index}
        
        current_unit_id, current_step = find_item_in_plan(plan, current_index)
        
        if current_unit_id is not None:
            _, current_unit_end = get_unit_flat_range(plan, current_unit_id)
            
            if current_index + 1 >= current_unit_end:
                storage.save_learning_progress(file_id, current_unit_end)
                return {
                    "success": True,
                    "type": "unit_complete",
                    "new_index": current_unit_end,
                    "unit_end_index": current_unit_end,
                    "completed_unit_id": current_unit_id
                }
        
        new_index = current_index + 1
        storage.save_learning_progress(file_id, new_index)
        
        asyncio.create_task(pre_generate_next_word(file_id, vocab, new_index))
        
        unit_id, step_in_unit = find_item_in_plan(plan, new_index)
        
        if unit_id is not None:
            _, unit_end_index = get_unit_flat_range(plan, unit_id)
            
            items = plan[unit_id].get("items", [])
            if step_in_unit < len(items):
                next_item = items[step_in_unit]
                
                if next_item["type"] == "sentence_quiz":
                    import random as rnd
                    tokens = list(next_item.get("tokens", []))
                    rnd.shuffle(tokens)
                    return {
                        "success": True,
                        "new_index": new_index,
                        "unit_end_index": unit_end_index,
                        "sentence_quiz": {
                            "flat_index": new_index,
                            "original_sentence": next_item["sentence"],
                            "correct_translation": next_item.get("correct_translation", ""),
                            "correct_tokens": next_item.get("correct_tokens", []),
                            "tokens": tokens,
                            "step_in_unit": step_in_unit,
                            "total_items_in_unit": len(items),
                            "listening_count_in_unit": sum(1 for it in items if it.get("type") == "listening_quiz")
                        }
                    }
                
                if next_item["type"] == "listening_quiz":
                    import random as rnd
                    correct_sentence = next_item["sentence"]
                    
                    pipeline_data = storage.load_pipeline_data(file_id)
                    all_sentences = pipeline_data if isinstance(pipeline_data, list) else pipeline_data.get("data", [])
                    
                    current_sentence_data = None
                    for sd in all_sentences:
                        if sd.get("sentence") == correct_sentence:
                            current_sentence_data = sd
                            break
                    
                    sentence_words_display = get_listening_correct_words(correct_sentence, current_sentence_data or {})
                    correct_lower_set = set(w.lower() for w in sentence_words_display)
                    distractor_words, distractor_set = get_listening_distractors_from_sentences(correct_sentence, all_sentences, correct_lower_set)
                    
                    vocab_data = storage.load_vocab(file_id)
                    all_vocab = vocab_data.get("vocab", vocab_data) if isinstance(vocab_data, dict) else vocab_data
                    for v in all_vocab:
                        v_tokens = v.get("tokens", [v["word"]])
                        for vt in v_tokens:
                            if vt.lower() not in correct_lower_set and vt.lower() not in distractor_set:
                                distractor_words.append(vt)
                                distractor_set.add(vt.lower())
                        if len(v_tokens) == 1 and v["word"].lower() not in correct_lower_set and v["word"].lower() not in distractor_set:
                            distractor_words.append(v["word"])
                            distractor_set.add(v["word"].lower())
                    
                    rnd.shuffle(distractor_words)
                    num_distractors = max(2, len(sentence_words_display) // 2)
                    distractor_words = distractor_words[:num_distractors]
                    
                    if len(distractor_words) < 2:
                        language_settings = storage.load_language_settings(file_id)
                        source_lang = language_settings.get("source_lang", "en")
                        backup_vocab_list = BACKUP_VOCAB_BY_LANG.get(source_lang, BACKUP_VOCAB_BY_LANG["en"])
                        backup_distractors = list(backup_vocab_list)
                        rnd.shuffle(backup_distractors)
                        idx = 0
                        while len(distractor_words) < 2:
                            bd = backup_distractors[idx % len(backup_distractors)]
                            if bd.lower() not in correct_lower_set and bd.lower() not in distractor_set:
                                distractor_words.append(bd)
                                distractor_set.add(bd.lower())
                            idx += 1
                    
                    options = sentence_words_display + distractor_words
                    rnd.shuffle(options)
                    return {
                        "success": True,
                        "new_index": new_index,
                        "unit_end_index": unit_end_index,
                        "listening_quiz": {
                            "flat_index": new_index,
                            "original_sentence": correct_sentence,
                            "clean_sentence": re.sub(r'^[A-Za-z\u0410-\u042F\u0430-\u044F]\s*[:：]\s*', '', correct_sentence),
                            "correct_words": sentence_words_display,
                            "options": options,
                            "step_in_unit": step_in_unit,
                            "total_items_in_unit": len(items),
                            "listening_count_in_unit": sum(1 for it in items if it.get("type") == "listening_quiz")
                        }
                    }
            
            return {"success": True, "new_index": new_index, "unit_end_index": unit_end_index}
        
        return {"success": True, "new_index": new_index}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error moving to next word: {str(e)}")


@app.post("/api/learn/{file_id}/set-progress")
async def set_progress(file_id: str, request: dict):
    try:
        index = request.get("index", 0)
        storage.save_learning_progress(file_id, index)
        
        vocab = storage.load_vocab(file_id)
        if vocab:
            asyncio.create_task(pre_generate_next_word(file_id, vocab, index))
        
        return {"success": True, "index": index}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting progress: {str(e)}")

@app.get("/api/learn/{file_id}/unit-stars")
async def get_unit_stars(file_id: str):
    try:
        stars = storage.load_unit_stars(file_id)
        return {"stars": stars}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading stars: {str(e)}")

@app.post("/api/learn/{file_id}/unit-stars")
async def save_unit_stars(file_id: str, request: dict):
    try:
        stars_data = request.get("stars", {})
        storage.save_unit_stars(file_id, stars_data)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving stars: {str(e)}")

async def pre_generate_next_word(file_id: str, vocab: List[Dict], next_index: int):
    try:
        language_settings = storage.load_language_settings(file_id)
        target_lang = language_settings["target_lang"]
        source_lang = language_settings.get("source_lang", "en")
        
        plan = storage.load_learning_plan(file_id)
        if not plan:
            return
        
        unit_id, step_in_unit = find_item_in_plan(plan, next_index)
        if unit_id is None:
            return
        
        items = plan[unit_id].get("items", [])
        if step_in_unit >= len(items):
            return
        
        next_item = items[step_in_unit]
        if next_item["type"] == "sentence_quiz":
            return
        
        vocab_idx = next_item["vocab_index"]
        random_word = vocab[vocab_idx]
        word = random_word["word"]
        
        # 检查是否已缓存
        if storage.load_word_cache(file_id, word):
            print(f"[DEBUG] 预生成单词已缓存: {word}")
            return
        
        # 构建上下文（包含翻译）
        sentences = storage.load_pipeline_data(file_id)
        context = ""
        context_sentences = []
        if sentences:
            import re
            word_pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE)
            for sent_idx, sentence_data in enumerate(sentences):
                if "sentence" in sentence_data:
                    if word_pattern.search(sentence_data["sentence"]):
                        context = sentence_data["sentence"]
                        translation = ""
                        if "translation_result" in sentence_data:
                            translation = sentence_data["translation_result"].get("tokenized_translation", "")
                        context_sentences.append({
                            "sentence": sentence_data["sentence"],
                            "translation": translation,
                            "sentence_index": sent_idx
                        })
            if not context and sentences:
                context = sentences[0].get("sentence", "")
        
        # 生成选项
        correct_meaning = random_word.get("meaning", "")
        
        if not correct_meaning:
            # 尝试从其他字段获取释义
            if "context_meaning" in random_word:
                correct_meaning = random_word["context_meaning"]
            elif "translation" in random_word:
                correct_meaning = random_word["translation"]
        
        print(f"[DEBUG] 后台预生成单词信息: {word}")
        
        # 调用generate_multiple_choice获取丰富的单词信息
        options_result = await nvidia_api.generate_multiple_choice(
            word,
            correct_meaning,
            context,
            target_lang
        )
        options_result = fix_llm_options_result(options_result, source_lang, file_id)
        
        # 构建缓存数据
        cache_data = dict(options_result)
        cache_data["word"] = options_result.get("word", word)
        cache_data["ipa"] = random_word.get("ipa", "")
        cache_data["meaning"] = correct_meaning
        cache_data["examples"] = options_result.get("examples", [])
        cache_data["context"] = context
        cache_data["context_sentences"] = context_sentences
        cache_data["morphology"] = random_word.get("morphology", "")
        cache_data["variants_detail"] = options_result.get("variants_detail", [])
        cache_data["memory_hint"] = options_result.get("memory_hint", "")
        cache_data["enriched_meaning"] = options_result.get("enriched_meaning", correct_meaning)
        cache_data["multiple_choice"] = options_result.get("multiple_choice", {})
        if "context_translations" in cache_data:
            del cache_data["context_translations"]
        
        # 缓存结果
        storage.save_word_cache(file_id, word, cache_data)
        print(f"[DEBUG] 缓存预生成单词信息: {word}")
        
    except Exception as e:
        print(f"[ERROR] 预生成单词信息失败: {str(e)}")


@app.get("/api/word/{file_id}/{word}")
async def get_word_details(file_id: str, word: str):
    try:
        print(f"[DEBUG] 获取单词详情: {word}")
        language_settings = storage.load_language_settings(file_id)
        source_lang = language_settings.get("source_lang", "en")
        target_lang = language_settings["target_lang"]
        
        # 先检查缓存
        cached_word = storage.load_word_cache(file_id, word)
        if cached_word:
            print(f"[DEBUG] 从缓存中获取单词信息: {word}")
            cached_word = fix_llm_options_result(cached_word, source_lang, file_id)
            mc = cached_word.get("multiple_choice", {})
            mc_options = []
            placeholder_check = re.compile(r'^(释义|含义|meaning|sense|definition)\s*\d+$', re.IGNORECASE)
            if isinstance(mc, dict) and "options" in mc and isinstance(mc["options"], list):
                mc_options = [o for o in mc["options"] if isinstance(o, dict) and "text" in o and not placeholder_check.match(o["text"].strip())]
            if not mc_options:
                print(f"[DEBUG] 缓存中 MC 选项为空或无效，清除缓存重新生成: {word}")
                storage.delete_word_cache(file_id, word)
                cached_word = None
        if cached_word:
            if "options" not in cached_word:
                options = []
                correct_index = 0
                for i, opt in enumerate(mc_options):
                    options.append(opt["text"])
                    if opt.get("is_correct"):
                        correct_index = i
                cached_word["options"] = options
                cached_word["correct_index"] = correct_index
            
            context_sents = cached_word.get("context_sentences", [])
            needs_rebuild = False
            for cs in context_sents:
                if isinstance(cs, dict) and "sentence_index" not in cs:
                    needs_rebuild = True
                    break
                if isinstance(cs, str):
                    needs_rebuild = True
                    break
            
            if needs_rebuild or not context_sents:
                sentences = storage.load_pipeline_data(file_id)
                if sentences:
                    import re as re_mod
                    word_pattern = re_mod.compile(r'\b' + re_mod.escape(word) + r'\b', re_mod.IGNORECASE)
                    rebuilt = []
                    for sent_idx, sentence_data in enumerate(sentences):
                        if "sentence" in sentence_data:
                            if word_pattern.search(sentence_data["sentence"]):
                                translation = ""
                                if "translation_result" in sentence_data:
                                    translation = sentence_data["translation_result"].get("tokenized_translation", "")
                                rebuilt.append({
                                    "sentence": sentence_data["sentence"],
                                    "translation": translation,
                                    "sentence_index": sent_idx
                                })
                    cached_word["context_sentences"] = rebuilt
                    storage.save_word_cache(file_id, word, cached_word)
            
            return cached_word

        # 无缓存：触发优先生成并等待
        print(f"[DEBUG] 单词详情无缓存，触发优先生成: {word}")
        state = word_gen_state.get(file_id)
        if state:
            state["priority_queue"] = [w for w in state.get("priority_queue", []) if w.lower() != word.lower()]
            state["priority_queue"].insert(0, word)
            if not state.get("running"):
                state["running"] = True
                state["task"] = asyncio.create_task(background_word_gen(file_id))
        else:
            vocab = storage.load_vocab(file_id)
            word_gen_state[file_id] = {
                "running": True,
                "vocab": vocab or [],
                "priority_queue": [word],
                "task": asyncio.create_task(background_word_gen(file_id)),
                "processing_words": set()
            }
        
        for _ in range(60):
            await asyncio.sleep(1)
            cached_word = storage.load_word_cache(file_id, word)
            if cached_word:
                mc = cached_word.get("multiple_choice", {})
                mc_options = []
                if isinstance(mc, dict) and "options" in mc and isinstance(mc["options"], list):
                    mc_options = [o for o in mc["options"] if isinstance(o, dict) and "text" in o]
                if mc_options:
                    break
        
        if cached_word:
            cached_word = fix_llm_options_result(cached_word, source_lang, file_id)
            mc = cached_word.get("multiple_choice", {})
            mc_options = []
            placeholder_check = re.compile(r'^(释义|含义|meaning|sense|definition)\s*\d+$', re.IGNORECASE)
            if isinstance(mc, dict) and "options" in mc and isinstance(mc["options"], list):
                mc_options = [o for o in mc["options"] if isinstance(o, dict) and "text" in o and not placeholder_check.match(o["text"].strip())]
            if mc_options:
                options = []
                correct_index = 0
                for i, opt in enumerate(mc_options):
                    options.append(opt["text"])
                    if opt.get("is_correct"):
                        correct_index = i
                cached_word["options"] = options
                cached_word["correct_index"] = correct_index
                return cached_word
        
        raise HTTPException(status_code=404, detail="Word detail generation timed out")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 获取单词详情失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting word details: {str(e)}")


@app.get("/api/learn/{file_id}/progress")
async def get_learning_progress(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")
        
        # 实现10个单词一组的分组
        group_size = 10
        units = []
        for i in range(0, len(vocab), group_size):
            unit_words = vocab[i:i+group_size]
            units.append({
                "word_count": len(unit_words),
                "completed": False
            })
        
        # 加载学习进度
        current_index = storage.load_learning_progress(file_id)
        current_unit = current_index // group_size
        
        # 标记已完成的单元
        for i in range(current_unit):
            if i < len(units):
                units[i]["completed"] = True
        
        total_units = len(units)
        all_units_completed = current_unit >= total_units
        
        return {
            "units": units,
            "current_unit": current_unit,
            "total_units": total_units,
            "all_units_completed": all_units_completed
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting learning progress: {str(e)}")


@app.get("/api/learn/{file_id}/unit/{unit_id}")
async def get_unit_words(file_id: str, unit_id: int):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")
        
        # 实现10个单词一组的分组
        group_size = 10
        start_index = unit_id * group_size
        end_index = start_index + group_size
        unit_words = vocab[start_index:end_index]
        
        if not unit_words:
            raise HTTPException(status_code=404, detail="Unit not found")
        
        # 为每个单词生成学习数据
        language_settings = storage.load_language_settings(file_id)
        target_lang = language_settings["target_lang"]
        source_lang = language_settings.get("source_lang", "en")
        
        learning_words = []
        for word_data in unit_words:
            # 构建上下文
            sentences = storage.load_pipeline_data(file_id)
            context = ""
            if sentences:
                for sentence_data in sentences:
                    if "sentence" in sentence_data:
                        if word_data["word"] in sentence_data["sentence"]:
                            context = sentence_data["sentence"]
                            break
                if not context and sentences:
                    # 如果没找到，使用第一个句子作为上下文
                    context = sentences[0].get("sentence", "")
            
            correct_meaning = word_data.get("meaning", "")
            
            if not correct_meaning:
                # 尝试从其他字段获取释义
                if "context_meaning" in word_data:
                    correct_meaning = word_data["context_meaning"]
                elif "translation" in word_data:
                    correct_meaning = word_data["translation"]
            
            # 调用generate_multiple_choice获取丰富的单词信息
            options_result = await nvidia_api.generate_multiple_choice(
                word_data["word"],
                correct_meaning,
                context,
                target_lang
            )
            options_result = fix_llm_options_result(options_result, source_lang, file_id)
            
            # 提取选项和正确索引
            options = []
            correct_index = 0
            if "multiple_choice" in options_result and "options" in options_result["multiple_choice"]:
                for i, opt in enumerate(options_result["multiple_choice"]["options"]):
                    options.append(opt["text"])
                    if opt["is_correct"]:
                        correct_index = i
            else:
                fallback_opts = get_fallback_options(correct_meaning, file_id, 3)
                options = options_result.get("options", [correct_meaning] + fallback_opts)
                correct_index = options_result.get("correct_index", 0)
            
            # 构建学习数据
            learning_word = {
                "word": options_result.get("word", word_data["word"]),
                "ipa": word_data.get("ipa", ""),
                "correct_meaning": options_result.get("enriched_meaning", correct_meaning),
                "options": options,
                "correct_index": correct_index,
                "context": context,
                "variants_detail": options_result.get("variants_detail", []),
                "examples": options_result.get("examples", []),
                "memory_hint": options_result.get("memory_hint", "")
            }
            learning_words.append(learning_word)
        
        return {
            "unit_id": unit_id,
            "words": learning_words
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting unit words: {str(e)}")


@app.get("/api/learn/{file_id}/check-coverage")
async def check_coverage(file_id: str):
    try:
        print(f"[DEBUG] 检查覆盖度: {file_id}")
        vocab = storage.load_vocab(file_id)
        if not vocab:
            return {"can_form_sentences": False, "unit_completed": False}
        
        # 加载学习进度
        current_index = storage.load_learning_progress(file_id)
        print(f"[DEBUG] 当前学习进度: {current_index}")
        
        # 检查是否完成了当前单元
        unit_size = 10
        current_unit = current_index // unit_size
        words_in_unit = min(unit_size, max(0, len(vocab) - current_unit * unit_size))
        unit_completed = current_index >= (current_unit * unit_size + words_in_unit)
        
        # 检查是否已经学习完所有单词
        all_words_learned = current_index >= len(vocab)
        
        # 只有学完一个单元的所有单词后，才可以开始句子翻译题
        # 确保学完当前单元的所有单词后才出现翻译题
        group_size = 10
        current_unit = current_index // group_size
        words_in_current_unit = min(group_size, max(0, len(vocab) - current_unit * group_size))
        end_of_current_unit = current_unit * group_size + words_in_current_unit
        
        if current_index < end_of_current_unit:
            print(f"[DEBUG] 还没有学完当前单元的所有单词，不能生成句子")
            return {"can_form_sentences": False, "unit_completed": unit_completed}
        
        # 学习完所有单词后，所有单词都算已学
        if all_words_learned:
            learned_word_set = set(word["word"].lower() for word in vocab)
            learned_words = vocab
        else:
            # 否则只算到current_index-1的单词（因为current_index是下一个要学的单词）
            learned_words = vocab[:current_index]
            learned_word_set = set(word["word"].lower() for word in learned_words)
        
        print(f"[DEBUG] 已学单词: {[word['word'] for word in learned_words]}")
        
        # 加载句子
        sentences = storage.load_pipeline_data(file_id)
        if not sentences:
            return {"can_form_sentences": False, "unit_completed": unit_completed}
        
        # 检查句子是否有至少一个有效token（原来是要求多个token）
        def has_valid_token(sentence_data):
            if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
                tokens = sentence_data["translation_result"]["translation"]
                return len(tokens) >= 1
            return False
        
        # 检查是否有句子可以用已学单词组成（修改：只要有有效token就返回can_form=True）
        can_form = False
        for sentence_data in sentences:
            if "sentence" in sentence_data:
                sentence = sentence_data["sentence"]
                
                if source_lang in NO_SPACE_LANGUAGES:
                    word_count = len(sentence.replace(' ', ''))
                else:
                    word_count = len(sentence.split())
                if word_count > MAX_SENTENCE_WORDS_FOR_QUIZ:
                    continue
                
                word_count_check = sentence_data.get("word_count", 0)
                if word_count_check < 2:
                    if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
                        word_count_check = len(sentence_data["translation_result"]["translation"])
                    if word_count_check < 2:
                        continue
                
                print(f"[DEBUG] 检查句子: {sentence} (word_count={word_count})")
                
                # 只要有有效token就认为可以用（修改：去掉多个token的要求）
                if not has_valid_token(sentence_data):
                    print(f"[DEBUG] 句子没有有效token，跳过: {sentence}")
                    continue
                
                # 获取该句子的LLM tokens
                sentence_tokens = []
                if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
                    for token in sentence_data["translation_result"]["translation"]:
                        if isinstance(token, dict) and "text" in token:
                            sentence_tokens.append(token["text"].lower())
                print(f"[DEBUG] 句子的LLM tokens: {sentence_tokens}")
                
                # 使用新的匹配逻辑：检查已学单词的tokens是否与句子的tokens有重叠
                # 修改：只要有至少1个匹配就认为可以用（单个token的句子也生成翻译题）
                matched_count = 0
                matched_tokens = []
                
                for learned_word in learned_words:
                    # 获取已学单词的所有tokens
                    learned_word_tokens = []
                    if 'tokens' in learned_word:
                        learned_word_tokens = [t.lower() for t in learned_word['tokens']]
                    else:
                        learned_word_tokens = [learned_word["word"].lower()]
                    
                    print(f"[DEBUG] 检查已学单词: {learned_word['word']}, 其tokens: {learned_word_tokens}")
                    
                    # 检查这些tokens是否在句子的tokens中
                    for lt in learned_word_tokens:
                        for st in sentence_tokens:
                            if lt in st or st in lt:
                                matched_count += 1
                                matched_tokens.append((lt, st))
                                print(f"[DEBUG] 匹配成功: {lt} <-> {st}")
                                # 修改：只要有至少1个匹配就认为可以用（原来是2个）
                                if matched_count >= 1:
                                    can_form = True
                                    break
                        if can_form:
                            break
                    if can_form:
                        break
                
                if can_form:
                    print(f"[DEBUG] 可以生成句子！匹配的token对: {matched_tokens}")
                    break
        
        print(f"[DEBUG] 最终结果: can_form={can_form}")
        return {"can_form_sentences": can_form, "unit_completed": unit_completed}
    except Exception as e:
        print(f"[ERROR] 检查覆盖度错误: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error checking coverage: {str(e)}")


@app.get("/api/learn/{file_id}/sentence-quiz")
async def generate_sentence_quiz(file_id: str):
    # 加载已使用的句子
    used_sentences = storage.load_used_sentences(file_id) or []
    
    try:
        print(f"[DEBUG] 生成句子翻译题: {file_id}")
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")
        
        # 加载语言设置
        language_settings = storage.load_language_settings(file_id)
        target_lang = language_settings["target_lang"]
        source_lang = language_settings.get("source_lang", "en")
        
        # 加载学习进度
        current_index = storage.load_learning_progress(file_id)
        
        # 计算 unit_completed
        group_size = 10
        current_unit = current_index // group_size
        words_in_current_unit = min(group_size, max(0, len(vocab) - current_unit * group_size))
        end_of_current_unit = current_unit * group_size + words_in_current_unit
        unit_completed = current_index >= end_of_current_unit
        
        learned_words = vocab[:current_index + 1]
        learned_word_set = set(word["word"].lower() for word in learned_words)
        print(f"[DEBUG] 已学单词: {[word['word'] for word in learned_words]}")
        print(f"[DEBUG] unit_completed: {unit_completed} (current_index={current_index}, end_of_current_unit={end_of_current_unit})")
        
        # 加载句子
        sentences = storage.load_pipeline_data(file_id)
        if not sentences:
            raise HTTPException(status_code=404, detail="Sentences not found")
        
        # 找到可以用已学单词组成的句子
        eligible_sentences = []
        # 修改：检查句子是否有至少一个有效token（原来是要求多个token）
        def has_valid_token(sentence_data):
            if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
                tokens = sentence_data["translation_result"]["translation"]
                return len(tokens) >= 1
            return False
        
        for sentence_data in sentences:
            if "sentence" in sentence_data:
                sentence = sentence_data["sentence"]
                
                # 检查句子单词数量，至少需要2个单词才参与句子练习
                word_count = sentence_data.get("word_count", 0)
                if word_count < 2:
                    if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
                        word_count = len(sentence_data["translation_result"]["translation"])
                    if word_count < 2:
                        print(f"[DEBUG] 句子单词数不足2，跳过: {sentence} (word_count={word_count})")
                        continue
                
                print(f"[DEBUG] 检查句子: {sentence} (word_count={word_count})")
                
                if not has_valid_token(sentence_data):
                    print(f"[DEBUG] 句子没有有效token，跳过: {sentence}")
                    continue
                
                # 获取该句子的LLM tokens
                sentence_tokens = []
                if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
                    for token in sentence_data["translation_result"]["translation"]:
                        if isinstance(token, dict) and "text" in token:
                            sentence_tokens.append(token["text"].lower())
                
                # 修改：检查是否有至少1个已学tokens与当前句子匹配（原来是2个）
                matched_count = 0
                for learned_word in learned_words:
                    # 获取已学单词的所有tokens
                    learned_word_tokens = []
                    if 'tokens' in learned_word:
                        learned_word_tokens = [t.lower() for t in learned_word['tokens']]
                    else:
                        learned_word_tokens = [learned_word["word"].lower()]
                    
                    # 检查这些tokens是否在句子的tokens中
                    for lt in learned_word_tokens:
                        for st in sentence_tokens:
                            if lt in st or st in lt:
                                matched_count += 1
                                # 修改：只要有至少1个匹配就认为可以用
                                if matched_count >= 1:
                                    eligible_sentences.append(sentence_data)
                                    print(f"[DEBUG] 句子符合条件: {sentence}")
                                    break
                        if matched_count >= 1:
                            break
                    if matched_count >= 1:
                        break
        
        # 打印eligible_sentences
        print(f"[DEBUG] eligible_sentences: {[s.get('sentence') for s in eligible_sentences]}")
        
        if not eligible_sentences:
            raise HTTPException(status_code=404, detail="No eligible sentences found")
        
        # 过滤掉已使用的句子，并且确保句子数据包含"sentence"键
        available_sentences = [s for s in eligible_sentences if s.get("sentence") and s.get("sentence") not in used_sentences]
        
        # 如果所有句子都已使用，返回单元完成的响应
        if not available_sentences:
            print(f"[DEBUG] 所有句子都已使用，返回单元完成")
            storage.save_used_sentences(file_id, [])
            # 这里我们模拟unit_completed为True
            raise HTTPException(status_code=404, detail="No more eligible sentences")
        
        # 随机选择一个句子
        import random
        selected_sentence = random.choice(available_sentences)
        original_sentence = selected_sentence["sentence"]
        print(f"[DEBUG] 选择句子: {original_sentence}")
        
        # 记录已使用的句子
        used_sentences.append(original_sentence)
        storage.save_used_sentences(file_id, used_sentences)
        
        # 直接使用LLM生成的数据
        if "translation_result" not in selected_sentence:
            raise HTTPException(status_code=404, detail="Translation result not found")
        
        translation_result = selected_sentence["translation_result"]
        tokenized_translation = translation_result.get("tokenized_translation", "")
        redundant_tokens = translation_result.get("redundant_tokens", [])
        print(f"[DEBUG] 翻译结果: {tokenized_translation}")
        
        # 过滤掉标点符号，只保留文字
        import re
        def clean_token(token):
            return re.sub(r'[^\w\s]', '', token)
        
        correct_tokens = get_translation_phrases(translation_result, max_phrases=6)
        print(f"[DEBUG] 正确翻译片段(LLM拆分): {correct_tokens}")
        
        if len(correct_tokens) < 2 or len(correct_tokens) > 8:
            raise HTTPException(status_code=404, detail="Not enough translated tokens for quiz")
        
        cleaned_redundant_tokens = []
        for token in redundant_tokens:
            rt_stripped = token.strip()
            if rt_stripped and rt_stripped not in correct_tokens and not is_source_lang_text(rt_stripped, source_lang):
                cleaned_redundant_tokens.append(rt_stripped)
        print(f"[DEBUG] 清理后的冗余词: {cleaned_redundant_tokens}")
        
        unique_redundant = list(dict.fromkeys(cleaned_redundant_tokens))
        random.shuffle(unique_redundant)
        selected_distractors = unique_redundant[:4]
        
        if len(selected_distractors) < 4:
            existing_set = set(correct_tokens) | set(selected_distractors)
            all_sentences_data = storage.load_pipeline_data(file_id) or []
            for other_sent in all_sentences_data:
                if other_sent.get("sentence") == original_sentence:
                    continue
                other_tr = other_sent.get("translation_result", {})
                other_phrases = get_translation_phrases(other_tr, max_phrases=10)
                for op in other_phrases:
                    if op not in existing_set and not is_source_lang_text(op, source_lang):
                        selected_distractors.append(op)
                        existing_set.add(op)
                        if len(selected_distractors) >= 4:
                            break
                if len(selected_distractors) >= 4:
                    break
        
        print(f"[DEBUG] 选择的干扰词: {selected_distractors}")
        
        # 合并正确tokens和干扰词，然后打乱
        all_tokens = correct_tokens + selected_distractors
        random.shuffle(all_tokens)
        print(f"[DEBUG] 所有tokens: {all_tokens}")
        
        # 构建正确翻译
        correct_translation = tokenized_translation.strip() if tokenized_translation else "".join(correct_tokens)
        if not correct_translation.strip():
            correct_translation = "".join(correct_tokens)
        print(f"[DEBUG] 正确翻译: {correct_translation}")
        
        return {
            "original_sentence": original_sentence,
            "correct_translation": correct_translation,
            "correct_tokens": correct_tokens,
            "tokens": all_tokens,
            "unit_completed": unit_completed
        }
    except HTTPException:
        # 重新抛出HTTPException，不被捕获为500错误
        raise
    except Exception as e:
        print(f"[ERROR] 生成句子翻译题错误: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating sentence quiz: {str(e)}")


# --- 新的学习阶段 API ---
@app.get("/api/{file_id}/phases")
async def get_phases(file_id: str):
    """获取所有阶段列表和进度"""
    try:
        # 加载句子数据
        sentences = storage.load_pipeline_data(file_id)
        if not sentences:
            raise HTTPException(status_code=404, detail="No sentences found")
        
        # 提取句子列表
        sentence_list = [s["sentence"] for s in sentences if "sentence" in s]
        
        # 分组为单元（8句/单元）
        units = text_processor.group_sentences_into_units(sentence_list, 8)
        
        # 获取各阶段进度
        phase1_progress = storage.load_phase_progress(file_id, 1)
        phase2_progress = storage.load_phase_progress(file_id, 2)
        
        return {
            "phases": [
                {
                    "phase_number": 1,
                    "name": "阶段一：单词学习",
                    "units_count": len(units),
                    "progress": phase1_progress
                },
                {
                    "phase_number": 2,
                    "name": "阶段二：句子练习",
                    "units_count": len(units),
                    "progress": phase2_progress
                }
            ],
            "total_units": len(units)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/{file_id}/phase/{phase_number}/units")
async def get_phase_units(file_id: str, phase_number: int):
    try:
        sentences = storage.load_pipeline_data(file_id)
        vocab = storage.load_vocab(file_id)
        if not sentences:
            raise HTTPException(status_code=404, detail="No sentences found")
        
        if phase_number == 1:
            current_index = storage.load_learning_progress(file_id)
            max_index = storage.load_learning_max_progress(file_id)
            
            plan = storage.load_learning_plan(file_id)
            if not plan:
                generate_and_save_learning_plan(file_id, vocab, storage.load_pipeline_data(file_id) or [])
                plan = storage.load_learning_plan(file_id)
            
            phase1_units = []
            accumulated = 0
            for i, unit_plan in enumerate(plan):
                items = unit_plan.get("items", [])
                start_index = accumulated
                end_index = accumulated + len(items)
                word_count = sum(1 for item in items if item["type"] == "word")
                completed = max_index >= end_index
                word_items = [item for item in items if item["type"] == "word"]
                all_words_cached = True
                for item in word_items:
                    vi = item.get("vocab_index")
                    if vi is not None and vi < len(vocab):
                        w = vocab[vi].get("word", "")
                        if w and not storage.load_word_cache(file_id, w):
                            all_words_cached = False
                            break
                phase1_units.append({
                    "word_count": word_count,
                    "exercises_count": len(items),
                    "completed": completed,
                    "start_index": start_index,
                    "end_index": end_index,
                    "generating": not all_words_cached
                })
                accumulated += len(items)
            
            current_unit = 0
            for i, unit in enumerate(phase1_units):
                if current_index < unit["end_index"]:
                    current_unit = i
                    break
            else:
                current_unit = len(phase1_units) - 1 if phase1_units else 0
            
            return {
                "phase_number": phase_number,
                "units": [
                    {
                        "unit_id": i,
                        "word_count": unit["word_count"],
                        "exercises_count": unit["exercises_count"],
                        "completed": unit["completed"],
                        "start_index": unit["start_index"],
                        "end_index": unit["end_index"],
                        "generating": unit["generating"]
                    }
                    for i, unit in enumerate(phase1_units)
                ],
                "current_unit": current_unit
            }
        else:
            eligible_sentences = filter_eligible_sentences(sentences)
            
            if not eligible_sentences:
                return {
                    "phase_number": phase_number,
                    "units": [{"unit_id": 0, "exercises_count": 0, "completed": True, "no_eligible_sentences": True}],
                    "current_unit": 0
                }
            
            exercise_order = storage.load_exercise_order(file_id, phase_number)
            exercises_per_sent = []
            for s in eligible_sentences:
                wc = len(s.get("sentence", "").split())
                if wc >= 20:
                    exercises_per_sent.append(3)
                elif wc >= 3:
                    exercises_per_sent.append(4)
                else:
                    exercises_per_sent.append(1)
            expected_length = sum(exercises_per_sent)
            
            if exercise_order is None:
                seed = hash(str([s.get("sentence", "") for s in eligible_sentences]))
                exercise_order = text_processor.generate_interleaved_exercise_order(
                    len(eligible_sentences), masks_per_sentence=3, seed=seed,
                    exercises_per_sentence_list=exercises_per_sent
                )
                storage.save_exercise_order(file_id, phase_number, exercise_order)
                storage.save_phase2_progress(file_id, 0)
            
            unit_size = 10
            total_exercises = len(exercise_order)
            num_units = max(1, (total_exercises + unit_size - 1) // unit_size)
            
            max_exercise_index = storage.load_phase2_max_progress(file_id)
            current_exercise_index = storage.load_phase2_progress(file_id)
            if max_exercise_index > total_exercises:
                storage.save_phase2_progress(file_id, 0)
                max_exercise_index = 0
                current_exercise_index = 0
            
            units = []
            for i in range(num_units):
                start = i * unit_size
                end = min(start + unit_size, total_exercises)
                units.append({
                    "unit_id": i,
                    "exercises_count": end - start,
                    "completed": max_exercise_index >= end
                })
            
            current_unit = 0
            for i in range(num_units):
                if current_exercise_index < (i + 1) * unit_size and current_exercise_index >= i * unit_size:
                    current_unit = i
                    break
            else:
                current_unit = min(num_units - 1, current_exercise_index // unit_size)
            
            return {
                "phase_number": phase_number,
                "units": units,
                "current_unit": current_unit
            }
    except Exception as e:
        print(f"[ERROR] get_phase_units: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/{file_id}/phase/{phase_number}/unit/{unit_id}")
async def get_phase_unit_exercise(file_id: str, phase_number: int, unit_id: int):
    try:
        storage.touch_history_record(file_id)
        sentences = storage.load_pipeline_data(file_id)
        vocab = storage.load_vocab(file_id)
        if not sentences:
            raise HTTPException(status_code=404, detail="No sentences found")
        
        if phase_number == 2:
            language_settings = storage.load_language_settings(file_id)
            source_lang = language_settings.get("source_lang", "en")
            
            eligible_sentences = filter_eligible_sentences(sentences)
            
            if not eligible_sentences:
                return {"unit_complete": True, "no_eligible_sentences": True}
            
            exercise_order = storage.load_exercise_order(file_id, phase_number)
            exercises_per_sent = []
            for s in eligible_sentences:
                wc = len(s.get("sentence", "").split())
                if wc >= 20:
                    exercises_per_sent.append(3)
                elif wc >= 3:
                    exercises_per_sent.append(4)
                else:
                    exercises_per_sent.append(1)
            expected_length = sum(exercises_per_sent)
            
            if exercise_order is None:
                seed = hash(str([s.get("sentence", "") for s in eligible_sentences]))
                exercise_order = text_processor.generate_interleaved_exercise_order(
                    len(eligible_sentences), masks_per_sentence=3, seed=seed,
                    exercises_per_sentence_list=exercises_per_sent
                )
                storage.save_exercise_order(file_id, phase_number, exercise_order)
                storage.save_phase2_progress(file_id, 0)
            
            unit_size = 10
            current_exercise_index = storage.load_phase2_progress(file_id)
            total_exercises = len(exercise_order)
            max_exercise_index = storage.load_phase2_max_progress(file_id)
            if max_exercise_index > total_exercises:
                storage.save_phase2_progress(file_id, 0)
                current_exercise_index = 0
            current_unit = current_exercise_index // unit_size
            
            exercise_start = unit_id * unit_size
            exercise_end = min(exercise_start + unit_size, len(exercise_order))
            
            if current_exercise_index >= exercise_end:
                storage.save_phase2_progress(file_id, exercise_start)
                current_exercise_index = exercise_start
            elif current_exercise_index < exercise_start:
                storage.save_phase2_progress(file_id, exercise_start)
                current_exercise_index = exercise_start
            
            sent_idx, type_idx = exercise_order[current_exercise_index]
            current_sentence_data = eligible_sentences[sent_idx]
            current_sentence = current_sentence_data["sentence"]
            
            translation_result = current_sentence_data.get("translation_result", {})
            translation_tokens = []
            if "translation" in translation_result:
                for token in translation_result["translation"]:
                    if isinstance(token, dict) and "text" in token:
                        token_text = token["text"]
                        if not is_punctuation_only(token_text) and not is_speaker_label(token_text):
                            translation_tokens.append(token_text)
            
            exercise_index_in_unit = current_exercise_index - exercise_start
            total_exercises_in_unit = exercise_end - exercise_start
            
            if type_idx < 3:
                if source_lang in NO_SPACE_LANGUAGES:
                    word_count = len(current_sentence.replace(' ', ''))
                else:
                    word_count = len(current_sentence.split())
                if word_count < 3:
                    type_idx = 3
            
            if type_idx < 3:
                mask_seed = hash(current_sentence) + 1
                masked_exercise = text_processor.generate_masked_sentence(
                    current_sentence,
                    vocab,
                    translation_tokens,
                    sentences,
                    mask_seed=mask_seed,
                    source_lang=source_lang,
                    mask_version=type_idx,
                    max_distractors=3
                )
                
                return {
                    "exercise_type": "masked_sentence",
                    "exercise_index_in_unit": exercise_index_in_unit,
                    "total_exercises_in_unit": total_exercises_in_unit,
                    "mask_version": type_idx,
                    "total_masks": 3,
                    "data": masked_exercise,
                    "unit_id": unit_id,
                    "sentence_preview": current_sentence[:50] + "..." if len(current_sentence) > 50 else current_sentence
                }
            else:
                tokenized_translation = translation_result.get("tokenized_translation", "")
                
                original_tokens = []
                
                if "translation" in translation_result:
                    for token in translation_result["translation"]:
                        if isinstance(token, dict) and "text" in token:
                            token_text = strip_edge_punctuation(token["text"].strip())
                            if token_text and not is_punctuation_only(token_text) and not is_speaker_label(token_text):
                                original_tokens.append(token_text)
                
                if not original_tokens:
                    original_tokens = text_processor.tokenize_sentence(current_sentence, language=source_lang)
                
                if len(original_tokens) > 8:
                    new_exercise_index = current_exercise_index + 1
                    storage.save_phase2_progress(file_id, new_exercise_index)
                    if new_exercise_index >= len(exercise_order):
                        return {"unit_complete": True}
                    return await get_phase_unit_exercise(file_id, phase_number, unit_id)
                
                import random
                random.seed(hash(current_sentence) + type_idx)
                distractors = []
                original_lower_set = set(t.lower() for t in original_tokens)
                max_distractors = 3
                
                all_candidate_distractors = []
                candidate_set = set()
                for sent_data in eligible_sentences:
                    if sent_data is current_sentence_data:
                        continue
                    if "translation_result" in sent_data and "translation" in sent_data["translation_result"]:
                        for token in sent_data["translation_result"]["translation"]:
                            if isinstance(token, dict) and "text" in token:
                                token_text = token["text"].strip()
                                if token_text and token_text.lower() not in original_lower_set and token_text.lower() not in candidate_set:
                                    all_candidate_distractors.append(token_text)
                                    candidate_set.add(token_text.lower())
                
                vocab_words = [v["word"] for v in vocab]
                for vw in vocab_words:
                    if vw.lower() not in original_lower_set and vw.lower() not in candidate_set:
                        all_candidate_distractors.append(vw)
                        candidate_set.add(vw.lower())
                
                random.shuffle(all_candidate_distractors)
                distractors = all_candidate_distractors[:max_distractors]
                
                if len(distractors) < max_distractors:
                    backup_vocab_list = BACKUP_VOCAB_BY_LANG.get(source_lang, BACKUP_VOCAB_BY_LANG["en"])
                    backup_distractors = list(backup_vocab_list)
                    random.shuffle(backup_distractors)
                    idx = 0
                    while len(distractors) < max_distractors:
                        bd = backup_distractors[idx % len(backup_distractors)]
                        if bd.lower() not in original_lower_set and bd not in distractors:
                            distractors.append(bd)
                        idx += 1
                
                all_tokens = original_tokens + distractors
                random.shuffle(all_tokens)
                
                return {
                    "exercise_type": "translation_reconstruction",
                    "exercise_index_in_unit": exercise_index_in_unit,
                    "total_exercises_in_unit": total_exercises_in_unit,
                    "data": {
                        "native_translation": tokenized_translation,
                        "original_tokens": original_tokens,
                        "options": all_tokens
                    },
                    "unit_id": unit_id,
                    "sentence_preview": current_sentence[:50] + "..." if len(current_sentence) > 50 else current_sentence
                }
        
        return {"redirect_to_phase1": True}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/{file_id}/phase/{phase_number}/unit/{unit_id}/next")
async def next_phase_exercise(file_id: str, phase_number: int, unit_id: int):
    try:
        if phase_number == 2:
            current_exercise_index = storage.load_phase2_progress(file_id)
            new_exercise_index = current_exercise_index + 1
            
            exercise_order = storage.load_exercise_order(file_id, phase_number)
            if exercise_order is None:
                return {"success": False, "error": "No exercise order found"}
            
            unit_size = 10
            total_exercises = len(exercise_order)
            new_unit = new_exercise_index // unit_size
            
            if new_exercise_index >= total_exercises:
                storage.save_phase2_progress(file_id, new_exercise_index)
                return {"success": True, "all_complete": True}
            
            if new_unit > unit_id:
                storage.save_phase2_progress(file_id, new_exercise_index)
                return {"success": True, "unit_complete": True, "new_unit": new_unit}
            
            storage.save_phase2_progress(file_id, new_exercise_index)
            return await get_phase_unit_exercise(file_id, phase_number, unit_id)
        else:
            progress = storage.load_phase_progress(file_id, phase_number)
            current_exercise_index = progress["current_exercise"]
            new_exercise_index = current_exercise_index + 1
            
            sentences = storage.load_pipeline_data(file_id)
            sentence_list = [s for s in sentences if "sentence" in s]
            units = text_processor.group_sentences_into_units(sentence_list, 8)
            
            if unit_id >= len(units):
                return {"success": False, "error": "Unit not found"}
            
            max_exercises = len(units[unit_id])
            
            if new_exercise_index >= max_exercises:
                new_unit_id = unit_id + 1
                storage.save_phase_progress(file_id, phase_number, new_unit_id, 0, 0)
                return {"success": True, "unit_complete": True, "new_unit": new_unit_id}
            else:
                storage.save_phase_progress(file_id, phase_number, unit_id, new_exercise_index, 0)
                return {"success": True, "new_exercise_index": new_exercise_index}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/{file_id}/phase/{phase_number}/unit/{unit_id}/complete")
async def complete_phase_unit(file_id: str, phase_number: int, unit_id: int):
    try:
        if phase_number == 2:
            exercise_order = storage.load_exercise_order(file_id, phase_number)
            if exercise_order:
                unit_size = 10
                new_exercise_index = (unit_id + 1) * unit_size
                storage.save_phase2_progress(file_id, new_exercise_index)
            return {"success": True}
        else:
            storage.save_phase_progress(file_id, phase_number, unit_id + 1, 0, 0)
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/{file_id}/phase/{phase_number}/set-progress")
async def set_phase_progress(file_id: str, phase_number: int, request: dict):
    try:
        if phase_number == 2:
            exercise_index = request.get("exercise_index", 0)
            storage.save_phase2_progress(file_id, exercise_index)
            return {"success": True}
        else:
            unit_id = request.get("unit_id", 0)
            exercise_index = request.get("exercise_index", 0)
            exercise_type_index = request.get("exercise_type_index", 0)
            storage.save_phase_progress(file_id, phase_number, unit_id, exercise_index, exercise_type_index)
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/word-detail/regenerate")
async def regenerate_word_detail(request: dict):
    try:
        word = request.get("word", "")
        source_lang = request.get("source_lang", "en")
        target_lang = request.get("target_lang", "zh")
        if not word:
            raise HTTPException(status_code=400, detail="Word is required")

        records = storage.load_history()
        matching = [r for r in records if r.get("source_lang") == source_lang]

        for record in matching:
            file_id = record.get("file_id")
            if file_id:
                storage.delete_word_cache(file_id, word)

        options_result = await nvidia_api.generate_multiple_choice(
            word, "", "", target_lang
        )
        file_id = matching[0].get("file_id") if matching else None
        if file_id:
            options_result = fix_llm_options_result(options_result, source_lang, file_id)

        result = {
            "word": options_result.get("word", word),
            "ipa": "",
            "meaning": options_result.get("enriched_meaning", ""),
            "enriched_meaning": options_result.get("enriched_meaning", ""),
            "part_of_speech": options_result.get("morphology", ""),
            "examples": options_result.get("examples", []),
            "memory_hint": options_result.get("memory_hint", ""),
            "variants_detail": options_result.get("variants_detail", []),
        }

        if file_id:
            cache_data = dict(options_result)
            cache_data["word"] = options_result.get("word", word)
            cache_data["meaning"] = options_result.get("enriched_meaning", "")
            cache_data["context"] = ""
            cache_data["context_sentences"] = []
            cache_data["morphology"] = options_result.get("morphology", "")
            cache_data["multiple_choice"] = options_result.get("multiple_choice", {})
            storage.save_word_cache(file_id, word, cache_data)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/word-detail")
async def get_word_detail(word: str, source_lang: str = "en", target_lang: str = "zh"):
    try:
        records = storage.load_history()
        matching = [r for r in records if r.get("source_lang") == source_lang]
        
        for record in matching:
            file_id = record.get("file_id")
            if not file_id:
                continue
            cached = storage.load_word_cache(file_id, word)
            if cached:
                return {
                    "word": cached.get("word", word),
                    "ipa": cached.get("ipa", ""),
                    "meaning": cached.get("enriched_meaning", "") or cached.get("meaning", ""),
                    "enriched_meaning": cached.get("enriched_meaning", ""),
                    "part_of_speech": cached.get("morphology", ""),
                    "examples": cached.get("examples", []),
                    "memory_hint": cached.get("memory_hint", ""),
                    "variants_detail": cached.get("variants_detail", []),
                }
        
        options_result = await nvidia_api.generate_multiple_choice(
            word, "", "", target_lang
        )
        options_result = fix_llm_options_result(options_result, source_lang, file_id)
        
        result = {
            "word": options_result.get("word", word),
            "ipa": "",
            "meaning": options_result.get("enriched_meaning", ""),
            "enriched_meaning": options_result.get("enriched_meaning", ""),
            "part_of_speech": options_result.get("morphology", ""),
            "examples": options_result.get("examples", []),
            "memory_hint": options_result.get("memory_hint", ""),
            "variants_detail": options_result.get("variants_detail", []),
        }
        
        if matching:
            file_id = matching[0].get("file_id")
            if file_id:
                cache_data = dict(options_result)
                cache_data["word"] = options_result.get("word", word)
                cache_data["meaning"] = options_result.get("enriched_meaning", "")
                cache_data["context"] = ""
                cache_data["context_sentences"] = []
                cache_data["morphology"] = options_result.get("morphology", "")
                cache_data["multiple_choice"] = options_result.get("multiple_choice", {})
                storage.save_word_cache(file_id, word, cache_data)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/file/{file_id}/info")
async def get_file_info(file_id: str):
    try:
        settings = storage.load_language_settings(file_id)
        return {
            "source_lang": settings.get("source_lang", "en"),
            "target_lang": settings.get("target_lang", "zh")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/word-list")
async def get_word_list(source_lang: Optional[str] = None, target_lang: Optional[str] = None):
    try:
        records = storage.load_history()
        if source_lang:
            filtered = []
            for r in records:
                rlang = r.get("source_lang", "")
                if rlang == source_lang:
                    filtered.append(r)
                    continue
                if rlang == "auto" or not rlang:
                    file_id = r.get("file_id")
                    if file_id:
                        settings = storage.load_language_settings(file_id)
                        if settings and settings.get("source_lang") == source_lang:
                            filtered.append(r)
                            continue
            records = filtered
        if target_lang:
            records = [r for r in records if r.get("target_lang") == target_lang]

        merged = {}
        for record in records:
            file_id = record.get("file_id")
            if not file_id:
                continue
            vocab = storage.load_vocab(file_id)
            if not vocab:
                continue
            for entry in vocab:
                word_key = entry.get("word", "").lower()
                if not word_key:
                    continue
                if word_key not in merged:
                    merged[word_key] = {"entry": dict(entry), "file_id": file_id}

        result = []
        for word_key, data in merged.items():
            entry = data["entry"]
            file_id = data["file_id"]
            word = entry.get("word", word_key)

            cached = storage.load_word_cache(file_id, word)

            ipa = entry.get("ipa", "")
            meaning = entry.get("meaning", "") or entry.get("context_meaning", "")
            part_of_speech = entry.get("morphology", "")
            examples = []
            memory_hint = ""
            variants_detail = []

            if cached:
                if cached.get("ipa"):
                    ipa = cached["ipa"]
                meaning = cached.get("enriched_meaning", "") or cached.get("meaning", "") or meaning
                if cached.get("meaning") and not meaning:
                    meaning = cached["meaning"]
                if cached.get("examples"):
                    examples = cached["examples"]
                if cached.get("memory_hint"):
                    memory_hint = cached["memory_hint"]
                if cached.get("variants_detail"):
                    variants_detail = cached["variants_detail"]

            result.append({
                "word": word,
                "ipa": ipa,
                "meaning": meaning,
                "enriched_meaning": cached.get("enriched_meaning", "") or meaning if cached else meaning,
                "part_of_speech": part_of_speech,
                "examples": examples,
                "memory_hint": memory_hint,
                "variants_detail": variants_detail,
                "context_sentences": cached.get("context_sentences", []) if cached else [],
            })

        result.sort(key=lambda x: x["word"].lower())
        return {"words": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def compute_file_progress(file_id: str) -> dict:
    try:
        result = {"phase1": {"completed": 0, "total": 0}, "phase2": {"completed": 0, "total": 0}}

        plan = storage.load_learning_plan(file_id)
        if plan:
            max_index = storage.load_learning_max_progress(file_id)
            accumulated = 0
            completed = 0
            for unit_plan in plan:
                items = unit_plan.get("items", [])
                end_index = accumulated + len(items)
                if max_index >= end_index:
                    completed += 1
                accumulated = end_index
            result["phase1"]["completed"] = completed
            result["phase1"]["total"] = len(plan)

        sentences = storage.load_pipeline_data(file_id)
        if sentences:
            eligible = filter_eligible_sentences(sentences)
            if eligible:
                exercise_order = storage.load_exercise_order(file_id, 2)
                exercises_per_sent = []
                for s in eligible:
                    wc = len(s.get("sentence", "").split())
                    if wc >= 20:
                        exercises_per_sent.append(3)
                    elif wc >= 3:
                        exercises_per_sent.append(4)
                    else:
                        exercises_per_sent.append(1)
                expected_length = sum(exercises_per_sent)

                if exercise_order and len(exercise_order) == expected_length:
                    total_exercises = len(exercise_order)
                    unit_size = 10
                    num_units = max(1, (total_exercises + unit_size - 1) // unit_size)
                    max_exercise_index = storage.load_phase2_max_progress(file_id)

                    completed = 0
                    for i in range(num_units):
                        end = min((i + 1) * unit_size, total_exercises)
                        if max_exercise_index >= end:
                            completed += 1
                    result["phase2"]["completed"] = completed
                    result["phase2"]["total"] = num_units

        return result
    except Exception:
        return {"phase1": {"completed": 0, "total": 0}, "phase2": {"completed": 0, "total": 0}}


@app.get("/api/history")
async def get_history():
    try:
        records = storage.load_history()
        records.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        for record in records:
            file_id = record.get("file_id", "")
            if file_id:
                record["progress"] = compute_file_progress(file_id)
            else:
                record["progress"] = {"phase1": {"completed": 0, "total": 0}, "phase2": {"completed": 0, "total": 0}}
        return {"records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/settings")
async def get_llm_settings():
    try:
        from nvidia_api import get_settings as get_llm_settings_raw
        settings = get_llm_settings_raw()
        configs = settings.get("configs", [])
        active_index = settings.get("active_index", 0)
        masked_configs = []
        for cfg in configs:
            masked_key = cfg.get("api_key", "")
            if masked_key and len(masked_key) > 8:
                masked_key = masked_key[:4] + "*" * (len(masked_key) - 8) + masked_key[-4:]
            masked_configs.append({
                "api_key": masked_key,
                "base_url": cfg.get("base_url", ""),
                "model": cfg.get("model", ""),
                "has_key": bool(cfg.get("api_key", ""))
            })
        return {
            "configs": masked_configs,
            "active_index": active_index
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ConfigItem(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None

class SettingsUpdate(BaseModel):
    configs: Optional[List[ConfigItem]] = None
    active_index: Optional[int] = None


@app.post("/api/settings")
async def update_llm_settings(req: SettingsUpdate):
    try:
        from nvidia_api import get_settings as get_llm_settings_raw, save_configs, set_active_index
        if req.configs is not None:
            new_configs = []
            for cfg in req.configs:
                api_key = cfg.api_key if cfg.api_key and not cfg.api_key.startswith("****") else None
                base_url = cfg.base_url
                model = cfg.model
                new_configs.append({
                    "api_key": api_key or "",
                    "base_url": base_url or "",
                    "model": model or ""
                })
            save_configs(new_configs)
        if req.active_index is not None:
            set_active_index(req.active_index)
        settings = get_llm_settings_raw()
        configs = settings.get("configs", [])
        active_index = settings.get("active_index", 0)
        masked_configs = []
        for cfg in configs:
            masked_key = cfg.get("api_key", "")
            if masked_key and len(masked_key) > 8:
                masked_key = masked_key[:4] + "*" * (len(masked_key) - 8) + masked_key[-4:]
            masked_configs.append({
                "api_key": masked_key,
                "base_url": cfg.get("base_url", ""),
                "model": cfg.get("model", ""),
                "has_key": bool(cfg.get("api_key", ""))
            })
        return {
            "configs": masked_configs,
            "active_index": active_index
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user-preferences")
async def get_user_preferences():
    try:
        prefs = storage.load_user_preferences()
        return prefs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class UserPreferencesUpdate(BaseModel):
    source_lang: Optional[str] = None
    target_lang: Optional[str] = None
    rpm: Optional[int] = None
    retry_interval: Optional[float] = None
    skip_listening: Optional[bool] = None
    recent_languages: Optional[List[str]] = None
    page_size: Optional[int] = None


@app.post("/api/user-preferences")
async def update_user_preferences(req: UserPreferencesUpdate):
    try:
        current = storage.load_user_preferences()
        if req.source_lang is not None:
            current["source_lang"] = req.source_lang
        if req.target_lang is not None:
            current["target_lang"] = req.target_lang
        if req.rpm is not None:
            current["rpm"] = req.rpm
        if req.retry_interval is not None:
            current["retry_interval"] = req.retry_interval
        if req.skip_listening is not None:
            current["skip_listening"] = req.skip_listening
        if req.recent_languages is not None:
            current["recent_languages"] = req.recent_languages
        if req.page_size is not None:
            current["page_size"] = req.page_size
        storage.save_user_preferences(current)
        return current
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/detect-language")
async def detect_language_endpoint(request: dict):
    try:
        text = request.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        lang = await detect_language(text)
        return {"detected_language": lang}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/history/{file_id}")
async def delete_history(file_id: str):
    try:
        success = storage.delete_history_record(file_id)
        if success:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Record not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/history/{file_id}")
async def rename_history(file_id: str, request: dict):
    try:
        new_title = request.get("title", "").strip()
        if not new_title:
            raise HTTPException(status_code=400, detail="Title is required")
        success = storage.rename_history_record(file_id, new_title)
        if success:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Record not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/translate-text")
async def translate_text(request: dict):
    try:
        text = request.get("text", "")
        source_lang = request.get("source_language", "zh")
        target_lang = request.get("target_language", "en")

        if not text:
            raise HTTPException(status_code=400, detail="Text is required")

        source_lang_name = get_lang_name(source_lang)
        target_lang_name = get_lang_name(target_lang)

        nvidia_api.reload()
        messages = [
            {
                "role": "system",
                "content": f"You are a professional translator. Translate the following text from {source_lang_name} to {target_lang_name}. Output ONLY the translated text, nothing else. Do not add any explanations, notes, or commentary. The translation should be natural and fluent."
            },
            {
                "role": "user",
                "content": text
            }
        ]
        response = await nvidia_api.call_minimax(messages, temperature=0.3, max_tokens=4096)

        translated_text = ""
        if "choices" in response and len(response["choices"]) > 0:
            translated_text = response["choices"][0].get("message", {}).get("content", "").strip()

        if not translated_text:
            raise HTTPException(status_code=500, detail="Translation failed")

        return {"translated_text": translated_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-text")
async def generate_text(request: dict):
    try:
        prompt = request.get("prompt", "")
        source_lang = request.get("source_language", "en")
        target_lang = request.get("target_language", "zh")

        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")

        source_lang_name = get_lang_name(source_lang)

        nvidia_api.reload()
        messages = [
            {
                "role": "system",
                "content": f"You are a text generator. Generate a text in {source_lang_name} based on the user's description. CRITICAL RULES: 1. Generate text content that can include articles, stories, essays, descriptions, dialogues, conversations, or any other natural text form. 2. If the user requests dialogue or conversation content, generate natural exchanges between speakers with clear speaker labels (e.g. A:, B:, or names). 3. Do NOT include any meta-commentary, explanations, or notes about the text itself. 4. The text should be natural, coherent, and suitable for language learning. 5. The text should be at least 3-5 sentences long (or 3-5 exchanges for dialogue). 6. Output ONLY the generated text, nothing else."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        response = await nvidia_api.call_minimax(messages, temperature=0.7, max_tokens=4096)

        generated_text = ""
        if "choices" in response and len(response["choices"]) > 0:
            generated_text = response["choices"][0].get("message", {}).get("content", "").strip()

        if not generated_text:
            raise HTTPException(status_code=500, detail="Text generation failed")

        return {"generated_text": generated_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


import hashlib
import io
import subprocess
import tempfile
import os

TTS_CACHE = {}

TTS_LANG_MAP = {
    'en': 'en', 'zh': 'cmn', 'ja': 'ja', 'ko': 'ko',
    'fr': 'fr', 'de': 'de', 'es': 'es', 'it': 'it',
    'pt': 'pt', 'ru': 'ru',
}

@app.get("/api/tts")
async def tts_endpoint(text: str = "", lang: str = "en"):
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    tts_lang = TTS_LANG_MAP.get(lang, lang)
    cache_key = hashlib.md5(f"{tts_lang}:{text}".encode()).hexdigest()
    if cache_key in TTS_CACHE:
        cached_mime, cached_data = TTS_CACHE[cache_key]
        return StreamingResponse(io.BytesIO(cached_data), media_type=cached_mime)
    try:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as wav_file:
            wav_path = wav_file.name
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as mp3_file:
            mp3_path = mp3_file.name
        try:
            subprocess.run(
                ['espeak-ng', '-v', tts_lang, '-w', wav_path, text],
                capture_output=True, timeout=10
            )
            subprocess.run(
                ['ffmpeg', '-y', '-i', wav_path, '-codec:a', 'libmp3lame', '-b:a', '64k', mp3_path],
                capture_output=True, timeout=10
            )
            with open(mp3_path, 'rb') as f:
                mp3_data = f.read()
            TTS_CACHE[cache_key] = ('audio/mpeg', mp3_data)
            return StreamingResponse(io.BytesIO(mp3_data), media_type="audio/mpeg")
        finally:
            try: os.unlink(wav_path)
            except: pass
            try: os.unlink(mp3_path)
            except: pass
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, timeout_keep_alive=600)
