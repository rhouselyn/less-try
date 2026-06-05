"""学习相关路由：learn/*, word-gen-progress, next-word, random-word, progress, unit-stars, check-coverage, sentence-quiz"""

import re
import random
import asyncio

from fastapi import APIRouter, HTTPException

from text_processor import BACKUP_VOCAB_BY_LANG, is_punctuation_only, is_source_lang_text, strip_edge_punctuation, NO_SPACE_LANGUAGES
from utils.state import nvidia_api, storage, word_gen_state
from utils.helpers import (
    RateLimiter, vocab_sort_key, is_speaker_label,
    fix_llm_options_result, get_fallback_options, get_listening_correct_words,
    get_listening_distractors_from_sentences, filter_eligible_sentences,
    find_item_in_plan, get_unit_flat_range, _is_word_item_learned,
    get_filtered_unit_total, get_filtered_step_in_unit, find_next_non_learned_position,
    MAX_SENTENCE_WORDS_FOR_QUIZ,
)
from utils.exercise_generators import (
    background_word_gen, process_single_word_gen, pre_generate_next_word,
    generate_and_save_learning_plan,
)

router = APIRouter(prefix="/api/learn", tags=["learning"])


@router.post("/{file_id}/start-word-gen")
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


@router.post("/{file_id}/stop-word-gen")
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


@router.post("/{file_id}/priority-word-gen")
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

        state["priority_queue"] = [w for w in state["priority_queue"] if (w.get("word", w) if isinstance(w, dict) else w).lower() != word.lower()]
        state["priority_queue"].insert(0, {"word": word, "force": force})

        if not state["running"]:
            state["running"] = True
            state["task"] = asyncio.create_task(background_word_gen(file_id))

        return {"status": "queued"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{file_id}/word-gen-progress")
async def get_word_gen_progress(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            return {"total": 0, "completed": 0, "running": False}

        total = len(vocab)
        completed = 0
        for w in vocab:
            word = w.get("word", "")
            if word and storage.load_word_cache(file_id, word):
                completed += 1

        state = word_gen_state.get(file_id)
        running = state.get("running", False) if state else False

        if not running and completed < total:
            state = word_gen_state.get(file_id)
            if not state:
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
            state["running"] = True
            state["task"] = asyncio.create_task(background_word_gen(file_id))
            running = True

        return {"total": total, "completed": completed, "running": running}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{file_id}/random-word")
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

        # "只学新词" 开关：根据已学单词集合跳过当前位置上的已学单词
        app_settings = storage.load_user_preferences()
        only_new_words = bool(app_settings.get("only_new_words", False))
        learned_words = storage.load_learned_words(file_id) if only_new_words else set()
        if only_new_words and current_index is not None:
            cur_unit_id, _ = find_item_in_plan(plan, current_index)
            new_unit_id, new_step, _ = find_next_non_learned_position(
                plan, vocab, learned_words, True, current_index
            )
            if new_unit_id is None:
                return {"type": "all_complete"}
            # 如果下一个未学单词不在当前单元，说明当前单元已做完
            if cur_unit_id is not None and new_unit_id != cur_unit_id:
                _, cur_unit_end = get_unit_flat_range(plan, cur_unit_id)
                new_flat_index = sum(len(plan[i].get("items", [])) for i in range(new_unit_id)) + new_step
                storage.save_learning_progress(file_id, new_flat_index)
                return {
                    "type": "unit_complete",
                    "unit_end_index": cur_unit_end,
                    "current_index": current_index,
                    "unit_start_index": cur_unit_end,
                    "total_items_in_unit": 0,
                    "listening_count_in_unit": 0,
                    "step_in_unit": 0
                }
            new_flat_index = sum(len(plan[i].get("items", [])) for i in range(new_unit_id)) + new_step
            if new_flat_index != current_index:
                current_index = new_flat_index
                storage.save_learning_progress(file_id, current_index)

        unit_id, step_in_unit = find_item_in_plan(plan, current_index)

        if unit_id is not None:
            unit_plan = plan[unit_id]
            items = unit_plan.get("items", [])
            unit_start_index, unit_end_index = get_unit_flat_range(plan, unit_id)
            total_items_in_unit = get_filtered_unit_total(items, vocab, learned_words, only_new_words)
            listening_count_in_unit = sum(1 for it in items if it.get("type") == "listening_quiz" and not _is_word_item_learned(it, vocab, learned_words))

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
                        "step_in_unit": get_filtered_step_in_unit(items, vocab, learned_words, only_new_words, step_in_unit)
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
                        "step_in_unit": get_filtered_step_in_unit(items, vocab, learned_words, only_new_words, step_in_unit)
                    }

                vocab_idx = current_item["vocab_index"]
                random_word = vocab[vocab_idx]
                word = random_word["word"]
            else:
                return {"type": "unit_complete", "unit_end_index": unit_end_index, "current_index": current_index, "unit_start_index": unit_start_index, "total_items_in_unit": total_items_in_unit,
                        "listening_count_in_unit": listening_count_in_unit, "step_in_unit": get_filtered_step_in_unit(items, vocab, learned_words, only_new_words, step_in_unit)}
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
                        word_pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE)
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
                    "step_in_unit": get_filtered_step_in_unit(items, vocab, learned_words, only_new_words, step_in_unit)
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


@router.post("/{file_id}/next-word")
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

        # "只学新词" 开关：根据已学集合跳过下一个已学单词
        app_settings = storage.load_user_preferences()
        only_new_words = bool(app_settings.get("only_new_words", False))
        learned_words = storage.load_learned_words(file_id) if only_new_words else set()

        if only_new_words:
            # 先判断当前单元是否还有未学单词
            cur_unit_id, _ = find_item_in_plan(plan, current_index)
            if cur_unit_id is not None:
                cur_items = plan[cur_unit_id].get("items", [])
                has_more_in_unit = False
                cur_start, _ = get_unit_flat_range(plan, cur_unit_id)
                for si, it in enumerate(cur_items):
                    if cur_start + si <= current_index:
                        continue
                    if not _is_word_item_learned(it, vocab, learned_words):
                        has_more_in_unit = True
                        break
                if not has_more_in_unit:
                    # 当前单元的非已学单词都做完了 → 单元完成
                    _, cur_unit_end = get_unit_flat_range(plan, cur_unit_id)
                    # 把进度推进到下一个单元开头
                    nxt_unit_id = cur_unit_id + 1
                    new_idx = cur_unit_end
                    if nxt_unit_id < len(plan):
                        nxt_items = plan[nxt_unit_id].get("items", [])
                        has_any = any(not _is_word_item_learned(it, vocab, learned_words) for it in nxt_items)
                        if has_any:
                            new_idx = sum(len(plan[i].get("items", [])) for i in range(nxt_unit_id))
                    storage.save_learning_progress(file_id, new_idx)
                    return {
                        "success": True,
                        "type": "unit_complete",
                        "new_index": new_idx,
                        "unit_end_index": cur_unit_end,
                        "completed_unit_id": cur_unit_id
                    }

            nxt_unit_id, nxt_step, _ = find_next_non_learned_position(
                plan, vocab, learned_words, True, current_index + 1
            )
            if nxt_unit_id is None:
                # 全部已学，跳到 plan 末尾
                total_flat = sum(len(u.get("items", [])) for u in plan)
                storage.save_learning_progress(file_id, total_flat)
                return {
                    "success": True,
                    "type": "all_complete",
                    "new_index": total_flat,
                    "unit_end_index": total_flat
                }
            new_index = sum(len(plan[i].get("items", [])) for i in range(nxt_unit_id)) + nxt_step
        else:
            current_unit_id, _ = find_item_in_plan(plan, current_index)
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
                            "step_in_unit": get_filtered_step_in_unit(items, vocab, learned_words, only_new_words, step_in_unit),
                            "total_items_in_unit": get_filtered_unit_total(items, vocab, learned_words, only_new_words),
                            "listening_count_in_unit": sum(1 for it in items if it.get("type") == "listening_quiz" and not _is_word_item_learned(it, vocab, learned_words))
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
                            "step_in_unit": get_filtered_step_in_unit(items, vocab, learned_words, only_new_words, step_in_unit),
                            "total_items_in_unit": get_filtered_unit_total(items, vocab, learned_words, only_new_words),
                            "listening_count_in_unit": sum(1 for it in items if it.get("type") == "listening_quiz" and not _is_word_item_learned(it, vocab, learned_words))
                        }
                    }

            return {"success": True, "new_index": new_index, "unit_end_index": unit_end_index}

        return {"success": True, "new_index": new_index}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error moving to next word: {str(e)}")


@router.post("/{file_id}/set-progress")
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


@router.get("/{file_id}/unit-stars")
async def get_unit_stars(file_id: str):
    try:
        stars = storage.load_unit_stars(file_id)
        return {"stars": stars}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading stars: {str(e)}")


@router.post("/{file_id}/unit-stars")
async def save_unit_stars(file_id: str, request: dict):
    try:
        stars_data = request.get("stars", {})
        storage.save_unit_stars(file_id, stars_data)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving stars: {str(e)}")


@router.get("/{file_id}/progress")
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


@router.get("/{file_id}/unit/{unit_id}")
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
                target_lang,
                source_lang,
                0
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


@router.get("/{file_id}/check-coverage")
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
        language_settings = storage.load_language_settings(file_id)
        source_lang = language_settings.get("source_lang", "en")
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


@router.get("/{file_id}/sentence-quiz")
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
