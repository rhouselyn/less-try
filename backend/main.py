from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
import json
import random
import asyncio
from dotenv import load_dotenv
from pathlib import Path
import re

from nvidia_api import NvidiaAPI, get_settings, update_settings
from text_processor import TextProcessor, BACKUP_VOCAB, BACKUP_VOCAB_BY_LANG
from storage import Storage

load_dotenv()

app = FastAPI(title="少邻国 - Lesslingo", version="1.0.0")

import re

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
        valid = [p.strip() for p in llm_phrases if isinstance(p, str) and p.strip()]
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
    parts = [p.strip() for p in parts if p.strip()]
    
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


@app.get("/")
async def root():
    return {"message": "少邻国 - Lesslingo API"}


async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        sentence_translations = []
        unique_partial = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                print(f"[DEBUG] 正在翻译句子: {repr(sentence)}")
                sentence_translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子翻译完成")
                
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
                sentence_translations.append(sentence_data)
            
            partial_vocab = []
            for si, sd in enumerate(sentence_translations):
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
            
            progress = int((i + 1) / total_sentences * 100)
            processing_status[file_id] = {
                "status": "processing",
                "progress": progress,
                "current_sentence": i + 1,
                "total_sentences": total_sentences,
                "vocab": unique_partial,
                "sentence_translations": list(sentence_translations)
            }
            print(f"[DEBUG] 更新状态: 进度 {progress}%, 已处理 {len(sentence_translations)} 个句子, 词汇 {len(unique_partial)} 个")
        
        all_vocab = []
        for i, sentence_data in enumerate(sentence_translations):
            translation_result = sentence_data.get("translation_result", {})
            if isinstance(translation_result, dict) and "dictionary_entries" in translation_result:
                dictionary_entries = translation_result["dictionary_entries"]
                if isinstance(dictionary_entries, str):
                    try:
                        import json
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
            asyncio.create_task(pre_generate_next_word(file_id, all_vocab, 0))
        
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


def generate_and_save_learning_plan(file_id: str, vocab: List[Dict], sentences: List[Dict]):
    import random
    import re
    
    language_settings = storage.load_language_settings(file_id)
    source_lang = language_settings.get("source_lang", "en")
    
    random.seed(42)
    shuffled_indices = list(range(len(vocab)))
    random.shuffle(shuffled_indices)
    storage.save_shuffled_order(file_id, shuffled_indices)
    
    unit_size = 10
    num_units = max(1, (len(vocab) + unit_size - 1) // unit_size)
    
    plan = []
    all_learned_vocab_indices = set()
    used_sentences = set()
    
    for unit_id in range(num_units):
        unit_start = unit_id * unit_size
        unit_end = min(unit_start + unit_size, len(vocab))
        unit_shuffled = shuffled_indices[unit_start:unit_end]
        
        unit_items = []
        
        for step_idx, vocab_idx in enumerate(unit_shuffled):
            unit_items.append({
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
                    item["type"] == "sentence_quiz" and item["sentence"] == sentence
                    for item in unit_items
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
                    
                    raw_translation = tr.get("tokenized_translation", "")
                    correct_translation = raw_translation.strip() if raw_translation else ""
                    
                    correct_tokens = []
                    for token in translation_tokens:
                        if isinstance(token, dict):
                            trans = token.get("translation", "")
                            if trans and trans.strip():
                                correct_tokens.append(trans.strip())
                    
                    if len(correct_tokens) < 2:
                        continue
                    
                    redundant_tokens = tr.get("redundant_tokens", [])
                    cleaned_redundant = []
                    for rt in redundant_tokens:
                        rt_stripped = rt.strip()
                        if rt_stripped and rt_stripped not in correct_tokens and not is_source_lang_text(rt_stripped, source_lang):
                            cleaned_redundant.append(rt_stripped)
                    
                    selected_distractors = list(dict.fromkeys(cleaned_redundant))[:4]
                    
                    if len(selected_distractors) < 4:
                        existing_set = set(correct_tokens) | set(selected_distractors)
                        for other_sent in sentences:
                            if other_sent.get("sentence") == sentence:
                                continue
                            other_tr = other_sent.get("translation_result", {})
                            other_translation_tokens = other_tr.get("translation", [])
                            if other_translation_tokens:
                                for ot in other_translation_tokens:
                                    if isinstance(ot, dict):
                                        ot_trans = ot.get("translation", "").strip()
                                        if ot_trans and ot_trans not in existing_set and not is_source_lang_text(ot_trans, source_lang):
                                            selected_distractors.append(ot_trans)
                                            existing_set.add(ot_trans)
                                            if len(selected_distractors) >= 4:
                                                break
                                if len(selected_distractors) >= 4:
                                    break
                    
                    all_tokens = correct_tokens + selected_distractors
                    
                    if not correct_translation.strip():
                        correct_translation = "".join(correct_tokens)
                    
                    unit_items.append({
                        "type": "sentence_quiz",
                        "sentence": sentence,
                        "correct_translation": correct_translation,
                        "correct_tokens": correct_tokens,
                        "tokens": all_tokens
                    })
        
        plan.append({
            "unit_id": unit_id,
            "items": unit_items
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
        
        title = await generate_title(text, source_lang)
        text_preview = text.strip()[:100]
        storage.add_history_record(file_id, title, source_lang, target_lang, text_preview)
        
        background_tasks.add_task(process_text_background, file_id, text, source_lang, target_lang)
        
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
            _, unit_end_index = get_unit_flat_range(plan, unit_id)
            
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
                        "unit_end_index": unit_end_index
                    }
                
                vocab_idx = current_item["vocab_index"]
                random_word = vocab[vocab_idx]
                word = random_word["word"]
            else:
                return {"type": "unit_complete", "unit_end_index": unit_end_index}
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
            
            return {
                "word": cached_word.get("word", word),
                "ipa": cached_word.get("ipa", ""),
                "correct_meaning": cached_word.get("meaning", ""),
                "options": options,
                "correct_index": correct_index,
                "context": "",
                "variants_detail": cached_word.get("variants_detail", []),
                "examples": cached_word.get("examples", []),
                "memory_hint": cached_word.get("memory_hint", ""),
                "unit_end_index": unit_end_index
            }
        
        # 构建上下文（包含翻译）
        sentences = storage.load_pipeline_data(file_id)
        context = ""
        context_sentences = []
        if sentences:
            # 找到包含该单词的句子
            for sentence_data in sentences:
                if "sentence" in sentence_data:
                    if word in sentence_data["sentence"]:
                        context = sentence_data["sentence"]
                        # 获取翻译
                        translation = ""
                        if "translation_result" in sentence_data:
                            translation = sentence_data["translation_result"].get("tokenized_translation", "")
                        context_sentences.append({
                            "sentence": sentence_data["sentence"],
                            "translation": translation
                        })
                        break
            if not context and sentences:
                # 如果没找到，使用第一个句子作为上下文
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
            "unit_end_index": unit_end_index
        }
        
        # 构建缓存数据
        cache_data = dict(options_result)
        cache_data["word"] = options_result.get("word", word)
        cache_data["ipa"] = options_result.get("ipa", random_word.get("ipa", ""))
        cache_data["meaning"] = options_result.get("enriched_meaning", correct_meaning)
        cache_data["context_meaning"] = options_result.get("context_meaning", correct_meaning)
        cache_data["examples"] = options_result.get("examples", [])
        cache_data["context_sentences"] = context_sentences
        cache_data["morphology"] = random_word.get("morphology", "")
        cache_data["variants_detail"] = options_result.get("variants_detail", [])
        cache_data["memory_hint"] = options_result.get("memory_hint", "")
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
                return {
                    "success": True,
                    "type": "unit_complete",
                    "new_index": current_index,
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
                            "tokens": tokens
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
            # 找到包含该单词的句子
            for sentence_data in sentences:
                if "sentence" in sentence_data:
                    if word in sentence_data["sentence"]:
                        context = sentence_data["sentence"]
                        # 获取翻译
                        translation = ""
                        if "translation_result" in sentence_data:
                            translation = sentence_data["translation_result"].get("tokenized_translation", "")
                        context_sentences.append({
                            "sentence": sentence_data["sentence"],
                            "translation": translation
                        })
                        break
            if not context and sentences:
                # 如果没找到，使用第一个句子作为上下文
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
        cache_data["context_sentences"] = context_sentences
        cache_data["morphology"] = random_word.get("morphology", "")
        cache_data["variants_detail"] = options_result.get("variants_detail", [])
        cache_data["memory_hint"] = options_result.get("memory_hint", "")
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
            # 如果有 multiple_choice 但没有 options，需要从其中提取
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
            # 优先使用sentence_index来找到包含该单词的句子
            if "sentence_index" in word_data:
                sentence_index = word_data["sentence_index"]
                if sentence_index < len(sentences):
                    sentence_data = sentences[sentence_index]
                    if "sentence" in sentence_data:
                        sentence = sentence_data["sentence"]
                        context_sentences.append(sentence)
                        # 获取翻译
                        translation = ""
                        if "translation_result" in sentence_data:
                            translation = sentence_data["translation_result"].get("tokenized_translation", "")
                        context_sentences_with_translations.append({
                            "sentence": sentence,
                            "translation": translation
                        })
            
            # 如果通过sentence_index没找到，或者没找到足够的句子，再使用字符串匹配
            if len(context_sentences) < 2:
                for sentence_data in sentences:
                    if "sentence" in sentence_data:
                        # 更智能的匹配方式，考虑大小写和缩写形式
                        sentence = sentence_data["sentence"]
                        current_word = word_data["word"]
                        # 检查单词是否在句子中（不区分大小写）
                        if current_word.lower() in sentence.lower():
                            # 避免重复添加同一个句子
                            if sentence not in [ctx["sentence"] for ctx in context_sentences_with_translations]:
                                context_sentences.append(sentence)
                                # 获取翻译
                                translation = ""
                                if "translation_result" in sentence_data:
                                    translation = sentence_data["translation_result"].get("tokenized_translation", "")
                                context_sentences_with_translations.append({
                                    "sentence": sentence,
                                    "translation": translation
                                })
                            # 最多添加2个句子
                            if len(context_sentences) >= 2:
                                break
            
            if not context and sentences:
                # 如果没找到，使用第一个句子作为上下文
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
        
        correct_tokens = []
        if "translation" in translation_result:
            for token in translation_result["translation"]:
                if isinstance(token, dict):
                    trans = token.get("translation", "")
                    if trans and trans.strip():
                        correct_tokens.append(trans.strip())
        print(f"[DEBUG] 正确单词tokens: {correct_tokens}")
        
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
                other_translation_tokens = other_tr.get("translation", [])
                if other_translation_tokens:
                    for ot in other_translation_tokens:
                        if isinstance(ot, dict):
                            ot_trans = ot.get("translation", "").strip()
                            if ot_trans and ot_trans not in existing_set and not is_source_lang_text(ot_trans, source_lang):
                                selected_distractors.append(ot_trans)
                                existing_set.add(ot_trans)
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
            expected_length = len(eligible_sentences) * 4
            
            if exercise_order is None or len(exercise_order) != expected_length:
                seed = hash(str([s.get("sentence", "") for s in eligible_sentences]))
                exercise_order = text_processor.generate_interleaved_exercise_order(
                    len(eligible_sentences), masks_per_sentence=3, seed=seed
                )
                storage.save_exercise_order(file_id, phase_number, exercise_order)
            
            unit_size = 10
            total_exercises = len(exercise_order)
            num_units = max(1, (total_exercises + unit_size - 1) // unit_size)
            
            max_exercise_index = storage.load_phase2_max_progress(file_id)
            current_exercise_index = storage.load_phase2_progress(file_id)
            
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
            expected_length = len(eligible_sentences) * 4
            
            if exercise_order is None or len(exercise_order) != expected_length:
                seed = hash(str([s.get("sentence", "") for s in eligible_sentences]))
                exercise_order = text_processor.generate_interleaved_exercise_order(
                    len(eligible_sentences), masks_per_sentence=3, seed=seed
                )
                storage.save_exercise_order(file_id, phase_number, exercise_order)
            
            unit_size = 10
            current_exercise_index = storage.load_phase2_progress(file_id)
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
                mask_seed = hash(current_sentence) + type_idx + 1
                masked_exercise = text_processor.generate_masked_sentence(
                    current_sentence,
                    vocab,
                    translation_tokens,
                    sentences,
                    mask_seed=mask_seed,
                    source_lang=source_lang
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
                
                for sent_data in eligible_sentences:
                    if sent_data is current_sentence_data:
                        continue
                    if "translation_result" in sent_data and "translation" in sent_data["translation_result"]:
                        for token in sent_data["translation_result"]["translation"]:
                            if isinstance(token, dict) and "text" in token:
                                token_text = token["text"]
                                if token_text.lower() not in original_lower_set and token_text not in distractors and len(distractors) < 4:
                                    distractors.append(token_text)
                
                if len(distractors) < 4:
                    vocab_words = [v["word"] for v in vocab]
                    random.shuffle(vocab_words)
                    for vw in vocab_words:
                        if vw.lower() not in original_lower_set and vw not in distractors and len(distractors) < 4:
                            distractors.append(vw)
                
                if len(distractors) < 4:
                    backup_vocab_list = BACKUP_VOCAB_BY_LANG.get(source_lang, BACKUP_VOCAB_BY_LANG["en"])
                    backup_distractors = list(backup_vocab_list)
                    random.shuffle(backup_distractors)
                    idx = 0
                    while len(distractors) < 4:
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
