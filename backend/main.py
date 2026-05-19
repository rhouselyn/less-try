from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
import json
import random
import asyncio
import time
from dotenv import load_dotenv
from pathlib import Path
import re

from nvidia_api import NvidiaAPI, get_settings, update_settings
from text_processor import TextProcessor, BACKUP_VOCAB, BACKUP_VOCAB_BY_LANG
from storage import Storage

load_dotenv()

app = FastAPI(title="少邻国 - Lesslingo", version="1.0.0")

import re

PUNCTUATION_CHARS = set('.,!?:;，。！？：；、')

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
                if elapsed < 0.5:
                    wait_time += 0.5 - elapsed
                await asyncio.sleep(wait_time)
            self.last_call = time.time()

def is_punctuation_only(text):
    if not text or not isinstance(text, str):
        return False
    stripped = text.strip()
    if not stripped:
        return True
    return all(ch in PUNCTUATION_CHARS for ch in stripped)

def is_source_lang_text(text, source_lang="en"):
    if not text or not isinstance(text, str):
        return False
    text = text.strip()
    if source_lang == "en":
        if re.match(r'^[a-zA-Z\s\-\']+$', text) and len(text.split()) <= 3:
            if not re.search(r'[\u4e00-\u9fff]', text):
                return True
    return False

ZH_FUNCTION_WORDS = {'的', '了', '地', '得', '着', '过', '吗', '呢', '吧', '啊', '呀', '哦', '嗯', '是', '在', '有', '和', '与', '或', '但', '而', '却', '又', '也', '都', '就', '才', '还', '已', '所', '该', '其', '这', '那', '个', '一', '种', '些', '等', '被', '把', '让', '给', '从', '向', '到', '对', '为', '以', '于', '及', '之', '将', '会', '能', '可', '要', '应', '需', '没', '不', '很', '最', '更', '太', '极', '比'}

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

def fix_llm_options_result(result: dict, source_lang="en") -> dict:
    if not isinstance(result, dict):
        return result
    mc = result.get("multiple_choice")
    if isinstance(mc, dict) and "options" in mc and isinstance(mc["options"], list):
        filtered_options = []
        for opt in mc["options"]:
            if isinstance(opt, dict) and "text" in opt:
                if opt.get("is_correct", False) or not is_source_lang_text(opt["text"], source_lang):
                    filtered_options.append(opt)
        if len(filtered_options) < 4:
            correct_answer = mc.get("correct_answer", "")
            existing_texts = {o["text"] for o in filtered_options}
            fallbacks = ["其他含义", "不同释义", "无关意思", "另一种解释", "不同概念"]
            for fb in fallbacks:
                if len(filtered_options) >= 4:
                    break
                if fb not in existing_texts:
                    filtered_options.append({"text": fb, "is_correct": False})
                    existing_texts.add(fb)
        mc["options"] = filtered_options[:4]
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
            correct_answer = result.get("correct_answer", "")
            mc_options = []
            for opt in raw_opts:
                if isinstance(opt, dict) and "text" in opt:
                    mc_options.append(opt)
                elif isinstance(opt, str):
                    is_correct = (opt == correct_answer)
                    mc_options.append({"text": opt, "is_correct": is_correct})
            if mc_options:
                result["multiple_choice"] = {
                    "question": result.get("question", ""),
                    "correct_answer": correct_answer,
                    "options": mc_options
                }
    if "multiple_choice" not in result or not isinstance(result.get("multiple_choice"), dict) or "options" not in result.get("multiple_choice", {}):
        correct_meaning = result.get("enriched_meaning", result.get("context_meaning", ""))
        result["multiple_choice"] = {
            "question": "",
            "correct_answer": correct_meaning,
            "options": [
                {"text": correct_meaning, "is_correct": True},
                {"text": "其他释义A", "is_correct": False},
                {"text": "其他释义B", "is_correct": False},
                {"text": "其他释义C", "is_correct": False}
            ]
        }
    return result

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


@app.get("/")
async def root():
    return {"message": "少邻国 - Lesslingo API"}


async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str, rpm: int = 20):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}, RPM={rpm}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        storage.save_language_settings(file_id, source_lang, target_lang, rpm)
        
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        rate_limiter = RateLimiter(rpm)
        results_dict = {}
        completed_indices = set()
        
        async def process_single_sentence(idx, sentence):
            if not sentence.strip():
                return idx, None
            await rate_limiter.acquire()
            print(f"[DEBUG] 正在翻译句子 {idx+1}/{total_sentences}: {repr(sentence)}")
            sentence_translation_result = await text_processor.process_translation(
                sentence,
                source_lang,
                target_lang,
                nvidia_api
            )
            print(f"[DEBUG] 句子 {idx+1} 翻译完成")
            
            sentence_translation_result = text_processor.validate_and_complete_translation(
                sentence, sentence_translation_result, source_lang
            )
            
            sentence_words = text_processor.extract_words(sentence, source_lang)
            dict_entry_words = set()
            if isinstance(sentence_translation_result, dict) and "dictionary_entries" in sentence_translation_result:
                dict_entries = sentence_translation_result["dictionary_entries"]
                if isinstance(dict_entries, str):
                    try:
                        dict_entries = json.loads(dict_entries)
                        sentence_translation_result["dictionary_entries"] = dict_entries
                    except:
                        dict_entries = []
                        sentence_translation_result["dictionary_entries"] = []
                if isinstance(dict_entries, list):
                    for entry in dict_entries:
                        if isinstance(entry, dict) and "word" in entry:
                            dict_entry_words.add(entry["word"].lower())
            
            missing_words = [w for w in sentence_words if w.lower() not in dict_entry_words]
            
            if missing_words:
                print(f"[DEBUG] 发现遗漏单词: {missing_words}, 正在补充处理...")
                await rate_limiter.acquire()
                remaining_entries = await nvidia_api.process_remaining_words(
                    missing_words, source_lang, target_lang, sentence
                )
                if remaining_entries:
                    if isinstance(sentence_translation_result, dict):
                        if "dictionary_entries" not in sentence_translation_result:
                            sentence_translation_result["dictionary_entries"] = []
                        
                        if not isinstance(sentence_translation_result["dictionary_entries"], list):
                            try:
                                parsed = json.loads(sentence_translation_result["dictionary_entries"])
                                if isinstance(parsed, list):
                                    sentence_translation_result["dictionary_entries"] = parsed
                                else:
                                    sentence_translation_result["dictionary_entries"] = []
                            except:
                                sentence_translation_result["dictionary_entries"] = []
                        
                        if isinstance(sentence_translation_result["dictionary_entries"], list):
                            existing_words_lower = {e.get("word", "").lower() for e in sentence_translation_result["dictionary_entries"] if isinstance(e, dict)}
                            for entry in remaining_entries:
                                if isinstance(entry, dict) and "word" in entry:
                                    if entry["word"].lower() not in existing_words_lower:
                                        sentence_translation_result["dictionary_entries"].append(entry)
                                        existing_words_lower.add(entry["word"].lower())
                    
                    if isinstance(sentence_translation_result, dict) and "translation" in sentence_translation_result:
                        translation_text_lower = []
                        for token in sentence_translation_result["translation"]:
                            if isinstance(token, dict) and "text" in token:
                                translation_text_lower.append(token["text"].lower())
                        
                        for entry in remaining_entries:
                            if isinstance(entry, dict) and "word" in entry:
                                word = entry["word"]
                                if word.lower() not in translation_text_lower:
                                    sentence_translation_result["translation"].append({
                                        "text": word,
                                        "translation": entry.get("translation", ""),
                                        "phonetic": entry.get("ipa", ""),
                                        "morphology": entry.get("morphology", "")
                                    })
                                    translation_text_lower.append(word.lower())
                    
                    print(f"[DEBUG] 补充了 {len(remaining_entries)} 个遗漏单词")
            
            sentence_data = {
                "sentence": sentence,
                "translation_result": sentence_translation_result
            }
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
            
            ordered_translations = []
            for si in range(max_sequential + 1):
                if si in results_dict:
                    ordered_translations.append(results_dict[si])
            
            partial_vocab = []
            for si, sd in enumerate(ordered_translations):
                tr = sd.get("translation_result", {})
                if isinstance(tr, dict) and "dictionary_entries" in tr:
                    de = tr["dictionary_entries"]
                    if isinstance(de, str):
                        try:
                            de = json.loads(de)
                        except:
                            continue
                    if isinstance(de, list):
                        for entry in de:
                            if isinstance(entry, dict):
                                entry_copy = dict(entry)
                                entry_copy["sentence_index"] = si
                                partial_vocab.append(entry_copy)
            
            seen = set()
            unique_partial = []
            for entry in partial_vocab:
                word = entry.get("word", "").lower()
                if word not in seen and word:
                    seen.add(word)
                    unique_partial.append(entry)
            unique_partial.sort(key=lambda x: x["word"].lower())
            
            progress = int(len(completed_indices) / total_sentences * 100)
            processing_status[file_id] = {
                "status": "processing",
                "progress": progress,
                "current_sentence": len(completed_indices),
                "total_sentences": total_sentences,
                "vocab": unique_partial,
                "sentence_translations": ordered_translations
            }
            print(f"[DEBUG] 更新状态: 进度 {progress}%, 已处理 {len(completed_indices)} 个句子, 词汇 {len(unique_partial)} 个")
        
        sentence_translations = [results_dict.get(i, {"sentence": sentences[i], "translation_result": {}}) for i in range(total_sentences)]
        
        all_vocab = []
        for i, sentence_data in enumerate(sentence_translations):
            translation_result = sentence_data.get("translation_result", {})
            if isinstance(translation_result, dict) and "dictionary_entries" in translation_result:
                dictionary_entries = translation_result["dictionary_entries"]
                if isinstance(dictionary_entries, str):
                    try:
                        dictionary_entries = json.loads(dictionary_entries)
                    except:
                        continue
                if isinstance(dictionary_entries, list):
                    for dict_entry in dictionary_entries:
                        if isinstance(dict_entry, dict):
                            dict_entry["sentence_index"] = i
                            all_vocab.append(dict_entry)
        
        seen = set()
        unique_vocab = []
        for entry in all_vocab:
            word = entry.get("word", "").lower()
            if word not in seen and word:
                seen.add(word)
                unique_vocab.append(entry)
        all_vocab = unique_vocab
        
        all_vocab.sort(key=lambda x: x["word"].lower())
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
        print(f"[DEBUG] 所有处理完成！")
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
        correct_meaning = word_entry.get("context_meaning", "")
        if not correct_meaning:
            if "translation" in word_entry:
                correct_meaning = word_entry["translation"]
            elif "meaning" in word_entry:
                correct_meaning = word_entry["meaning"]
        print(f"[DEBUG] Background word gen: {word_to_gen}")
        options_result = await nvidia_api.generate_multiple_choice(
            word_to_gen,
            correct_meaning,
            context,
            target_lang
        )
        options_result = fix_llm_options_result(options_result, source_lang)
        cache_data = dict(options_result)
        cache_data["word"] = options_result.get("word", word_to_gen)
        cache_data["ipa"] = options_result.get("ipa", word_entry.get("ipa", ""))
        cache_data["meaning"] = options_result.get("enriched_meaning", correct_meaning)
        cache_data["context_meaning"] = options_result.get("context_meaning", correct_meaning)
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
    except Exception as e:
        print(f"[ERROR] Word gen failed for {word_to_gen}: {e}")
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

    while state["running"]:
        word_to_gen = None
        if state["priority_queue"]:
            word_to_gen = state["priority_queue"].pop(0)
        elif state["position"] < len(vocab):
            word_entry = vocab[state["position"]]
            word_to_gen = word_entry.get("word", "")
            state["position"] += 1

        if not word_to_gen:
            await asyncio.sleep(1)
            continue

        if storage.load_word_cache(file_id, word_to_gen):
            continue

        processing = state.get("processing_words", set())
        if word_to_gen.lower() in {w.lower() for w in processing}:
            continue

        asyncio.create_task(process_single_word_gen(file_id, word_to_gen, vocab, source_lang, target_lang))
        await asyncio.sleep(3.0)

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
    
    plan = []
    all_learned_vocab_indices = set()
    used_sentences = set()
    
    vocab_pointer = 0
    
    while vocab_pointer < len(shuffled_indices):
        unit_word_items = []
        unit_quiz_items = []
        
        while vocab_pointer < len(shuffled_indices) and len(unit_word_items) < max_items_per_unit:
            vocab_idx = shuffled_indices[vocab_pointer]
            vocab_pointer += 1
            
            unit_word_items.append({
                "type": "word",
                "vocab_index": vocab_idx
            })
            all_learned_vocab_indices.add(vocab_idx)
            
            learned_words = [vocab[i] for i in all_learned_vocab_indices]
            
            for sentence_data in sentences:
                if "sentence" not in sentence_data:
                    continue
                
                sentence = sentence_data["sentence"]
                
                if sentence in used_sentences:
                    continue
                
                word_count = len(sentence.split())
                if word_count > MAX_SENTENCE_WORDS_FOR_QUIZ:
                    continue
                
                already_in_unit = any(
                    item.get("sentence") == sentence
                    for item in unit_quiz_items
                )
                if already_in_unit:
                    continue
                
                tr = sentence_data.get("translation_result", {})
                if "translation" not in tr:
                    continue
                
                translation_tokens = tr.get("translation", [])
                if not translation_tokens:
                    continue
                
                sentence_covered = True
                for token in translation_tokens:
                    if isinstance(token, dict) and "text" in token:
                        token_text = token["text"].lower()
                        token_covered = False
                        for w in learned_words:
                            w_tokens = w.get("tokens", [w["word"]])
                            for wt in w_tokens:
                                if wt.lower() == token_text or wt.lower() in token_text or token_text in wt.lower():
                                    token_covered = True
                                    break
                            if token_covered:
                                break
                        if not token_covered:
                            sentence_covered = False
                            break
                
                if sentence_covered:
                    used_sentences.add(sentence)
                    
                    covering_vocab_indices = []
                    for word_item in unit_word_items:
                        w_data = vocab[word_item["vocab_index"]]
                        w_tokens = w_data.get("tokens", [w_data["word"]])
                        word_covers = False
                        for wt in w_tokens:
                            for token in translation_tokens:
                                if isinstance(token, dict) and "text" in token:
                                    if wt.lower() == token["text"].lower() or wt.lower() in token["text"].lower() or token["text"].lower() in wt.lower():
                                        word_covers = True
                                        break
                            if word_covers:
                                break
                        if word_covers:
                            covering_vocab_indices.append(word_item["vocab_index"])
                    
                    raw_translation = tr.get("tokenized_translation", "")
                    correct_translation = raw_translation.strip() if raw_translation else ""
                    
                    correct_tokens = get_translation_phrases(tr, max_phrases=6)
                    correct_tokens = [ct for ct in correct_tokens if not is_punctuation_only(ct)]
                    
                    if len(correct_tokens) >= 2:
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
                            "_covering_vocab_indices": covering_vocab_indices
                        })
                    
                    listening_correct_words = [vocab[vi]["word"] for vi in covering_vocab_indices]
                    if not listening_correct_words:
                        for vi in all_learned_vocab_indices:
                            w_data = vocab[vi]
                            w_tokens = w_data.get("tokens", [w_data["word"]])
                            for wt in w_tokens:
                                for token in translation_tokens:
                                    if isinstance(token, dict) and "text" in token:
                                        if wt.lower() == token["text"].lower() or wt.lower() in token["text"].lower() or token["text"].lower() in wt.lower():
                                            if w_data["word"] not in listening_correct_words:
                                                listening_correct_words.append(w_data["word"])
                                            break
                    
                    sentence_word_list = sentence.split()
                    ordered_correct_words = []
                    used_correct = set()
                    for sw in sentence_word_list:
                        for cw in listening_correct_words:
                            if cw not in used_correct and (sw.lower() == cw.lower() or sw.lower() in cw.lower() or cw.lower() in sw.lower()):
                                ordered_correct_words.append(cw)
                                used_correct.add(cw)
                                break
                    if len(ordered_correct_words) == len(listening_correct_words):
                        listening_correct_words = ordered_correct_words
                    
                    listening_distractor_words = []
                    listening_correct_lower = set(w.lower() for w in listening_correct_words)
                    available = [v["word"] for v in vocab if v["word"].lower() not in listening_correct_lower]
                    random.shuffle(available)
                    for w in available:
                        listening_distractor_words.append(w)
                        if len(listening_distractor_words) >= 2:
                            break
                    
                    if len(listening_distractor_words) < 2:
                        for other_sent in sentences:
                            other_sentence = other_sent.get("sentence", "")
                            if other_sentence and other_sentence != sentence:
                                for w in other_sentence.split():
                                    w_clean = w.strip()
                                    if w_clean and w_clean.lower() not in listening_correct_lower and w_clean not in listening_distractor_words:
                                        listening_distractor_words.append(w_clean)
                                        if len(listening_distractor_words) >= 2:
                                            break
                            if len(listening_distractor_words) >= 2:
                                break
                    
                    if len(listening_distractor_words) < 2:
                        backup_vocab_list = BACKUP_VOCAB_BY_LANG.get(source_lang, BACKUP_VOCAB_BY_LANG["en"])
                        backup_distractors = list(backup_vocab_list)
                        random.shuffle(backup_distractors)
                        idx = 0
                        while len(listening_distractor_words) < 2:
                            bd = backup_distractors[idx % len(backup_distractors)]
                            if bd.lower() not in listening_correct_lower and bd not in listening_distractor_words:
                                listening_distractor_words.append(bd)
                            idx += 1
                    
                    if not listening_correct_words:
                        continue
                    
                    unit_quiz_items.append({
                        "type": "listening_quiz",
                        "sentence": sentence,
                        "correct_words": listening_correct_words,
                        "distractor_words": listening_distractor_words[:2],
                        "_covering_vocab_indices": covering_vocab_indices
                    })
        
        final_items = list(unit_word_items)
        
        quizzes_with_anchor = []
        for quiz in unit_quiz_items:
            covering = quiz.pop("_covering_vocab_indices", [])
            if covering:
                last_covering_idx = covering[-1]
                anchor_pos = 0
                for i, item in enumerate(final_items):
                    if item.get("type") == "word" and item.get("vocab_index") == last_covering_idx:
                        anchor_pos = i + 1
                        break
                quizzes_with_anchor.append((quiz, anchor_pos))
            else:
                quizzes_with_anchor.append((quiz, 0))
        
        quizzes_with_anchor.sort(key=lambda x: x[1])
        
        offset = 0
        for quiz, anchor_pos in quizzes_with_anchor:
            adjusted_anchor = anchor_pos + offset
            insert_pos = random.randint(adjusted_anchor, max(adjusted_anchor, len(final_items)))
            final_items.insert(insert_pos, quiz)
            offset += 1
        
        if final_items:
            plan.append({
                "unit_id": len(plan),
                "items": final_items
            })
    
    storage.save_learning_plan(file_id, plan)


async def generate_title(text: str, source_lang: str) -> str:
    first_line = text.strip().split('\n')[0].strip()
    if len(first_line) <= 30 and not first_line.endswith(('。', '，', '！', '？', '.', ',', '!', '?', ';', '；')):
        return first_line
    try:
        messages = [
            {"role": "system", "content": "You are a title generator. Generate a very short title (max 20 characters) that summarizes the given text. If the text already has a clear title in the first line, use that as the title. Output ONLY the title, nothing else."},
            {"role": "user", "content": f"Generate a short title for this text (language: {source_lang}):\n\n{text[:500]}"}
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
        text = request.get("text", "")
        source_lang = request.get("source_language", "en")
        target_lang = request.get("target_language", "zh")
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        import datetime
        now = datetime.datetime.now()
        file_id = f"text_{now.strftime('%Y%m%d_%H%M%S_%f')[:-3]}"
        
        app_settings = storage.load_app_settings()
        rpm = app_settings.get("rpm", 20)
        
        title = await generate_title(text, source_lang)
        text_preview = text.strip()[:100]
        storage.add_history_record(file_id, title, source_lang, target_lang, text_preview)
        
        background_tasks.add_task(process_text_background, file_id, text, source_lang, target_lang, rpm)
        
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
                "position": 0,
                "vocab": vocab,
                "priority_queue": [],
                "task": None,
                "processing_words": set()
            }

        state = word_gen_state[file_id]
        state["vocab"] = vocab
        if "processing_words" not in state:
            state["processing_words"] = set()

        for i, word_entry in enumerate(vocab):
            word = word_entry.get("word", "")
            if word and not storage.load_word_cache(file_id, word):
                state["position"] = i
                break
        else:
            state["position"] = len(vocab)

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
        if not word:
            raise HTTPException(status_code=400, detail="Word is required")

        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")

        if file_id not in word_gen_state:
            word_gen_state[file_id] = {
                "running": False,
                "position": 0,
                "vocab": vocab,
                "priority_queue": [],
                "task": None,
                "processing_words": set()
            }

        state = word_gen_state[file_id]
        state["vocab"] = vocab
        if "processing_words" not in state:
            state["processing_words"] = set()

        if word not in state["priority_queue"]:
            state["priority_queue"].append(word)

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
        return {"vocab": vocab}
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
                    correct_words = current_item.get("correct_words", correct_sentence.split())
                    correct_lower_set = set(w.lower() for w in correct_words)
                    distractor_words = []
                    max_distractors = 2
                    
                    vocab_data = storage.load_vocab(file_id)
                    all_vocab = vocab_data.get("vocab", vocab_data) if isinstance(vocab_data, dict) else vocab_data
                    available = [v["word"] for v in all_vocab if v["word"].lower() not in correct_lower_set]
                    rnd.shuffle(available)
                    for w in available:
                        distractor_words.append(w)
                        if len(distractor_words) >= max_distractors:
                            break
                    
                    if len(distractor_words) < max_distractors:
                        pipeline_data = storage.load_pipeline_data(file_id)
                        all_sentences = pipeline_data if isinstance(pipeline_data, list) else pipeline_data.get("data", [])
                        for sd in all_sentences:
                            other_s = sd.get("sentence", "")
                            if other_s and other_s != correct_sentence:
                                for w in other_s.split():
                                    w_clean = w.strip()
                                    if w_clean and w_clean.lower() not in correct_lower_set and w_clean not in distractor_words:
                                        distractor_words.append(w_clean)
                                        if len(distractor_words) >= max_distractors:
                                            break
                            if len(distractor_words) >= max_distractors:
                                break
                    
                    if len(distractor_words) < max_distractors:
                        language_settings = storage.load_language_settings(file_id)
                        source_lang = language_settings.get("source_lang", "en")
                        backup_vocab_list = BACKUP_VOCAB_BY_LANG.get(source_lang, BACKUP_VOCAB_BY_LANG["en"])
                        backup_distractors = list(backup_vocab_list)
                        rnd.shuffle(backup_distractors)
                        idx = 0
                        while len(distractor_words) < max_distractors:
                            bd = backup_distractors[idx % len(backup_distractors)]
                            if bd.lower() not in correct_lower_set and bd not in distractor_words:
                                distractor_words.append(bd)
                            idx += 1
                    
                    options = correct_words + distractor_words
                    rnd.shuffle(options)
                    return {
                        "type": "listening_quiz",
                        "original_sentence": correct_sentence,
                        "correct_words": correct_words,
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
            # 构建学习模式响应
            options = []
            correct_index = 0
            if "multiple_choice" in cached_word and "options" in cached_word["multiple_choice"]:
                for i, opt in enumerate(cached_word["multiple_choice"]["options"]):
                    options.append(opt["text"])
                    if opt["is_correct"]:
                        correct_index = i
            else:
                options = [cached_word.get("meaning", ""), "其他释义A", "其他释义B", "其他释义C"]
                correct_index = 0
            
            # 启动后台任务预生成下一个单词
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
                "context_meaning": cached_word.get("context_meaning", cached_word.get("meaning", "")),
                "unit_end_index": unit_end_index,
                "current_index": current_index,
                "unit_start_index": unit_start_index,
                "total_items_in_unit": total_items_in_unit,
                        "listening_count_in_unit": listening_count_in_unit,
                "step_in_unit": step_in_unit
            }
        
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
        correct_meaning = random_word.get("context_meaning", "")
        
        if not correct_meaning:
            # 尝试从其他字段获取释义
            if "translation" in random_word:
                correct_meaning = random_word["translation"]
            elif "meaning" in random_word:
                correct_meaning = random_word["meaning"]
        
        options_result = await nvidia_api.generate_multiple_choice(
            word,
            correct_meaning,
            context,
            target_lang
        )
        options_result = fix_llm_options_result(options_result, source_lang)
        
        # 提取选项和正确索引
        options = []
        correct_index = 0
        if "multiple_choice" in options_result and "options" in options_result["multiple_choice"]:
            for i, opt in enumerate(options_result["multiple_choice"]["options"]):
                options.append(opt["text"])
                if opt["is_correct"]:
                    correct_index = i
        else:
            options = options_result.get("options", [correct_meaning, "其他释义A", "其他释义B", "其他释义C"])
            correct_index = options_result.get("correct_index", 0)
        
        # 构建响应数据
        response_data = {
            "word": options_result.get("word", word),
            "ipa": options_result.get("ipa", random_word.get("ipa", "")),
            "correct_meaning": options_result.get("correct_answer", options_result.get("enriched_meaning", correct_meaning)),
            "options": options,
            "correct_index": correct_index,
            "context": context,
            "variants_detail": options_result.get("variants_detail", []),
            "examples": options_result.get("examples", []),
            "memory_hint": options_result.get("memory_hint", ""),
            "enriched_meaning": options_result.get("enriched_meaning", correct_meaning),
            "context_meaning": options_result.get("context_meaning", correct_meaning),
            "unit_end_index": unit_end_index,
            "current_index": current_index,
            "unit_start_index": unit_start_index,
            "total_items_in_unit": total_items_in_unit,
                        "listening_count_in_unit": listening_count_in_unit,
            "step_in_unit": step_in_unit
        }
        
        # 构建缓存数据
        cache_data = dict(options_result)
        cache_data["word"] = options_result.get("word", word)
        cache_data["ipa"] = options_result.get("ipa", random_word.get("ipa", ""))
        cache_data["meaning"] = options_result.get("enriched_meaning", correct_meaning)
        cache_data["context_meaning"] = options_result.get("context_meaning", correct_meaning)
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
        print(f"[DEBUG] 缓存随机单词信息: {word}")
        
        # 启动后台任务预生成下一个单词
        asyncio.create_task(pre_generate_next_word(file_id, vocab, current_index + 1))
        
        return response_data
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
                    "unit_end_index": current_unit_end
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
                    correct_words = next_item.get("correct_words", correct_sentence.split())
                    correct_lower_set = set(w.lower() for w in correct_words)
                    distractor_words = []
                    max_distractors = 2
                    
                    vocab_data = storage.load_vocab(file_id)
                    all_vocab = vocab_data.get("vocab", vocab_data) if isinstance(vocab_data, dict) else vocab_data
                    available = [v["word"] for v in all_vocab if v["word"].lower() not in correct_lower_set]
                    rnd.shuffle(available)
                    for w in available:
                        distractor_words.append(w)
                        if len(distractor_words) >= max_distractors:
                            break
                    
                    if len(distractor_words) < max_distractors:
                        pipeline_data = storage.load_pipeline_data(file_id)
                        all_sentences = pipeline_data if isinstance(pipeline_data, list) else pipeline_data.get("data", [])
                        for sd in all_sentences:
                            other_s = sd.get("sentence", "")
                            if other_s and other_s != correct_sentence:
                                for w in other_s.split():
                                    w_clean = w.strip()
                                    if w_clean and w_clean.lower() not in correct_lower_set and w_clean not in distractor_words:
                                        distractor_words.append(w_clean)
                                        if len(distractor_words) >= max_distractors:
                                            break
                            if len(distractor_words) >= max_distractors:
                                break
                    
                    if len(distractor_words) < max_distractors:
                        language_settings = storage.load_language_settings(file_id)
                        source_lang = language_settings.get("source_lang", "en")
                        backup_vocab_list = BACKUP_VOCAB_BY_LANG.get(source_lang, BACKUP_VOCAB_BY_LANG["en"])
                        backup_distractors = list(backup_vocab_list)
                        rnd.shuffle(backup_distractors)
                        idx = 0
                        while len(distractor_words) < max_distractors:
                            bd = backup_distractors[idx % len(backup_distractors)]
                            if bd.lower() not in correct_lower_set and bd not in distractor_words:
                                distractor_words.append(bd)
                            idx += 1
                    
                    options = correct_words + distractor_words
                    rnd.shuffle(options)
                    return {
                        "success": True,
                        "new_index": new_index,
                        "unit_end_index": unit_end_index,
                        "listening_quiz": {
                            "original_sentence": correct_sentence,
                            "correct_words": correct_words,
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
        correct_meaning = random_word.get("context_meaning", "")
        
        if not correct_meaning:
            # 尝试从其他字段获取释义
            if "translation" in random_word:
                correct_meaning = random_word["translation"]
            elif "meaning" in random_word:
                correct_meaning = random_word["meaning"]
        
        print(f"[DEBUG] 后台预生成单词信息: {word}")
        
        # 调用generate_multiple_choice获取丰富的单词信息
        options_result = await nvidia_api.generate_multiple_choice(
            word,
            correct_meaning,
            context,
            target_lang
        )
        options_result = fix_llm_options_result(options_result, source_lang)
        
        # 构建缓存数据
        cache_data = dict(options_result)
        cache_data["word"] = options_result.get("word", word)
        cache_data["ipa"] = options_result.get("ipa", random_word.get("ipa", ""))
        cache_data["meaning"] = options_result.get("enriched_meaning", correct_meaning)
        cache_data["context_meaning"] = options_result.get("context_meaning", correct_meaning)
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
        # 先检查缓存
        cached_word = storage.load_word_cache(file_id, word)
        if cached_word:
            print(f"[DEBUG] 从缓存中获取单词信息: {word}")
            if "multiple_choice" in cached_word and "options" not in cached_word:
                options = []
                correct_index = 0
                if "options" in cached_word["multiple_choice"]:
                    for i, opt in enumerate(cached_word["multiple_choice"]["options"]):
                        options.append(opt["text"])
                        if opt["is_correct"]:
                            correct_index = i
                    cached_word["options"] = options
                    cached_word["correct_index"] = correct_index
                    print(f"[DEBUG] 从 multiple_choice 提取 options: {options}")
            
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

        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")

        # 查找单词
        word_data = None
        for entry in vocab:
            print(f"[DEBUG] 检查词汇表条目: {entry['word']}")
            if entry["word"].lower() == word.lower():
                word_data = entry
                print(f"[DEBUG] 找到单词: {word}")
                break

        if not word_data:
            print(f"[DEBUG] 未找到单词: {word}")
            raise HTTPException(status_code=404, detail="Word not found")

        # 构建上下文（包含翻译）
        sentences = storage.load_pipeline_data(file_id)
        context = ""
        context_sentences = []
        context_sentences_with_translations = []
        if sentences:
            import re
            word_pattern = re.compile(r'\b' + re.escape(word_data["word"]) + r'\b', re.IGNORECASE)
            
            for sent_idx, sentence_data in enumerate(sentences):
                if "sentence" in sentence_data:
                    sentence = sentence_data["sentence"]
                    if word_pattern.search(sentence):
                        context_sentences.append(sentence)
                        translation = ""
                        if "translation_result" in sentence_data:
                            translation = sentence_data["translation_result"].get("tokenized_translation", "")
                        context_sentences_with_translations.append({
                            "sentence": sentence,
                            "translation": translation,
                            "sentence_index": sent_idx
                        })
            
            if context_sentences:
                context = context_sentences[0]
            
            if not context and sentences:
                context = sentences[0].get("sentence", "")

        # 加载语言设置
        language_settings = storage.load_language_settings(file_id)
        target_lang = language_settings["target_lang"]
        source_lang = language_settings.get("source_lang", "en")

        correct_meaning = word_data.get("context_meaning", "")

        if not correct_meaning:
            # 尝试从其他字段获取释义
            if "translation" in word_data:
                correct_meaning = word_data["translation"]
            elif "meaning" in word_data:
                correct_meaning = word_data["meaning"]

        # 调用generate_multiple_choice获取丰富的单词信息
        options_result = await nvidia_api.generate_multiple_choice(
            word_data["word"],
            correct_meaning,
            context,
            target_lang
        )
        options_result = fix_llm_options_result(options_result, source_lang)
        
        # 提取选项和正确索引
        options = []
        correct_index = 0
        if "multiple_choice" in options_result and "options" in options_result["multiple_choice"]:
            for i, opt in enumerate(options_result["multiple_choice"]["options"]):
                options.append(opt["text"])
                if opt["is_correct"]:
                    correct_index = i
        else:
            options = options_result.get("options", [correct_meaning, "其他释义A", "其他释义B", "其他释义C"])
            correct_index = options_result.get("correct_index", 0)
        
        # 构建响应数据（同时支持单词详情和学习模式）
        print(f"[DEBUG] options_result keys: {list(options_result.keys())}")
        print(f"[DEBUG] options_result['context_sentences']: {options_result.get('context_sentences')}")
        print(f"[DEBUG] context_sentences_with_translations: {context_sentences_with_translations}")
        # 先构建 response_data 完全 manually, to avoid issues
        response_data = {}
        response_data["word"] = options_result.get("word", word_data["word"])
        response_data["ipa"] = options_result.get("ipa", word_data.get("ipa", ""))
        response_data["meaning"] = options_result.get("enriched_meaning", correct_meaning)
        response_data["correct_meaning"] = options_result.get("correct_answer", options_result.get("enriched_meaning", correct_meaning))
        response_data["enriched_meaning"] = options_result.get("enriched_meaning", correct_meaning)
        response_data["context_meaning"] = options_result.get("context_meaning", correct_meaning)
        response_data["examples"] = options_result.get("examples", [])
        response_data["context_sentences"] = context_sentences_with_translations
        response_data["context"] = context
        response_data["morphology"] = word_data.get("morphology", "")
        response_data["variants_detail"] = options_result.get("variants_detail", [])
        response_data["memory_hint"] = options_result.get("memory_hint", "")
        response_data["options"] = options
        response_data["correct_index"] = correct_index
        response_data["multiple_choice"] = options_result.get("multiple_choice", {})
        # Add any other keys from options_result except context_sentences, context_translations
        for key, value in options_result.items():
            if key not in response_data and key not in ["context_translations"]:
                response_data[key] = value
        print(f"[DEBUG] response_data['context_sentences']: {response_data['context_sentences']}")
        
        # 缓存结果
        storage.save_word_cache(file_id, word, response_data)
        print(f"[DEBUG] 缓存单词信息: {word}")
        
        return response_data
    except Exception as e:
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
            
            correct_meaning = word_data.get("context_meaning", "")
            
            if not correct_meaning:
                # 尝试从其他字段获取释义
                if "translation" in word_data:
                    correct_meaning = word_data["translation"]
                elif "meaning" in word_data:
                    correct_meaning = word_data["meaning"]
            
            # 调用generate_multiple_choice获取丰富的单词信息
            options_result = await nvidia_api.generate_multiple_choice(
                word_data["word"],
                correct_meaning,
                context,
                target_lang
            )
            options_result = fix_llm_options_result(options_result, source_lang)
            
            # 提取选项和正确索引
            options = []
            correct_index = 0
            if "multiple_choice" in options_result and "options" in options_result["multiple_choice"]:
                for i, opt in enumerate(options_result["multiple_choice"]["options"]):
                    options.append(opt["text"])
                    if opt["is_correct"]:
                        correct_index = i
            else:
                options = options_result.get("options", [correct_meaning, "其他释义A", "其他释义B", "其他释义C"])
                correct_index = options_result.get("correct_index", 0)
            
            # 构建学习数据
            learning_word = {
                "word": options_result.get("word", word_data["word"]),
                "ipa": options_result.get("ipa", word_data.get("ipa", "")),
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
        
        if len(correct_tokens) < 2:
            raise HTTPException(status_code=404, detail="Not enough translated tokens for quiz")
        
        cleaned_redundant_tokens = []
        for token in redundant_tokens:
            rt_stripped = token.strip()
            if rt_stripped and rt_stripped not in correct_tokens and not is_source_lang_text(rt_stripped, source_lang):
                cleaned_redundant_tokens.append(rt_stripped)
        print(f"[DEBUG] 清理后的冗余词: {cleaned_redundant_tokens}")
        
        unique_redundant = list(dict.fromkeys(cleaned_redundant_tokens))
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
                phase1_units.append({
                    "word_count": word_count,
                    "exercises_count": len(items),
                    "completed": completed,
                    "start_index": start_index,
                    "end_index": end_index
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
                        "end_index": unit["end_index"]
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
                exercises_per_sent.append(4 if wc >= 3 else 1)
            expected_length = sum(exercises_per_sent)
            
            if exercise_order is None or len(exercise_order) != expected_length:
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
                exercises_per_sent.append(4 if wc >= 3 else 1)
            expected_length = sum(exercises_per_sent)
            
            if exercise_order is None or len(exercise_order) != expected_length:
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
            
            if current_exercise_index < exercise_start:
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
                        translation_tokens.append(token["text"])
            
            exercise_index_in_unit = current_exercise_index - exercise_start
            total_exercises_in_unit = exercise_end - exercise_start
            
            if type_idx < 3:
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
                    mask_version=type_idx
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
                            original_tokens.append(token["text"])
                
                if not original_tokens:
                    original_tokens = text_processor.tokenize_sentence(current_sentence)
                
                import random
                distractors = []
                original_lower_set = set(t.lower() for t in original_tokens)
                max_distractors = 2
                
                for sent_data in eligible_sentences:
                    if sent_data is current_sentence_data:
                        continue
                    if "translation_result" in sent_data and "translation" in sent_data["translation_result"]:
                        for token in sent_data["translation_result"]["translation"]:
                            if isinstance(token, dict) and "text" in token:
                                token_text = token["text"]
                                if token_text.lower() not in original_lower_set and token_text not in distractors and len(distractors) < max_distractors:
                                    distractors.append(token_text)
                
                if len(distractors) < max_distractors:
                    vocab_words = [v["word"] for v in vocab]
                    random.shuffle(vocab_words)
                    for vw in vocab_words:
                        if vw.lower() not in original_lower_set and vw not in distractors and len(distractors) < max_distractors:
                            distractors.append(vw)
                
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
            return {"success": True, "new_exercise_index": new_exercise_index}
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
        options_result = fix_llm_options_result(options_result, source_lang)
        
        result = {
            "word": options_result.get("word", word),
            "ipa": options_result.get("ipa", ""),
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


@app.get("/api/word-list")
async def get_word_list(source_lang: Optional[str] = None, target_lang: Optional[str] = None):
    try:
        records = storage.load_history()
        if source_lang:
            records = [r for r in records if r.get("source_lang") == source_lang]
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
            meaning = entry.get("context_meaning", "") or entry.get("translation", "")
            part_of_speech = entry.get("morphology", "")
            examples = []
            memory_hint = ""
            variants_detail = []

            if cached:
                if cached.get("ipa"):
                    ipa = cached["ipa"]
                meaning = cached.get("enriched_meaning", "") or cached.get("meaning", "") or meaning
                if cached.get("context_meaning") and not meaning:
                    meaning = cached["context_meaning"]
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
                "part_of_speech": part_of_speech,
                "examples": examples,
                "memory_hint": memory_hint,
                "variants_detail": variants_detail,
            })

        result.sort(key=lambda x: x["word"].lower())
        return {"words": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history")
async def get_history():
    try:
        records = storage.load_history()
        records.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return {"records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/settings")
async def get_llm_settings():
    try:
        settings = get_settings()
        masked_key = settings.get("api_key", "")
        if masked_key and len(masked_key) > 8:
            masked_key = masked_key[:4] + "*" * (len(masked_key) - 8) + masked_key[-4:]
        return {
            "api_key": masked_key,
            "base_url": settings.get("base_url", ""),
            "model": settings.get("model", ""),
            "has_key": bool(settings.get("api_key", ""))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SettingsUpdate(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


@app.post("/api/settings")
async def update_llm_settings(req: SettingsUpdate):
    try:
        current = get_settings()
        api_key = req.api_key if req.api_key and not req.api_key.startswith("****") else None
        base_url = req.base_url if req.base_url else None
        model = req.model if req.model else None
        new_settings = update_settings(api_key=api_key, base_url=base_url, model=model)
        masked_key = new_settings.get("api_key", "")
        if masked_key and len(masked_key) > 8:
            masked_key = masked_key[:4] + "*" * (len(masked_key) - 8) + masked_key[-4:]
        return {
            "api_key": masked_key,
            "base_url": new_settings.get("base_url", ""),
            "model": new_settings.get("model", ""),
            "has_key": bool(new_settings.get("api_key", ""))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/app-settings")
async def get_app_settings():
    try:
        settings = storage.load_app_settings()
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AppSettingsUpdate(BaseModel):
    rpm: Optional[int] = None
    target_lang: Optional[str] = None


@app.post("/api/app-settings")
async def update_app_settings(req: AppSettingsUpdate):
    try:
        current = storage.load_app_settings()
        if req.rpm is not None:
            current["rpm"] = req.rpm
        if req.target_lang is not None:
            current["target_lang"] = req.target_lang
        storage.save_app_settings(current)
        return current
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, timeout_keep_alive=600)
